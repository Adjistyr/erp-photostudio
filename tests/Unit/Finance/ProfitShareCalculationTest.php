<?php

namespace Tests\Unit\Finance;

use App\Services\Finance\OpenLoan;
use App\Services\Finance\ProfitShareCalculation;
use App\Services\Finance\ProfitSharing;
use PHPUnit\Framework\TestCase;

/**
 * Rumus bagi hasil murni (business-flow 8.5) — porting bagian "Rumus" di
 * web/app/lib/bagi-hasil.test.ts. Tanpa database.
 */
class ProfitShareCalculationTest extends TestCase
{
    private const AGUNG = 1;

    private const RAKA = 2;

    private const SHARES = [
        ['owner_id' => self::AGUNG, 'percent' => 70],
        ['owner_id' => self::RAKA, 'percent' => 30],
    ];

    /** @param  list<OpenLoan>  $loans */
    private function calc(int $net, int $loss = 0, array $loans = []): ProfitShareCalculation
    {
        return ProfitSharing::calculate($net, $loss, $loans, 10, self::SHARES);
    }

    private function shareOf(ProfitShareCalculation $c, int $ownerId): int
    {
        foreach ($c->shares as $s) {
            if ($s->ownerId === $ownerId) {
                return $s->amount;
            }
        }
        $this->fail("Owner {$ownerId} tidak ada");
    }

    public function test_profit_without_loss_or_loans_matches_client_sheet_corrected()
    {
        $c = $this->calc(1_412_701);

        $this->assertSame(0, $c->deduction);
        $this->assertSame(1_412_701, $c->distributable);
        $this->assertSame(141_270, $c->reserve);
        $this->assertSame(890_002, $this->shareOf($c, self::AGUNG));
        $this->assertSame(381_429, $this->shareOf($c, self::RAKA));
    }

    public function test_loss_month_no_distribution_loss_accumulates()
    {
        $c = $this->calc(-2_000_000, 500_000);

        $this->assertSame(0, $c->distributable);
        $this->assertSame(0, $c->reserve);
        $this->assertSame(0, $this->shareOf($c, self::AGUNG));
        $this->assertSame(2_500_000, $c->accumulatedLoss);
    }

    public function test_loss_covered_by_loan_is_not_deducted_twice()
    {
        // Rugi 2 jt, Agung setor 2 jt, laba bulan depan 3 jt. Dipotong
        // terpisah = 4 jt tertahan, owner kehilangan 1 jt bagi hasil.
        $c = $this->calc(3_000_000, 2_000_000, [new OpenLoan(10, self::AGUNG, 2_000_000)]);

        $this->assertSame(2_000_000, $c->deduction);
        $this->assertCount(1, $c->repayments);
        $this->assertSame([10, self::AGUNG, 2_000_000], [$c->repayments[0]->contributionId, $c->repayments[0]->ownerId, $c->repayments[0]->amount]);
        $this->assertSame(1_000_000, $c->distributable);
        $this->assertSame(100_000, $c->reserve);
        $this->assertSame(630_000, $this->shareOf($c, self::AGUNG));
        $this->assertSame(270_000, $this->shareOf($c, self::RAKA));
        $this->assertSame(0, $c->accumulatedLoss);
        $this->assertSame(0, $c->loans[0]->remaining);
    }

    public function test_loss_without_loan_deduction_stays_in_cash()
    {
        $c = $this->calc(3_000_000, 2_000_000);

        $this->assertSame(2_000_000, $c->deduction);
        $this->assertSame([], $c->repayments);
        $this->assertSame(1_000_000, $c->distributable);
    }

    public function test_loan_without_loss_is_repaid_before_distribution()
    {
        $c = $this->calc(3_000_000, 0, [new OpenLoan(11, self::RAKA, 1_000_000)]);

        $this->assertSame(1_000_000, $c->deduction);
        $this->assertSame(1_000_000, $c->repayments[0]->amount);
        $this->assertSame(2_000_000, $c->distributable);
    }

    public function test_profit_below_deduction_repays_loans_in_contribution_order()
    {
        $c = $this->calc(1_500_000, 2_000_000, [
            new OpenLoan(10, self::AGUNG, 1_500_000),
            new OpenLoan(11, self::RAKA, 1_000_000),
        ]);

        $this->assertSame(1_500_000, $c->deduction);
        $this->assertSame(0, $c->distributable);
        $this->assertCount(1, $c->repayments);
        $this->assertSame(10, $c->repayments[0]->contributionId);
        $this->assertSame(500_000, $c->accumulatedLoss);
        // Pinjaman Raka belum tersentuh — bulan depan potongannya max(0,5 jt, 1 jt).
        $this->assertSame([0, 1_000_000], array_map(fn (OpenLoan $l) => $l->remaining, $c->loans));
    }

    public function test_rounding_all_parts_add_up_exactly_to_profit()
    {
        // Owner terakhir menerima sisa pembulatan; kalau tiap bagian
        // dibulatkan sendiri, total bisa selisih Rp 1 dari laba bersih.
        $shares = [['owner_id' => 1, 'percent' => 33], ['owner_id' => 2, 'percent' => 33], ['owner_id' => 3, 'percent' => 34]];
        foreach ([1, 7, 333_333, 1_271_431, 9_999_999] as $profit) {
            $c = ProfitSharing::calculate($profit, 0, [], 10, $shares);
            $sum = $c->reserve + array_sum(array_map(fn ($s) => $s->amount, $c->shares));
            $this->assertSame($profit, $sum, "laba {$profit}");
        }
    }

    public function test_calculation_does_not_mutate_input_loans()
    {
        $loans = [new OpenLoan(10, self::AGUNG, 1_000_000)];
        $this->calc(3_000_000, 0, $loans);

        $this->assertSame(1_000_000, $loans[0]->remaining);
    }
}
