<?php

namespace Tests\Feature\Finance;

use App\Enums\BusinessLine;
use App\Models\Order;
use App\Services\Finance\Receivables;

/** Porting web/app/lib/dummy.test.ts (piutang). */
class ReceivablesTest extends DemoDataTestCase
{
    private function receivables(): Receivables
    {
        return app(Receivables::class);
    }

    public function test_receivables_8_050_000_from_4_orders()
    {
        $this->assertSame(8_050_000, $this->receivables()->total());
        $this->assertCount(4, $this->receivables()->open());
    }

    public function test_cancelled_order_is_not_receivable_even_if_deposit_short()
    {
        $cancelled = $this->order('ORD-0004');

        $this->assertGreaterThan(0, $cancelled->balance());
        $this->assertNotContains('ORD-0004', $this->receivables()->open()->pluck('number'));
    }

    public function test_open_receivables_sorted_by_balance_desc()
    {
        $this->assertSame(
            ['ORD-0011', 'ORD-0008', 'ORD-0005', 'ORD-0012'],
            $this->receivables()->open()->pluck('number')->all(),
        );
    }

    public function test_due_today_is_not_yet_overdue()
    {
        $overdue = $this->receivables()->overdue();

        $this->assertSame(['ORD-0008'], $overdue->pluck('number')->all());
        $this->assertSame(1_500_000, $overdue->sum(fn (Order $o) => $o->balance()));
    }

    public function test_aging_buckets_add_up_to_total()
    {
        $aging = collect($this->receivables()->aging())->keyBy('label');

        $this->assertSame(6_550_000, $aging['Belum jatuh tempo']->amount);
        $this->assertCount(3, $aging['Belum jatuh tempo']->orders);
        $this->assertSame(1_500_000, $aging['1–30 hari']->amount);
        $this->assertCount(1, $aging['1–30 hari']->orders);
        $this->assertSame(0, $aging['31–60 hari']->amount);
        $this->assertSame(0, $aging['> 60 hari']->amount);

        $this->assertSame($this->receivables()->total(), $aging->sum('amount'));
        // Setiap order masuk tepat satu kelompok — tidak dobel, tidak hilang.
        $this->assertSame(4, $aging->sum(fn ($b) => $b->orders->count()));
    }

    public function test_receivables_93_percent_concentrated_in_event()
    {
        $byLine = collect($this->receivables()->byLine())->keyBy(fn ($r) => $r->line->value);

        $this->assertSame(7_500_000, $byLine[BusinessLine::Event->value]->amount);
        $this->assertSame(550_000, $byLine[BusinessLine::Studio->value]->amount);
        $this->assertSame(0, $byLine[BusinessLine::Retail->value]->amount);
        $this->assertSame(93, (int) round($byLine[BusinessLine::Event->value]->share * 100));
        $this->assertSame(7, (int) round($byLine[BusinessLine::Studio->value]->share * 100));
        $this->assertSame($this->receivables()->total(), $byLine->sum('amount'));
    }
}
