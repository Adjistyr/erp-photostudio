<?php

namespace Modules\Order\Tests\Unit;

use Illuminate\Database\Eloquent\Collection;
use Modules\Order\Models\Order;
use Modules\Order\Models\Payment;
use Modules\Order\Models\Refund;
use PHPUnit\Framework\TestCase;

class OrderRefundMathTest extends TestCase
{
    /** @param list<int> $refunds */
    private function order(int $paid, array $refunds): Order
    {
        $order = new Order;
        $order->setRelation('payments', new Collection([new Payment(['amount' => $paid])]));
        $order->setRelation('refunds', new Collection(array_map(fn (int $a) => new Refund(['amount' => $a]), $refunds)));

        return $order;
    }

    public function test_net_paid_and_total_refunded()
    {
        foreach ([[[], 0, 100_000], [[30_000], 30_000, 70_000], [[60_000, 40_000], 100_000, 0]] as [$refunds, $refunded, $net]) {
            $order = $this->order(100_000, $refunds);
            $this->assertSame([$refunded, $net], [$order->totalRefunded(), $order->netPaid()]);
        }
    }
}
