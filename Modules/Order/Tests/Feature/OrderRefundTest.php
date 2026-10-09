<?php

namespace Modules\Order\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Finance\Models\PeriodClosing;
use Modules\Order\Enums\PaymentStatus;
use Modules\Order\Models\Order;
use Modules\Order\Models\Refund;
use Tests\TestCase;

/** Pengembalian uang ke customer (docs/specs/4.2, K3). */
class OrderRefundTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');
        $this->user = User::factory()->create();
        $this->actingAs($this->user);
    }

    private function order(string $number): Order
    {
        return Order::with(['items', 'payments', 'refunds', 'jobCosts'])->where('number', $number)->sole();
    }

    private function refund(string $number, array $data = [])
    {
        return $this->from(route('orders.index'))->post(route('orders.refunds.store', $this->order($number)), [
            'refunded_on' => '2026-08-26', 'amount' => 0, 'method' => 'cash', 'reason' => 'Cetak salah', ...$data,
        ]);
    }

    public function test_records_refund_and_event()
    {
        // ORD-0003: retail lunas Rp 80.000.
        $this->refund('ORD-0003', ['amount' => 30_000])->assertRedirect(route('orders.index'))->assertSessionHasNoErrors();

        $order = $this->order('ORD-0003');
        $this->assertSame([30_000, 50_000], [$order->totalRefunded(), $order->netPaid()]);
        $this->assertSame($this->user->id, $order->refunds->sole()->created_by);
        $event = $order->events()->first();
        $this->assertSame('refunded', $event?->type->value);
        $this->assertSame('Cetak salah', $event?->changes['reason']['to']);
    }

    public function test_rejects_refund_above_net_paid()
    {
        $this->refund('ORD-0003', ['amount' => 60_000])->assertSessionHasNoErrors();

        $this->refund('ORD-0003', ['amount' => 30_000])
            ->assertSessionHasErrors(['amount' => 'Pengembalian melebihi uang yang diterima (sisa Rp 20.000).']);
    }

    public function test_rejects_refund_in_closed_month()
    {
        // Juli 2026 sudah tutup buku di data demo.
        $this->refund('ORD-0003', ['amount' => 10_000, 'refunded_on' => '2026-07-15'])->assertSessionHasErrors('refunded_on');
        $this->assertSame(0, Refund::count());
    }

    public function test_rejects_future_date_and_missing_reason()
    {
        $this->refund('ORD-0003', ['amount' => 10_000, 'refunded_on' => '2026-08-27'])->assertSessionHasErrors('refunded_on');
        $this->refund('ORD-0003', ['amount' => 10_000, 'reason' => ''])->assertSessionHasErrors('reason');
    }

    public function test_delete_refund_requires_open_month()
    {
        $this->refund('ORD-0003', ['amount' => 10_000]);
        $order = $this->order('ORD-0003');
        $refund = $order->refunds->sole();

        PeriodClosing::create(['month' => '2026-08', 'closed_at' => '2026-09-01 09:00:00']);
        $this->from(route('orders.index'))->delete(route('orders.refunds.destroy', [$order, $refund]))->assertSessionHasErrors('delete');
        $this->assertDatabaseHas('refunds', ['id' => $refund->id]);

        PeriodClosing::query()->delete();
        $this->from(route('orders.index'))->delete(route('orders.refunds.destroy', [$order, $refund]))->assertSessionHasNoErrors();
        $this->assertDatabaseMissing('refunds', ['id' => $refund->id]);
        $this->assertEquals(['from' => 10_000, 'to' => null], $order->events()->first()?->changes['amount']);
    }

    public function test_scoped_binding_rejects_refund_of_other_order()
    {
        $this->refund('ORD-0003', ['amount' => 10_000]);
        $refund = Refund::sole();

        $this->delete(route('orders.refunds.destroy', [$this->order('ORD-0002'), $refund]))->assertNotFound();
    }

    public function test_balance_and_status_unchanged_after_full_refund()
    {
        $this->refund('ORD-0003', ['amount' => 80_000])->assertSessionHasNoErrors();

        $order = $this->order('ORD-0003');
        $this->assertSame([0, PaymentStatus::Paid], [$order->balance(), $order->paymentStatus()]);
        // Tidak muncul lagi sebagai piutang.
        $numbers = array_column($this->get(route('receivables.index'))->inertiaPage()['props']['orders'], 'number');
        $this->assertNotContains('ORD-0003', $numbers);
    }

    public function test_margin_subtracts_refund()
    {
        // ORD-0003: Photostrip ×4, total 80 rb, HPP 24 rb.
        $before = $this->order('ORD-0003')->margin();
        $this->refund('ORD-0003', ['amount' => 30_000]);
        $this->assertSame($before - 30_000, $this->order('ORD-0003')->margin());

        // ORD-0004 batal, DP 500 rb direfund penuh → margin = −biaya langsung.
        $this->refund('ORD-0004', ['amount' => 500_000, 'method' => 'transfer']);
        $cancelled = $this->order('ORD-0004');
        $this->assertSame(-$cancelled->directCost(), $cancelled->margin());
    }

    public function test_order_props_carry_refunds_and_refundable()
    {
        $this->refund('ORD-0003', ['amount' => 30_000]);

        $row = collect($this->get(route('orders.index'))->inertiaPage()['props']['orders']['data'])->firstWhere('number', 'ORD-0003');

        $this->assertSame([30_000, 50_000], [$row['total_refunded'], $row['refundable']]);
        $this->assertSame('Cetak salah', $row['refunds'][0]['reason']);
    }
}
