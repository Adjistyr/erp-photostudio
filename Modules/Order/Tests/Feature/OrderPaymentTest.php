<?php

namespace Modules\Order\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Finance\Services\ProfitAndLoss;
use Modules\Order\Enums\PaymentStatus;
use Modules\Order\Models\Order;
use Tests\TestCase;

/**
 * Catat pembayaran — status bayar TIDAK diinput, diturunkan dari total
 * pembayaran (business-flow bagian 4).
 */
class OrderPaymentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');
        $this->actingAs(User::factory()->create());
    }

    private function order(string $number): Order
    {
        return Order::with(['items', 'payments'])->where('number', $number)->sole();
    }

    private function pay(string $number, array $data)
    {
        // Dari Detail Order — controller kembali ke layar asal (back()).
        return $this->from(route('orders.index'))->post(route('orders.payments.store', $this->order($number)), [
            'amount' => 0, 'method' => 'transfer', 'paid_on' => '2026-08-26', ...$data,
        ]);
    }

    public function test_full_payment_makes_order_paid_and_is_labelled_pelunasan()
    {
        // ORD-0012: total 350 rb, DP 150 rb → sisa 200 rb.
        $this->pay('ORD-0012', ['amount' => 200_000])->assertRedirect(route('orders.index'))->assertSessionHasNoErrors();

        $order = $this->order('ORD-0012');
        $this->assertSame(PaymentStatus::Paid, $order->paymentStatus());
        $this->assertSame('Pelunasan', $order->payments->last()?->note);
    }

    public function test_first_partial_payment_is_dp_later_ones_termin()
    {
        // ORD-0005: belum ada pembayaran.
        $this->pay('ORD-0005', ['amount' => 100_000]);
        $this->pay('ORD-0005', ['amount' => 100_000]);

        $this->assertSame(['DP', 'Termin'], $this->order('ORD-0005')->payments->pluck('note')->all());
        $this->assertSame(PaymentStatus::Partial, $this->order('ORD-0005')->paymentStatus());
    }

    public function test_amount_above_balance_is_rejected()
    {
        // Kelebihan bayar hampir pasti salah ketik — tidak ada kembalian di sini.
        $this->pay('ORD-0012', ['amount' => 200_001])->assertSessionHasErrors('amount');

        $this->assertCount(1, $this->order('ORD-0012')->payments);
    }

    public function test_cannot_pay_fully_paid_or_cancelled_order()
    {
        $this->pay('ORD-0001', ['amount' => 1])->assertSessionHasErrors('amount');
        $this->pay('ORD-0004', ['amount' => 1])->assertSessionHasErrors('amount');
    }

    public function test_validation_amount_method_and_future_date()
    {
        $this->pay('ORD-0012', ['amount' => 0, 'method' => 'cek', 'paid_on' => '2026-08-27'])
            ->assertSessionHasErrors(['amount', 'method', 'paid_on']);
    }

    public function test_payment_counts_as_revenue_in_month_received()
    {
        $this->pay('ORD-0011', ['amount' => 1_000_000, 'paid_on' => '2026-08-26']);

        $this->assertSame(6_790_000, app(ProfitAndLoss::class)->revenue('2026-08'));
    }
}
