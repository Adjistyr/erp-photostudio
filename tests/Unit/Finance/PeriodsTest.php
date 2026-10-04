<?php

namespace Tests\Unit\Finance;

use App\Services\Finance\Periods;
use PHPUnit\Framework\TestCase;

class PeriodsTest extends TestCase
{
    public function test_label_in_indonesian()
    {
        $this->assertSame('Juli 2026', Periods::label('2026-07'));
        $this->assertSame('Desember 2026', Periods::label('2026-12'));
    }

    public function test_next_and_previous_cross_year_boundary()
    {
        $this->assertSame('2027-01', Periods::next('2026-12'));
        $this->assertSame('2026-12', Periods::previous('2027-01'));
    }

    public function test_end_of_month_handles_february_and_leap_year()
    {
        $this->assertSame('2026-02-28', Periods::end('2026-02')->toDateString());
        $this->assertSame('2028-02-29', Periods::end('2028-02')->toDateString());
    }

    public function test_range_inclusive_and_empty_when_reversed()
    {
        $this->assertSame(['2026-11', '2026-12', '2027-01'], Periods::range('2026-11', '2027-01'));
        $this->assertSame([], Periods::range('2026-08', '2026-07'));
    }

    public function test_invalid_month_is_rejected()
    {
        $this->expectException(\InvalidArgumentException::class);
        Periods::start('bukan-bulan');
    }
}
