<?php

namespace Modules\Finance\Tests\Feature;

use Modules\Finance\Services\ProfitAndLoss;
use Modules\Shared\Enums\BusinessLine;

/** Porting web/app/lib/dummy.test.ts + bagi-hasil.test.ts (laba rugi). */
class ProfitAndLossTest extends DemoDataTestCase
{
    private const AUG = '2026-08';

    private function pnl(): ProfitAndLoss
    {
        return app(ProfitAndLoss::class);
    }

    public function test_august_revenue_matches_on_every_screen()
    {
        $this->assertSame(5_790_000, $this->pnl()->revenue(self::AUG));
        $this->assertSame(290_000, $this->pnl()->revenue(self::AUG, BusinessLine::Retail));
        $this->assertSame(1_500_000, $this->pnl()->revenue(self::AUG, BusinessLine::Studio));
        $this->assertSame(4_000_000, $this->pnl()->revenue(self::AUG, BusinessLine::Event));
    }

    public function test_revenue_per_line_adds_up_to_total()
    {
        $perLine = array_sum(array_map(
            fn (BusinessLine $line) => $this->pnl()->revenue(self::AUG, $line),
            BusinessLine::cases(),
        ));

        $this->assertSame($this->pnl()->revenue(self::AUG), $perLine);
    }

    public function test_august_statement_loss_of_2_894_950()
    {
        $s = $this->pnl()->forMonth(self::AUG);

        $this->assertSame(5_790_000, $s->totalRevenue);
        $this->assertSame(94_500, $s->materialCost);
        $this->assertSame(3_000_000, $s->jobCost);
        $this->assertSame(3_094_500, $s->totalDirectCost);
        $this->assertSame(2_695_500, $s->grossProfit);
        $this->assertSame(47, (int) round($s->grossMargin * 100));
        $this->assertSame(4_800_000, $s->totalOperating);
        // Dana maintenance dihitung dari daftar aset (business-flow 8.9).
        $this->assertSame(790_450, $s->maintenanceAllocation);
        $this->assertSame(-2_894_950, $s->netProfit);
    }

    public function test_net_profit_is_consistent_with_components()
    {
        $s = $this->pnl()->forMonth(self::AUG);

        $this->assertSame(
            $s->totalRevenue - $s->totalDirectCost - $s->totalOperating - $s->maintenanceAllocation,
            $s->netProfit,
        );
        $this->assertSame([3_500_000, 800_000, 500_000], $s->operatingExpenses->pluck('amount')->all());
    }

    public function test_month_before_any_asset_has_no_maintenance_allocation()
    {
        $this->assertSame(0, $this->pnl()->forMonth('2026-06')->maintenanceAllocation);
    }

    public function test_margin_by_line_event_biggest_revenue_thinnest_margin()
    {
        [$retail, $studio, $event] = $this->pnl()->marginByLine(self::AUG);

        $this->assertSame([290_000, 94_500, 195_500, 67, 5], [$retail->revenue, $retail->directCost, $retail->margin, (int) round($retail->marginRatio * 100), (int) round($retail->share * 100)]);
        $this->assertSame([1_500_000, 200_000, 1_300_000, 87], [$studio->revenue, $studio->directCost, $studio->margin, (int) round($studio->marginRatio * 100)]);
        $this->assertSame([4_000_000, 2_800_000, 1_200_000, 30, 69], [$event->revenue, $event->directCost, $event->margin, (int) round($event->marginRatio * 100), (int) round($event->share * 100)]);

        // Alasan layar Margin per Lini ada: omzet terbesar justru margin
        // tertipis. Kalau dataset diedit sampai kontras ini hilang, layarnya
        // kehilangan maksud.
        $this->assertGreaterThan($retail->share, $event->share);
        $this->assertLessThan($retail->marginRatio, $event->marginRatio);
    }

    public function test_margins_add_up_to_gross_profit()
    {
        $total = array_sum(array_map(fn ($m) => $m->margin, $this->pnl()->marginByLine(self::AUG)));

        $this->assertSame($this->pnl()->forMonth(self::AUG)->grossProfit, $total);
    }

    public function test_cash_basis_deposit_recognised_in_month_received()
    {
        // ORD-0011 acaranya 18 Okt, DP diterima 14 Agu → omzet Agustus. Kalau
        // client memilih akrual, test ini yang jebol pertama.
        $this->assertSame('2026-10-18', $this->order('ORD-0011')->service_date->toDateString());
        $this->assertSame(0, $this->pnl()->revenue('2026-10'));
    }

    public function test_break_even_gross_profit_covers_48_percent_of_fixed_costs()
    {
        $b = $this->pnl()->breakEven(self::AUG);

        $this->assertSame(4_800_000 + 790_450, $b->fixedCosts);
        $this->assertSame(2_695_500, $b->grossProfit);
        $this->assertSame(2_894_950, $b->shortfall);
        $this->assertSame(48, (int) round($b->ratio * 100));
    }
}
