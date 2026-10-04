<?php

namespace Tests\Feature\Finance;

use App\Enums\PaymentStatus;
use App\Models\Order;

class OrderTest extends DemoDataTestCase
{
    public function test_payment_status_is_derived_never_paid_while_short()
    {
        foreach (Order::with(['items', 'payments'])->get() as $order) {
            match ($order->paymentStatus()) {
                PaymentStatus::Paid => $this->assertLessThanOrEqual(0, $order->balance(), "{$order->number} Lunas tapi kurang"),
                PaymentStatus::Unpaid => $this->assertCount(0, $order->payments),
                PaymentStatus::Partial => $this->assertTrue($order->balance() > 0 && $order->balance() < $order->total()),
            };
        }
    }

    public function test_deposit_badge_carries_the_right_percentage()
    {
        $order = $this->order('ORD-0012');

        $this->assertSame(PaymentStatus::Partial, $order->paymentStatus());
        $this->assertSame(43, (int) round($order->paidRatio() * 100));
    }

    public function test_totals_balance_and_direct_cost()
    {
        $wedding = $this->order('ORD-0011');

        $this->assertSame(8_500_000, $wedding->total());
        $this->assertSame(2_500_000, $wedding->totalPaid());
        $this->assertSame(6_000_000, $wedding->balance());
        $this->assertSame(1_600_000, $wedding->directCost());
        // Retail: HPP bahan dari harga pokok yang disalin saat transaksi.
        $this->assertSame(2 * 8_000 + 6 * 1_500, $this->order('ORD-0010')->materialCost());
    }

    public function test_due_today_counts_as_not_overdue()
    {
        $this->assertSame(0, $this->order('ORD-0012')->daysUntilDue(today()));
        $this->assertSame(-14, $this->order('ORD-0008')->daysUntilDue(today()));
        $this->assertSame(53, $this->order('ORD-0011')->daysUntilDue(today()));
    }

    public function test_walk_in_order_has_no_customer_row()
    {
        // Prototype memakai customer "Umum"; di database walk-in = null.
        $this->assertNull($this->order('ORD-0010')->customer_id);
    }
}
