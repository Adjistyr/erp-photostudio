<?php

namespace Tests\Unit\Finance;

use App\Services\Finance\Money;
use PHPUnit\Framework\TestCase;

/** Sama dengan formatRp() di frontend — DESIGN.md R5. */
class MoneyTest extends TestCase
{
    public function test_thousands_separator_dot_no_decimals()
    {
        $this->assertSame('Rp 1.250.000', Money::format(1_250_000));
        $this->assertSame('Rp 8.000', Money::format(8_000));
    }

    public function test_negative_uses_unicode_minus_not_hyphen()
    {
        $this->assertSame("\u{2212}Rp 2.894.950", Money::format(-2_894_950));
        $this->assertStringNotContainsString('-', Money::format(-250_000));
    }

    public function test_zero_stays_rp_0()
    {
        $this->assertSame('Rp 0', Money::format(0));
    }
}
