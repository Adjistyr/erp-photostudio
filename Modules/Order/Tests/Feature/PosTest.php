<?php

namespace Modules\Order\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Catalog\Models\CatalogItem;
use Modules\Customer\Models\Customer;
use Modules\Finance\Services\ProfitAndLoss;
use Modules\Order\Enums\PaymentStatus;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Modules\Shared\Enums\BusinessLine;
use Tests\TestCase;

/** POS — transaksi walk-in retail, target < 30 detik per transaksi. */
class PosTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');
        $this->actingAs(User::factory()->create());
    }

    private function item(string $name): CatalogItem
    {
        return CatalogItem::where('name', $name)->sole();
    }

    /** @param  array<string, mixed>  $data */
    private function sell(array $data = [])
    {
        return $this->post(route('pos.store'), [
            'items' => [
                ['catalog_item_id' => $this->item('Cetak 4R')->id, 'quantity' => 4],
                ['catalog_item_id' => $this->item('Keychain Foto Akrilik')->id, 'quantity' => 1],
            ],
            'method' => 'cash',
            ...$data,
        ]);
    }

    private function newest(): Order
    {
        return Order::with(['items', 'payments', 'customer'])->orderByDesc('id')->firstOrFail();
    }

    public function test_guest_is_redirected_to_login()
    {
        auth()->logout();

        $this->get(route('pos.index'))->assertRedirect(route('login'));
    }

    public function test_page_offers_only_active_products()
    {
        $this->item('Album Mini 20 Halaman')->update(['is_active' => false]);

        // Jasa punya jadwal → lewat Form Order, bukan POS.
        $this->get(route('pos.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('order::pos')
                ->has('products', 4)
                ->where('products.0.name', 'Cetak 10R + Bingkai')
                ->where('products.0.unit_cost', 32_000)
            );
    }

    public function test_walk_in_sale_is_delivered_paid_and_counted_as_revenue_today()
    {
        $before = app(ProfitAndLoss::class)->revenue('2026-08');

        $this->sell(['discount' => 5_000])
            ->assertRedirect(route('pos.index'))
            ->assertSessionHasNoErrors();

        $order = $this->newest();
        $this->assertSame('ORD-0013', $order->number);
        $this->assertSame(BusinessLine::Retail, $order->business_line);
        // Barang dibawa pulang saat itu juga.
        $this->assertSame(WorkStatus::Delivered, $order->work_status);
        $this->assertSame('2026-08-26', $order->service_date->toDateString());
        // Walk-in tanpa nama = tanpa customer, bukan baris "Umum".
        $this->assertNull($order->customer_id);
        // 4 × 5.000 + 25.000 − 5.000
        $this->assertSame(40_000, $order->total());
        $this->assertSame(PaymentStatus::Paid, $order->paymentStatus());
        $this->assertSame(['Pelunasan', 'cash'], [$order->payments->sole()->note, $order->payments->sole()->method->value]);
        // HPP bahan disalin dari katalog.
        $this->assertSame(4 * 1_500 + 8_000, $order->materialCost());
        $this->assertSame($before + 40_000, app(ProfitAndLoss::class)->revenue('2026-08'));
    }

    public function test_customer_name_reuses_existing_customer_case_insensitively()
    {
        $this->sell(['customer_name' => '  sinta prameswari ']);

        $this->assertSame('Sinta Prameswari', $this->newest()->customer?->name);
        $this->assertSame(1, Customer::where('name', 'Sinta Prameswari')->count());
    }

    public function test_new_customer_name_creates_customer()
    {
        $count = Customer::count();
        $this->sell(['customer_name' => 'Pak Joko']);

        $this->assertSame($count + 1, Customer::count());
        $this->assertSame('Pak Joko', $this->newest()->customer?->name);
    }

    public function test_services_and_inactive_products_are_rejected()
    {
        $this->item('Album Mini 20 Halaman')->update(['is_active' => false]);

        $this->sell(['items' => [
            ['catalog_item_id' => $this->item('Paket Studio 1 Jam')->id, 'quantity' => 1],
            ['catalog_item_id' => $this->item('Album Mini 20 Halaman')->id, 'quantity' => 1],
        ]])->assertSessionHasErrors(['items.0.catalog_item_id', 'items.1.catalog_item_id']);

        $this->assertSame(12, Order::count());
    }

    public function test_discount_cannot_wipe_out_total()
    {
        // Subtotal 45.000 — diskon setara subtotal = transaksi nol, hampir pasti salah ketik.
        $this->sell(['discount' => 45_000])->assertSessionHasErrors('discount');
    }

    public function test_requires_items_and_valid_method()
    {
        $this->sell(['items' => [], 'method' => 'utang'])->assertSessionHasErrors(['items', 'method']);
    }
}
