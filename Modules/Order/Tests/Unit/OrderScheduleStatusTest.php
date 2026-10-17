<?php

namespace Modules\Order\Tests\Unit;

use Illuminate\Database\Eloquent\Collection;
use Modules\Order\Models\Order;
use Modules\Order\Models\Payment;
use Modules\Order\Models\PaymentSchedule;
use PHPUnit\Framework\TestCase;

/** FIFO status termin (spek 6.4 aturan 3) tepat di batas kumulatif. */
class OrderScheduleStatusTest extends TestCase
{
    /** Termin 300 rb / 500 rb / 200 rb, dibayar `$paid`. */
    private function order(int $paid): Order
    {
        $order = new Order;
        $order->setRelation('payments', new Collection($paid > 0 ? [new Payment(['amount' => $paid])] : []));
        $order->setRelation('schedules', new Collection(array_map(
            fn (int $amount) => new PaymentSchedule(['amount' => $amount]),
            [300_000, 500_000, 200_000],
        )));

        return $order;
    }

    /** @return list<array{string, int}> status + sisa per termin */
    private function statuses(int $paid): array
    {
        return array_map(fn (array $r) => [$r['status']->value, $r['outstanding']], $this->order($paid)->scheduleStatuses());
    }

    public function test_paid_exactly_cumulative_closes_term_and_leaves_next_unpaid()
    {
        $this->assertSame([['paid', 0], ['unpaid', 500_000], ['unpaid', 200_000]], $this->statuses(300_000));
        $this->assertSame([['paid', 0], ['paid', 0], ['unpaid', 200_000]], $this->statuses(800_000));
        $this->assertSame([['paid', 0], ['paid', 0], ['paid', 0]], $this->statuses(1_000_000));
    }

    public function test_one_rupiah_around_the_boundary()
    {
        $this->assertSame([['partial', 1], ['unpaid', 500_000], ['unpaid', 200_000]], $this->statuses(299_999));
        $this->assertSame([['paid', 0], ['partial', 499_999], ['unpaid', 200_000]], $this->statuses(300_001));
        $this->assertSame([['unpaid', 300_000], ['unpaid', 500_000], ['unpaid', 200_000]], $this->statuses(0));
    }
}
