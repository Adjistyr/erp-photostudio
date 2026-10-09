<?php

namespace Modules\Shared\Tests\Feature;

use Illuminate\Support\Facades\Route;
use Modules\Shared\Http\CsvResponse;
use Tests\TestCase;

class CsvResponseTest extends TestCase
{
    public function test_streams_bom_header_and_quoted_rows()
    {
        Route::get('/_csv-test', fn () => CsvResponse::stream('x.csv', [[1, 'a,b'], [2, 'Café "Agung"']], ['id', 'nama']));

        $response = $this->get('/_csv-test');
        $content = $response->streamedContent();

        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);
        $this->assertSame("id,nama\n1,\"a,b\"\n2,\"Café \"\"Agung\"\"\"\n", substr($content, 3));
        $this->assertStringContainsString('x.csv', (string) $response->headers->get('Content-Disposition'));
        $this->assertStringContainsString('text/csv', (string) $response->headers->get('Content-Type'));
    }
}
