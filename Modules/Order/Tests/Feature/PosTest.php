<?php

namespace Modules\Order\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
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

    public function test_phone_is_normalised_and_saved_on_new_customer()
    {
        $this->sell(['customer_name' => 'Rina Baru', 'customer_phone' => '+62 812-3456-7890'])->assertSessionHasNoErrors();

        $customer = Customer::where('name', 'Rina Baru')->sole();
        $this->assertSame('6281234567890', $customer->phone);
        $this->assertSame($customer->id, $this->newest()->customer_id);
    }

    public function test_phone_matches_existing_customer_even_when_name_differs()
    {
        $budi = Customer::create(['name' => 'Budi', 'phone' => '628111']);
        $count = Customer::count();

        $this->sell(['customer_name' => 'Budi S.', 'customer_phone' => '08111'])->assertSessionHasNoErrors();

        $this->assertSame($budi->id, $this->newest()->customer_id);
        $this->assertSame($count, Customer::count());
        $this->assertSame('Budi', $budi->refresh()->name);
    }

    public function test_name_match_fills_missing_phone_but_never_overwrites()
    {
        $sari = Customer::create(['name' => 'Sari']);
        $this->sell(['customer_name' => 'sari', 'customer_phone' => '08222'])->assertSessionHasNoErrors();
        $this->assertSame('628222', $sari->refresh()->phone);

        $this->sell(['customer_name' => 'Sari', 'customer_phone' => '08333'])->assertSessionHasNoErrors();
        $this->assertSame('628222', $sari->refresh()->phone);
        $this->assertSame($sari->id, $this->newest()->customer_id);
        $this->assertSame(1, Customer::where('name', 'Sari')->count());
    }

    public function test_phone_without_name_is_ignored_and_sale_is_walk_in()
    {
        $count = Customer::count();

        $this->sell(['customer_name' => '', 'customer_phone' => '08123'])->assertSessionHasNoErrors();

        $this->assertNull($this->newest()->customer_id);
        $this->assertSame($count, Customer::count());
    }

    public function test_legacy_phone_stored_as_08_still_matches()
    {
        $lama = Customer::create(['name' => 'Pak Lama', 'phone' => '08129999']);

        $this->sell(['customer_name' => 'Lama', 'customer_phone' => '6281 29999'])->assertSessionHasNoErrors();

        $this->assertSame($lama->id, $this->newest()->customer_id);
        $this->assertSame('08129999', $lama->refresh()->phone); // data lama tidak diubah bentuk
    }

    public function test_phone_longer_than_30_chars_is_rejected()
    {
        $this->sell(['customer_name' => 'X', 'customer_phone' => str_repeat('1', 31)])->assertSessionHasErrors('customer_phone');
    }

    public function test_sale_flashes_receipt_with_signed_links()
    {
        $this->sell()->assertSessionHasNoErrors()
            ->assertSessionHas('inertia.flash_data.receipt.balance', 0)
            ->assertSessionHas('inertia.flash_data.receipt.payment_status', 'paid')
            ->assertSessionHas('inertia.flash_data.receipt.business_line', 'retail');

        $receipt = session('inertia.flash_data.receipt');
        $order = $this->newest();
        $this->assertSame([$order->number, $order->total()], [$receipt['number'], $receipt['total']]);

        // Dua URL berbeda, keduanya bertanda tangan sah.
        $this->assertNotSame($receipt['invoice_url'], $receipt['print_url']);
        auth()->logout();
        $this->get($receipt['invoice_url'])->assertOk();
        $this->get($receipt['print_url'])->assertOk();
    }

    public function test_receipt_carries_customer_phone_when_named()
    {
        $this->sell(['customer_name' => 'Rina', 'customer_phone' => '0812 777'])
            ->assertSessionHas('inertia.flash_data.receipt.customer_phone', '62812777');

        // Walk-in: key ada dengan nilai null (assertSessionHas menganggap null = tidak ada).
        $this->sell();
        $this->assertArrayHasKey('customer_phone', session('inertia.flash_data.receipt'));
        $this->assertNull(session('inertia.flash_data.receipt.customer_phone'));
    }

    public function test_page_carries_studio_name_for_whatsapp_message()
    {
        config(['studio.name' => 'Studio Uji']);

        $this->get(route('pos.index'))->assertInertia(fn (Assert $page) => $page->where('studio.name', 'Studio Uji'));
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

    public function test_pos_rejects_rows_without_catalog_item()
    {
        // Retail = katalog saja: tanpa HPP katalog, margin retail bohong.
        $this->post(route('pos.store'), [
            'items' => [['name' => 'Gantungan custom', 'unit_price' => 10_000, 'quantity' => 1]],
            'method' => 'cash',
        ])->assertSessionHasErrors('items.0.catalog_item_id');
    }

    public function test_page_lists_todays_retail_sales_newest_first_with_total()
    {
        $this->sell();
        $first = $this->newest();
        $this->sell(['method' => 'qris']);
        $second = $this->newest();

        $props = $this->get(route('pos.index'))->inertiaPage()['props'];

        // ORD-0010 = retail demo hari ini; ORD-0012 (studio hari ini) & ORD-0006 (retail lain hari) tidak ikut.
        $this->assertSame([$second->number, $first->number, 'ORD-0010'], array_column($props['today_sales'], 'number'));
        $this->assertSame('qris', $props['today_sales'][0]['method']);
        $this->assertSame($first->total() + $second->total() + 80_000, $props['today_total']);
        $this->assertNotNull($props['today_sales'][0]['print_url']);
    }

    public function test_cancelled_sale_is_listed_but_excluded_from_total_and_has_no_links()
    {
        $this->sell();
        $cancelled = $this->newest();
        $cancelled->update(['work_status' => WorkStatus::Cancelled]);

        $props = $this->get(route('pos.index'))->inertiaPage()['props'];
        $row = collect($props['today_sales'])->firstWhere('id', $cancelled->id);

        $this->assertTrue($row['cancelled']);
        $this->assertNull($row['invoice_url']);
        $this->assertNull($row['print_url']);
        $this->assertSame(80_000, $props['today_total']);
    }

    public function test_today_sales_capped_at_fifty()
    {
        foreach (range(1, 51) as $n) {
            Order::create([
                'number' => sprintf('ORD-9%03d', $n), 'business_line' => BusinessLine::Retail,
                'service_date' => '2026-08-26', 'work_status' => WorkStatus::Delivered,
            ]);
        }

        $this->get(route('pos.index'))->assertInertia(fn (Assert $page) => $page->has('today_sales', 50));
    }

    public function test_time_is_in_app_timezone()
    {
        $this->travelTo(Carbon::parse('2026-08-26 02:30', 'Asia/Jakarta'));
        $this->sell();

        $this->get(route('pos.index'))->assertInertia(fn (Assert $page) => $page->where('today_sales.0.time', '02:30'));
    }
}
