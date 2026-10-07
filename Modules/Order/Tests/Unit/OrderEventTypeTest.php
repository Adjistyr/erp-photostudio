<?php

namespace Modules\Order\Tests\Unit;

use Modules\Order\Enums\OrderEventType;
use PHPUnit\Framework\TestCase;
use ValueError;

class OrderEventTypeTest extends TestCase
{
    public function test_every_type_has_a_label()
    {
        foreach (OrderEventType::cases() as $type) {
            $this->assertNotSame('', $type->label(), $type->value);
        }
    }

    public function test_unknown_type_is_rejected()
    {
        $this->expectException(ValueError::class);
        OrderEventType::from('unknown');
    }
}
