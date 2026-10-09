<?php

namespace Modules\Finance\Tests\Feature;

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Finance\Services\CashReceipts;
use Modules\Finance\Services\ProfitAndLoss;
use Modules\Order\Models\Payment;
use Modules\Order\Models\Refund;

/** Kas Harian — penerimaan per hari × metode (docs/specs/3.3). */
class CashReceiptsTest extends DemoDataTestCase
{
    private const AUG = '2026-08';

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create());
    }

    /** @return array<string, mixed> */
    private function props(array $query = []): array
    {
        return $this->get(route('reports.cash', $query))->assertOk()->inertiaPage()['props'];
    }

    public function test_groups_payments_per_day_and_method()
    {
        // 31 Agu: dua tunai + satu QRIS (di luar data demo).
        $order = $this->order('ORD-0011');
        foreach ([[100_000, 'cash'], [50_000, 'cash'], [25_000, 'qris']] as [$amount, $method]) {
            Payment::create(['order_id' => $order->id, 'paid_on' => '2026-08-31', 'amount' => $amount, 'method' => $method, 'note' => 'Termin']);
        }

        $day = collect($this->props(['month' => self::AUG])['days'])->firstWhere('date', '2026-08-31');

        $this->assertSame(['cash' => 150_000, 'transfer' => 0, 'qris' => 25_000], $day['by_method']);
        $this->assertSame([175_000, 3], [$day['total'], $day['count']]);
    }

    public function test_totals_equal_profit_and_loss_revenue()
    {
        $props = $this->props(['month' => self::AUG]);

        $this->assertSame(app(ProfitAndLoss::class)->revenue(self::AUG), $props['total']);
        $this->assertSame($props['total'], array_sum($props['totals']));
        $this->assertSame($props['total'], array_sum(array_column($props['days'], 'total')));
        $this->assertSame(Payment::whereBetween('paid_on', ['2026-08-01', '2026-08-31'])->count(), $props['count']);
    }

    public function test_excludes_other_months_and_hides_empty_days()
    {
        $days = $this->props(['month' => self::AUG])['days'];

        foreach ($days as $d) {
            $this->assertStringStartsWith('2026-08-', $d['date']);
            $this->assertGreaterThan(0, $d['total']);
        }
        // Urut tanggal naik.
        $dates = array_column($days, 'date');
        $sorted = $dates;
        sort($sorted);
        $this->assertSame($sorted, $dates);
    }

    public function test_cancelled_order_payments_are_included()
    {
        // ORD-0004 batal, DP 500 rb dibayar 8 Agu — uangnya tetap masuk.
        $day = collect(app(CashReceipts::class)->forMonth(self::AUG)->days)->firstWhere('date', '2026-08-08');

        $this->assertNotNull($day);
        $this->assertSame(500_000, $day->byMethod['transfer']);
    }

    public function test_empty_month_renders_without_error()
    {
        $props = $this->props(['month' => '2030-01']);

        $this->assertSame([], $props['days']);
        $this->assertSame(0, $props['total']);
        $this->assertSame(['cash' => 0, 'transfer' => 0, 'qris' => 0], $props['shares']);
        $this->assertSame(['cash', 'transfer', 'qris'], $props['methods']);
    }

    public function test_invalid_month_falls_back_to_current()
    {
        $this->get(route('reports.cash', ['month' => 'abc']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('finance::reports/cash')
                ->where('month', '2026-08')
                ->where('today', '2026-08-26'));
    }

    public function test_guest_is_redirected_to_login()
    {
        auth()->logout();

        $this->get(route('reports.cash'))->assertRedirect(route('login'));
    }

    public function test_refunds_reduce_their_method_on_refund_day_and_total_still_matches_revenue()
    {
        // 26 Agu: tunai 80 rb + transfer 150 rb (data demo); refund tunai 30 rb hari itu.
        Refund::create(['order_id' => $this->order('ORD-0010')->id, 'refunded_on' => '2026-08-26',
            'amount' => 30_000, 'method' => 'cash', 'reason' => 'Retur']);

        $props = $this->props(['month' => self::AUG]);
        $day = collect($props['days'])->firstWhere('date', '2026-08-26');

        $this->assertSame(80_000 - 30_000, $day['by_method']['cash']);
        $this->assertSame(['cash' => 30_000, 'transfer' => 0, 'qris' => 0], $day['refunds']);
        $this->assertSame(30_000, $props['refund_totals']['cash']);
        $this->assertSame(app(ProfitAndLoss::class)->revenue(self::AUG), $props['total']);
    }
}
