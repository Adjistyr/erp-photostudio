<?php

namespace Tests\Feature;

use App\Enums\PaymentStatus;
use App\Enums\WorkStatus;
use App\Models\CatalogItem;
use App\Models\Customer;
use App\Models\Order;
use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
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
                ->component('orders/create')
                ->has('customers', Customer::count())
                // 5 jasa di demo, satu dinonaktifkan; produk (cetak, bingkai) tidak ikut.
                ->has('catalog', 4)
                ->where('catalog.0.name', 'Add-on Editing Lanjutan')
            );
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
}
