<?php

namespace Modules\Order\Tests\Unit;

use Modules\Order\Enums\WorkStatus;
use PHPUnit\Framework\TestCase;

class WorkStatusTest extends TestCase
{
    public function test_previous_is_inverse_of_next()
    {
        foreach (WorkStatus::cases() as $status) {
            $next = $status->next();
            if ($next !== null) {
                $this->assertSame($status, $next->previous(), $status->value);
            }
        }

        $this->assertNull(WorkStatus::Booking->previous());
        $this->assertNull(WorkStatus::Cancelled->previous());
    }
}
