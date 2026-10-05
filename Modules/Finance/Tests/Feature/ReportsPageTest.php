<?php

namespace Modules\Finance\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Layar Laporan — hanya menampilkan angka service Finance; rumusnya diuji di
 * test service masing-masing. Di sini: angka sampai ke layar tanpa diubah.
 */
class ReportsPageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');
        $this->actingAs(User::factory()->create());
    }

    public function test_guest_is_redirected_to_login()
    {
        auth()->logout();

        foreach (['reports.profit-loss', 'reports.margin', 'reports.sales', 'reports.receivables'] as $route) {
            $this->get(route($route))->assertRedirect(route('login'));
        }
    }

    public function test_profit_and_loss_august()
    {
        $this->get(route('reports.profit-loss'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('finance::reports/profit-loss')
                ->where('month', '2026-08')
                ->where('statement.total_revenue', 5_790_000)
                ->has('statement.revenue_by_line', 3)
                ->where('statement.revenue_by_line.2.line', 'event')
                ->where('statement.revenue_by_line.2.amount', 4_000_000)
                ->where('statement.gross_profit', 2_695_500)
                ->where('statement.maintenance_allocation', 790_450)
                ->where('statement.net_profit', -2_894_950)
                ->has('statement.operating', 3)
                // Rugi → tidak ada yang dibagi.
                ->where('profit_share.net_profit', -2_894_950)
                ->where('profit_share.distributable', 0)
                ->has('profit_share.shares', 2)
                // Contoh basis kas: DP wedding Agustus untuk acara Oktober.
                ->where('cash_basis_example.number', 'ORD-0011')
                ->where('cash_basis_example.paid_in_month', 2_500_000)
                ->where('cash_basis_example.service_date', '2026-10-18')
            );
    }

    public function test_margin_by_line()
    {
        $this->get(route('reports.margin', ['month' => '2026-08']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('finance::reports/margin')
                ->has('lines', 3)
                ->where('lines.0.line', 'retail')
                ->where('lines.0.revenue', 290_000)
                ->where('lines.0.margin', 195_500)
                ->where('lines.2.revenue', 4_000_000)
                ->where('lines.2.direct_cost', 2_800_000)
                ->where('totals.revenue', 5_790_000)
                ->where('totals.gross_profit', 2_695_500)
            );
    }

    public function test_sales_products_services_customers()
    {
        $this->get(route('reports.sales'))
            ->assertInertia(function (Assert $page) {
                $page->component('finance::reports/sales');
                $props = $page->toArray()['props'];
                $products = collect($props['products'])->keyBy('name');
                $this->assertSame(15, $products['Cetak 4R']['quantity']);
                // Tak laku tetap tampil — modal yang menganggur.
                $this->assertSame(0, $products['Album Mini 20 Halaman']['quantity']);
                $this->assertSame(290_000, $products->sum('revenue'));
                $this->assertSame(8_500_000, collect($props['services'])->firstWhere('name', 'Paket Wedding Full Day')['value']);
                // Hanya customer yang pernah order (lead tanpa order tidak dirangking).
                $this->assertTrue(collect($props['customers'])->every(fn ($c) => $c['order_count'] > 0));
                $this->assertSame('Rani & Dimas', $props['customers'][0]['name']);
                // Walk-in tanpa nama: ORD-0003, 0006, 0010.
                $this->assertSame(['count' => 3, 'value' => 245_000], $props['walk_in']);
            });
    }

    public function test_receivables_risk()
    {
        $this->get(route('reports.receivables'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('finance::reports/receivables')
                ->where('total', 8_050_000)
                ->where('revenue', 5_790_000)
                ->has('aging', 4)
                ->where('aging.0.label', 'Belum jatuh tempo')
                ->has('by_line', 3)
                ->where('by_line.2.line', 'event')
                ->has('orders', 4)
                ->where('orders.0.number', 'ORD-0011')
            );
    }
}
