<?php

namespace Modules\Customer\Tests\Unit;

use Modules\Customer\Support\Phone;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class PhoneTest extends TestCase
{
    /** @return array<string, array{string, string}> */
    public static function nomor(): array
    {
        return [
            'strip & nol awal' => ['0812-3456', '628123456'],
            'plus 62 dengan spasi' => ['+62 812', '62812'],
            'sudah 62' => ['62812', '62812'],
            'kurung kode area' => ['(0274) 123', '62274123'],
            'nol di tengah tidak tersentuh' => ['08120812', '628120812'],
            'kosong' => ['', ''],
            'tanpa digit' => ['abc', ''],
        ];
    }

    #[DataProvider('nomor')]
    public function test_normalises_to_62(string $raw, string $expected)
    {
        $this->assertSame($expected, Phone::normalise($raw));
    }
}
