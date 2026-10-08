<?php

namespace Modules\Order\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Catalog\Models\CatalogItem;
use Modules\Customer\Models\Customer;
use Modules\Order\Enums\PaymentStatus;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Tests\TestCase;

/** Form Buat Order — hanya studio & event; retail lewat POS. */
class OrderCreateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');
        $this->actingAs(User::factory()->create());
    }

    private function catalog(string $name): CatalogItem
    {
        return CatalogItem::where('name', $name)->sole();
    }

    /** @param  array<string, mixed>  $data */
    private function store(array $data)
    {
        return $this->post(route('orders.store'), [
            'business_line' => 'studio',
            'customer_id' => Customer::where('name', 'Dewi Anggraini')->sole()->id,
            'service_date' => '2026-09-05',
            'items' => [['catalog_item_id' => $this->catalog('Paket Studio 1 Jam')->id, 'quantity' => 1]],
            ...$data,
        ]);
    }

    private function newest(): Order
    {
        return Order::with(['items', 'payments'])->orderByDesc('id')->firstOrFail();
    }

    public function test_guest_is_redirected_to_login()
    {
        auth()->logout();

        $this->get(route('orders.create'))->assertRedirect(route('login'));
    }

    public function test_create_page_offers_only_active_services()
    {
        CatalogItem::where('name', 'Paket Studio Keluarga 2 Jam')->update(['is_active' => false]);

        $this->get(route('orders.create'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('order::create')
                ->has('customers', Customer::count())
                // 5 jasa di demo, satu dinonaktifkan; produk (cetak, bingkai) tidak ikut.
                ->has('catalog', 4)
                ->where('catalog.0.name', 'Add-on Editing Lanjutan')
            );
    }

    public function test_create_page_excludes_services_with_unknown_category()
    {
        // Data lama yang lolos sebelum kategori jasa dikunci (spek 1.1, K2).
        CatalogItem::create(['name' => 'Paket Wedding Lama', 'type' => CatalogItemType::Service, 'price' => 1, 'unit_cost' => null, 'category' => 'Wedding']);

        $this->get(route('orders.create'))
            ->assertInertia(fn (Assert $page) => $page->has('catalog', 5)->missing('catalog.5'));
        $this->assertNotContains('Paket Wedding Lama', array_column($this->get(route('orders.create'))->inertiaPage()['props']['catalog'], 'name'));
    }

    public function test_store_with_deposit_is_scheduled_and_snapshots_catalog_price()
    {
        $this->store([
            'business_line' => 'event',
            'service_time' => '08:00',
            'location' => 'Gedung Serbaguna',
            'items' => [
                ['catalog_item_id' => $this->catalog('Paket Wedding Full Day')->id, 'quantity' => 1],
                ['catalog_item_id' => $this->catalog('Add-on Editing Lanjutan')->id, 'quantity' => 2],
                // Harga dari klien diabaikan — server mengambil dari katalog.
            ],
            'dp' => 3_000_000,
            'dp_method' => 'cash',
        ])->assertRedirect(route('orders.index'))->assertSessionHasNoErrors();

        $order = $this->newest();
        $this->assertSame('ORD-0013', $order->number);
        $this->assertSame(WorkStatus::Scheduled, $order->work_status);
        $this->assertSame('08:00:00', $order->service_time);
        $this->assertSame(8_800_000, $order->total());
        $this->assertSame([8_500_000, 150_000], $order->items->pluck('unit_price')->all());
        $this->assertSame('DP', $order->payments->sole()->note);
        $this->assertSame('cash', $order->payments->sole()->method->value);
        $this->assertSame('2026-08-26', $order->payments->sole()->paid_on->toDateString());
        $this->assertSame(PaymentStatus::Partial, $order->paymentStatus());
    }

    public function test_later_catalog_price_change_does_not_touch_saved_order()
    {
        $this->store([]);
        $this->catalog('Paket Studio 1 Jam')->update(['price' => 400_000]);

        $this->assertSame(350_000, $this->newest()->total());
    }

    public function test_store_without_deposit_is_booking_and_studio_location_defaults()
    {
        $this->store(['location' => '  '])->assertSessionHasNoErrors();

        $order = $this->newest();
        $this->assertSame(WorkStatus::Booking, $order->work_status);
        $this->assertSame('Studio', $order->location);
        $this->assertNull($order->service_time);
        $this->assertCount(0, $order->payments);
    }

    public function test_full_deposit_is_labelled_pelunasan()
    {
        $this->store(['dp' => 350_000])->assertSessionHasNoErrors();

        $this->assertSame('Pelunasan', $this->newest()->payments->sole()->note);
        $this->assertSame(PaymentStatus::Paid, $this->newest()->paymentStatus());
    }

    public function test_deposit_above_total_is_rejected_and_nothing_saved()
    {
        $this->store(['dp' => 350_001])->assertSessionHasErrors('dp');

        $this->assertSame(12, Order::count());
    }

    public function test_retail_line_is_rejected()
    {
        $this->store(['business_line' => 'retail'])->assertSessionHasErrors('business_line');
    }

    public function test_requires_customer_date_and_at_least_one_item()
    {
        $this->store(['customer_id' => null, 'service_date' => '', 'items' => []])
            ->assertSessionHasErrors(['customer_id', 'service_date', 'items']);
    }

    public function test_inactive_service_and_products_are_rejected()
    {
        $inactive = $this->catalog('Paket Studio Keluarga 2 Jam');
        $inactive->update(['is_active' => false]);
        $product = CatalogItem::where('type', 'product')->firstOrFail();

        $this->store(['items' => [
            ['catalog_item_id' => $inactive->id, 'quantity' => 1],
            ['catalog_item_id' => $product->id, 'quantity' => 1],
        ]])->assertSessionHasErrors(['items.0.catalog_item_id', 'items.1.catalog_item_id']);
    }

    public function test_quantity_must_be_positive()
    {
        $this->store(['items' => [['catalog_item_id' => $this->catalog('Paket Studio 1 Jam')->id, 'quantity' => 0]]])
            ->assertSessionHasErrors('items.0.quantity');
    }

    public function test_store_with_custom_item_saves_name_and_price_without_catalog()
    {
        $this->store([
            'business_line' => 'event',
            'items' => [
                ['catalog_item_id' => $this->catalog('Paket Prewedding Outdoor')->id, 'quantity' => 1],
                ['catalog_item_id' => null, 'name' => 'Drone 2 jam (nego)', 'unit_price' => 1_250_000, 'quantity' => 1],
            ],
            'dp' => 3_000_000,
        ])->assertSessionHasNoErrors();

        $order = $this->newest();
        $custom = $order->items->firstWhere('catalog_item_id', null);
        $this->assertSame(['Drone 2 jam (nego)', 1_250_000, null], [$custom?->name, $custom?->unit_price, $custom?->unit_cost]);
        $this->assertSame(2_500_000 + 1_250_000, $order->total());
        // DP dibandingkan dengan total termasuk item custom.
        $this->assertSame(PaymentStatus::Partial, $order->paymentStatus());
    }

    public function test_custom_item_requires_name_and_price()
    {
        $this->store(['items' => [['catalog_item_id' => null, 'unit_price' => 100_000, 'quantity' => 1]]])
            ->assertSessionHasErrors('items.0.name');
        $this->store(['items' => [['catalog_item_id' => null, 'name' => 'Bonus', 'quantity' => 1]]])
            ->assertSessionHasErrors('items.0.unit_price');

        // Harga 0 boleh: bonus yang tetap tercetak di invoice.
        $this->store(['items' => [
            ['catalog_item_id' => $this->catalog('Paket Studio 1 Jam')->id, 'quantity' => 1],
            ['catalog_item_id' => null, 'name' => 'Bonus cetak 4R', 'unit_price' => 0, 'quantity' => 2],
        ]])->assertSessionHasNoErrors();
    }

    public function test_catalog_row_ignores_client_name_and_price()
    {
        $this->store(['items' => [[
            'catalog_item_id' => $this->catalog('Paket Studio 1 Jam')->id, 'name' => 'Murah', 'unit_price' => 1, 'quantity' => 1,
        ]]])->assertSessionHasNoErrors();

        $line = $this->newest()->items->sole();
        $this->assertSame(['Paket Studio 1 Jam', 350_000], [$line->name, $line->unit_price]);
    }

    /** @param  array<string, mixed>  $data */
    private function storeWithNewCustomer(array $data)
    {
        return $this->store(['customer_id' => null, ...$data]);
    }

    public function test_creates_order_with_new_customer()
    {
        $count = Customer::count();

        $this->storeWithNewCustomer(['new_customer' => ['name' => '  Budi Baru ', 'phone' => '0812 9999 1111']])
            ->assertSessionHasNoErrors()
            ->assertSessionHas('inertia.flash_data.toast.message', fn (string $m) => str_contains($m, 'Budi Baru (customer baru)'));

        $this->assertSame($count + 1, Customer::count());
        $customer = Customer::where('name', 'Budi Baru')->sole();
        $this->assertSame('6281299991111', $customer->phone);
        $this->assertSame($customer->id, $this->newest()->customer_id);
    }

    public function test_new_customer_with_existing_phone_reuses_customer()
    {
        // Sinta: 0812-3344-5566 di data demo.
        $sinta = Customer::where('name', 'Sinta Prameswari')->sole();
        $count = Customer::count();

        $this->storeWithNewCustomer(['new_customer' => ['name' => 'Sinta P', 'phone' => '+62 812 3344 5566']])
            ->assertSessionHasNoErrors()
            ->assertSessionHas('inertia.flash_data.toast.message', fn (string $m) => ! str_contains($m, 'customer baru'));

        $this->assertSame($count, Customer::count());
        $this->assertSame($sinta->id, $this->newest()->customer_id);
        $this->assertSame('Sinta Prameswari', $sinta->refresh()->name);
    }

    public function test_new_customer_without_phone_matches_name_case_insensitively()
    {
        $count = Customer::count();

        $this->storeWithNewCustomer(['new_customer' => ['name' => 'dewi anggraini']])->assertSessionHasNoErrors();

        $this->assertSame($count, Customer::count());
        $this->assertSame(Customer::where('name', 'Dewi Anggraini')->sole()->id, $this->newest()->customer_id);
    }

    public function test_requires_customer_id_or_new_customer_name()
    {
        $this->storeWithNewCustomer(['new_customer' => ['name' => '', 'phone' => '0812']])
            ->assertSessionHasErrors(['customer_id' => 'Pilih customer atau isi nama customer baru.']);
    }

    public function test_customer_id_wins_when_both_sent()
    {
        $count = Customer::count();
        $dewi = Customer::where('name', 'Dewi Anggraini')->sole();

        $this->store(['customer_id' => $dewi->id, 'new_customer' => ['name' => 'Liar', 'phone' => '0899']])->assertSessionHasNoErrors();

        $this->assertSame($count, Customer::count());
        $this->assertSame($dewi->id, $this->newest()->customer_id);
    }

    public function test_failed_item_validation_does_not_create_customer()
    {
        $count = Customer::count();

        $this->storeWithNewCustomer([
            'new_customer' => ['name' => 'Tidak Jadi'],
            'items' => [['catalog_item_id' => 999_999, 'quantity' => 1]],
        ])->assertSessionHasErrors('items.0.catalog_item_id');

        $this->assertSame($count, Customer::count());
    }
}
