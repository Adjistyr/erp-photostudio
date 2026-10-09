<?php

namespace Modules\Order\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Order\Models\Order;
use Tests\TestCase;

/** Ekspor CSV order dengan filter yang sama dengan daftar (docs/specs/4.5). */
class OrdersExportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');
        $this->actingAs(User::factory()->create());
    }

    /** @return list<array<string, string>> baris CSV sebagai map kolom → nilai */
    private function csv(array $query = []): array
    {
        $content = substr($this->get(route('orders.export', $query))->assertOk()->streamedContent(), 3);
        $lines = array_values(array_filter(explode("\n", $content)));
        $header = str_getcsv(array_shift($lines), escape: '');

        return array_map(fn (string $l) => array_combine($header, str_getcsv($l, escape: '')), $lines);
    }

    public function test_export_respects_filters()
    {
        $rows = $this->csv(['line' => 'retail']);

        $this->assertSame(Order::where('business_line', 'retail')->count(), count($rows));
        $this->assertSame(['retail'], array_values(array_unique(array_column($rows, 'lini'))));
        // Uang integer rupiah, tanpa pemisah ribuan.
        $ord10 = collect($rows)->firstWhere('nomor', 'ORD-0010');
        $this->assertSame(['80000', 'Lunas', 'paid'], [$ord10['total'], $ord10['status_bayar_label'], $ord10['status_bayar']]);
    }

    public function test_export_without_filter_includes_all_within_limit()
    {
        $rows = $this->csv();

        $this->assertSame(Order::count(), count($rows));
        $this->assertSame('ORD-0012', $rows[0]['nomor']);
        $this->assertStringContainsString('potrait-time-order-2026-08-26.csv', (string) $this->get(route('orders.export'))->headers->get('Content-Disposition'));
    }

    public function test_export_rejects_over_limit()
    {
        config(['studio.export_limit' => 3]);

        $this->from(route('orders.index'))->get(route('orders.export'))
            ->assertRedirect(route('orders.index'))
            ->assertSessionHas('inertia.flash_data.toast.type', 'error');
    }

    public function test_export_requires_auth()
    {
        auth()->logout();

        $this->get(route('orders.export'))->assertRedirect(route('login'));
    }
}
