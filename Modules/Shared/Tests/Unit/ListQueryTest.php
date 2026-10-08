<?php

namespace Modules\Shared\Tests\Unit;

use Illuminate\Http\Request;
use Modules\Shared\Http\ListQuery;
use PHPUnit\Framework\TestCase;

class ListQueryTest extends TestCase
{
    private function query(array $params): ListQuery
    {
        return ListQuery::fromRequest(Request::create('/x', 'GET', $params), [
            'line' => ['retail', 'studio'],
            'from' => 'date',
        ]);
    }

    public function test_drops_unknown_keys_and_invalid_values()
    {
        $q = $this->query(['line' => 'studio', 'from' => '2026-02-30', 'evil' => '1']);

        $this->assertSame(['q' => '', 'line' => 'studio'], $q->toArray());
        $this->assertNull($this->query(['line' => 'foo'])->get('line'));
    }

    public function test_q_is_trimmed_and_capped_at_100_characters()
    {
        $this->assertSame('budi', $this->query(['q' => '  budi  '])->q);
        $this->assertSame(100, mb_strlen($this->query(['q' => str_repeat('a', 150)])->q));
    }

    public function test_phone_digits_only_for_phone_shaped_queries()
    {
        $this->assertSame('6281233', $this->query(['q' => '+62 812-33'])->phoneDigits());
        $this->assertSame('08123344', $this->query(['q' => '(0812) 3344'])->phoneDigits());
        // Bukan bentuk nomor telepon: huruf, atau kurang dari 4 digit.
        $this->assertSame('', $this->query(['q' => 'ORD-0012'])->phoneDigits());
        $this->assertSame('', $this->query(['q' => 'Budi 2'])->phoneDigits());
        $this->assertSame('', $this->query(['q' => '081'])->phoneDigits());
    }
}
