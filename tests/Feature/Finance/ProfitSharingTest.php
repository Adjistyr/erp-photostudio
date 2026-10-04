<?php

namespace Tests\Feature\Finance;

use App\Enums\ContributionKind;
use App\Models\Owner;
use App\Models\OwnerContribution;
use App\Models\ProfitShareRule;
use App\Services\Finance\ProfitAndLoss;
use App\Services\Finance\ProfitSharing;

/** Porting web/app/lib/bagi-hasil.test.ts (dataset, aturan, balik modal). */
class ProfitSharingTest extends DemoDataTestCase
{
    private function sharing(): ProfitSharing
    {
        return app(ProfitSharing::class);
    }

    private function owner(string $name): Owner
    {
        return Owner::where('name', $name)->firstOrFail();
    }

    /** @return array<int, int> owner_id => percent */
    private function shares(int $agung, int $raka): array
    {
        return [$this->owner('Agung')->id => $agung, $this->owner('Raka')->id => $raka];
    }

    public function test_july_from_opening_balance_is_final()
    {
        $july = $this->sharing()->forMonth('2026-07');

        $this->assertNotNull($july);
        $this->assertTrue($july->fromOpeningBalance);
        $this->assertTrue($july->final);
        $this->assertSame(1_412_701, $july->netProfit);
        $this->assertSame(141_270, $july->calculation->reserve);
        $this->assertSame(890_002, $july->shareOf($this->owner('Agung')->id));
        $this->assertSame(381_429, $july->shareOf($this->owner('Raka')->id));
    }

    public function test_august_loss_carried_forward_agung_loan_still_open()
    {
        $aug = $this->sharing()->forMonth('2026-08');

        $this->assertNotNull($aug);
        $this->assertFalse($aug->final);
        $this->assertSame(app(ProfitAndLoss::class)->forMonth('2026-08')->netProfit, $aug->netProfit);
        $this->assertSame(-2_894_950, $aug->netProfit);
        $this->assertSame(0, $aug->calculation->distributable);
        $this->assertSame(2_894_950, $aug->calculation->accumulatedLoss);
        $this->assertSame(2_000_000, $aug->outstandingLoans);
    }

    public function test_history_starts_at_first_rule_ordered_by_month()
    {
        $this->assertSame(['2026-07', '2026-08'], array_map(fn ($m) => $m->month, $this->sharing()->history('2026-08')));
    }

    public function test_new_rule_valid_from_current_month_or_later()
    {
        $this->assertNull($this->sharing()->validateRule('2026-09', 10, $this->shares(60, 40)));
        $this->assertNull($this->sharing()->validateRule('2026-08', 10, $this->shares(60, 40)));
    }

    public function test_rule_cannot_apply_backwards_to_closed_month()
    {
        $this->assertStringContainsString('sudah tutup', $this->sharing()->validateRule('2026-07', 10, $this->shares(60, 40)) ?? '');
    }

    public function test_rule_shares_must_total_100_percent()
    {
        $this->assertStringContainsString('100%', $this->sharing()->validateRule('2026-09', 10, $this->shares(70, 20)) ?? '');
    }

    public function test_rule_rejects_out_of_range_percentages_and_bad_month()
    {
        $this->assertNotNull($this->sharing()->validateRule('2026-09', 101, $this->shares(60, 40)));
        $this->assertNotNull($this->sharing()->validateRule('2026-09', 10, $this->shares(110, -10)));
        $this->assertNotNull($this->sharing()->validateRule('2026-9', 10, $this->shares(60, 40)));
    }

    public function test_adding_new_rule_does_not_change_old_months()
    {
        $rule = ProfitShareRule::create(['effective_month' => '2026-09', 'reserve_percent' => 10]);
        $rule->owners()->attach([$this->owner('Agung')->id => ['percent' => 60], $this->owner('Raka')->id => ['percent' => 40]]);

        // Juli tetap 70/30 walaupun sekarang ada aturan 60/40 mulai September.
        $july = $this->sharing()->forMonth('2026-07');
        $this->assertNotNull($july);
        $this->assertSame(70, $july->calculation->shares[0]->percent);
        $this->assertSame(890_002, $july->shareOf($this->owner('Agung')->id));
    }

    public function test_capital_recovery_only_owners_who_put_in_equity()
    {
        $p = $this->sharing()->capitalRecovery();

        $this->assertCount(1, $p);
        $this->assertSame('Agung', $p[0]->owner->name);
        $this->assertSame(15_809_000, $p[0]->equity);
        // Hak bagi hasil dari bulan yang sudah tutup saja (Juli).
        $this->assertSame(890_002, $p[0]->entitled);
    }

    public function test_capital_recovery_empty_when_opening_equity_not_recorded()
    {
        // business-flow 8.7: layar menyembunyikan widget, bukan tampil 0%.
        OwnerContribution::where('kind', ContributionKind::Equity)->each(function (OwnerContribution $c) {
            $c->delete();
        });

        $this->assertSame([], $this->sharing()->capitalRecovery());
    }
}
