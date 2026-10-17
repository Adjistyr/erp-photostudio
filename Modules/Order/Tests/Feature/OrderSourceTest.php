<?php

namespace Modules\Order\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Catalog\Models\CatalogItem;
use Modules\Customer\Models\Customer;
use Modules\Order\Enums\PaymentMethod;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Modules\Order\Models\OrderItem;
use Modules\Shared\Enums\BusinessLine;
use Tests\TestCase;

/** Sumber lead per order (spek 6.6). */
class OrderSourceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');
        $this->actingAs(User::factory()->create());
    }

    private function customer(string $source = 'Instagram'): Customer
    {
        return Customer::create(['name' => 'Rani Lead', 'phone' => '081299990000', 'source' => $source]);
    }

    /** @param  array<string, mixed>  $data */
    private function store(array $data)
    {
        return $this->post(route('orders.store'), [
            'business_line' => 'studio',
            'service_date' => '2026-09-05',
            'items' => [['catalog_item_id' => CatalogItem::where('name', 'Paket Studio 1 Jam')->sole()->id, 'quantity' => 1]],
            ...$data,
        ]);
    }

    private function newest(): Order
    {
        return Order::with('items')->orderByDesc('id')->firstOrFail();
    }

    public function test_order_source_defaults_to_customer_source()
    {
        $customer = $this->customer('Google Maps');

        $this->store(['customer_id' => $customer->id])->assertSessionHasNoErrors();
        $this->assertSame('Google Maps', $this->newest()->source);

        // Customer baru inline (spek 3.4) yang cocok dengan customer lama via HP
        // ikut sumber customer itu.
        $this->store(['new_customer' => ['name' => 'Rani', 'phone' => '081299990000']])->assertSessionHasNoErrors();
        $this->assertSame($customer->id, $this->newest()->customer_id);
        $this->assertSame('Google Maps', $this->newest()->source);

        // Customer tanpa sumber → order tidak dicatat (boleh kosong).
        $this->store(['new_customer' => ['name' => 'Tamu Baru Sekali', 'phone' => '']])->assertSessionHasNoErrors();
        $this->assertNull($this->newest()->source);
    }

    public function test_order_source_can_override_without_changing_customer()
    {
        $customer = $this->customer('Instagram');

        $this->store(['customer_id' => $customer->id, 'source' => 'Teman'])->assertSessionHasNoErrors();
        $order = $this->newest();
        $this->assertSame('Teman', $order->source);
        $this->assertSame('Instagram', $customer->fresh()->source);

        $this->put(route('orders.update', $order), [
            'customer_id' => $order->customer_id,
            'service_date' => $order->service_date->toDateString(),
            'location' => $order->location ?? '',
            'source' => 'Lainnya',
            'items' => $order->items->map(fn (OrderItem $i) => ['id' => $i->id, 'catalog_item_id' => $i->catalog_item_id, 'quantity' => $i->quantity])->all(),
        ])->assertSessionHasNoErrors();

        $this->assertSame('Lainnya', $order->fresh()->source);
        $this->assertSame('Instagram', $customer->fresh()->source);
        $this->assertEquals(['from' => 'Teman', 'to' => 'Lainnya'], $order->events()->latest('id')->firstOrFail()->changes['source']);
    }

    public function test_invalid_source_rejected()
    {
        $count = Order::count();

        $this->store(['customer_id' => $this->customer()->id, 'source' => 'TikTok'])
            ->assertSessionHasErrors(['source' => 'Sumber order yang dipilih tidak valid.']);

        $this->assertSame($count, Order::count());
    }

    public function test_sales_report_groups_revenue_by_source_with_uncategorised_bucket()
    {
        $customer = $this->customer();
        $make = function (BusinessLine $line, ?string $source, array $payments) use ($customer) {
            $order = Order::create([
                'number' => Order::nextNumber(), 'customer_id' => $customer->id, 'business_line' => $line,
                'service_date' => '2027-01-10', 'work_status' => WorkStatus::Scheduled, 'source' => $source,
            ]);
            foreach ($payments as $date => $amount) {
                $order->payments()->create(['paid_on' => $date, 'amount' => $amount, 'method' => PaymentMethod::Cash, 'note' => 'DP']);
            }
        };
        $make(BusinessLine::Studio, 'Instagram', ['2027-01-05' => 300_000, '2027-01-20' => 100_000]);
        $make(BusinessLine::Event, 'Instagram', ['2027-01-07' => 200_000]);
        $make(BusinessLine::Event, null, ['2027-01-08' => 400_000]);
        // DP bulan lalu tidak dihitung — basis kas bulan terpilih.
        $make(BusinessLine::Studio, 'Teman', ['2026-12-30' => 500_000]);
        // Retail tidak mencatat sumber — tidak ikut tabel ini.
        $make(BusinessLine::Retail, null, ['2027-01-09' => 50_000]);

        $this->get(route('reports.sales', ['month' => '2027-01']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('finance::reports/sales')
                ->where('by_source', [
                    ['source' => 'Instagram', 'orders' => 2, 'revenue' => 600_000, 'share' => 0.6],
                    ['source' => null, 'orders' => 1, 'revenue' => 400_000, 'share' => 0.4],
                ])
            );
    }
}
