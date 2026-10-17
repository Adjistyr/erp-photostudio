<?php

namespace Modules\Catalog\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Catalog\Models\CatalogItem;
use Modules\Customer\Models\Customer;
use Modules\Order\Models\Order;
use Modules\Order\Models\OrderItem;
use Tests\TestCase;

/** Bundel katalog — paket jasa dengan komponen produk (spek 6.3). */
class CatalogBundleTest extends TestCase
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

    /** @param  list<array{0: CatalogItem, 1: int}>  $components */
    private function putComponents(CatalogItem $item, array $components)
    {
        return $this->put(route('catalog.components.update', $item), [
            'components' => array_map(fn (array $c) => ['component_id' => $c[0]->id, 'quantity' => $c[1]], $components),
        ]);
    }

    /** Paket Studio 1 Jam termasuk 5 cetak 4R (HPP 1.500) + 1 bingkai 10R (HPP 32.000). */
    private function bundle(): CatalogItem
    {
        $paket = $this->catalog('Paket Studio 1 Jam');
        $this->putComponents($paket, [[$this->catalog('Cetak 4R'), 5], [$this->catalog('Cetak 10R + Bingkai'), 1]])
            ->assertSessionHasNoErrors();

        return $paket;
    }

    private function orderBundle(int $quantity = 1): Order
    {
        $this->post(route('orders.store'), [
            'business_line' => 'studio',
            'customer_id' => Customer::where('name', 'Dewi Anggraini')->sole()->id,
            'service_date' => '2026-09-05',
            'items' => [['catalog_item_id' => $this->catalog('Paket Studio 1 Jam')->id, 'quantity' => $quantity]],
        ])->assertSessionHasNoErrors();

        return Order::with('items')->orderByDesc('id')->firstOrFail();
    }

    public function test_service_can_define_product_components()
    {
        $paket = $this->bundle();

        $this->assertSame(5 * 1_500 + 32_000, $paket->load('components')->bundleCost());
        // Katalog TIDAK menyimpan HPP paket (aturan 2).
        $this->assertNull($paket->fresh()?->unit_cost);

        $this->get(route('catalog.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('items', fn ($items) => collect($items)->firstWhere('name', 'Paket Studio 1 Jam')['bundle_cost'] === 39_500
                    && collect($items)->firstWhere('name', 'Paket Studio 1 Jam')['components'] === [
                        ['id' => $this->catalog('Cetak 10R + Bingkai')->id, 'name' => 'Cetak 10R + Bingkai', 'quantity' => 1, 'unit_cost' => 32_000, 'is_active' => true],
                        ['id' => $this->catalog('Cetak 4R')->id, 'name' => 'Cetak 4R', 'quantity' => 5, 'unit_cost' => 1_500, 'is_active' => true],
                    ]
                    // Jasa tanpa komponen tetap null, bukan 0.
                    && collect($items)->firstWhere('name', 'Paket Wedding Full Day')['bundle_cost'] === null)
            );

        $this->get(route('catalog.edit', $paket))
            ->assertInertia(fn (Assert $page) => $page
                ->component('catalog::form')
                ->has('item.components', 2)
                ->where('component_options', fn ($o) => collect($o)->pluck('name')->contains('Cetak 4R')
                    && ! collect($o)->pluck('name')->contains('Paket Wedding Full Day'))
            );
    }

    public function test_product_cannot_have_components()
    {
        $print = $this->catalog('Cetak 4R');

        $this->putComponents($print, [[$this->catalog('Cetak 10R + Bingkai'), 1]])->assertSessionHasErrors('components');

        $this->assertSame(0, $print->components()->count());
    }

    public function test_component_must_be_product()
    {
        $paket = $this->catalog('Paket Studio 1 Jam');

        // Jasa sebagai komponen = paket bersarang — ditolak.
        $this->putComponents($paket, [[$this->catalog('Add-on Editing Lanjutan'), 1]])
            ->assertSessionHasErrors(['components.0.component_id' => 'Komponen harus produk fisik dari katalog — jasa tidak punya HPP tetap.']);
        $this->put(route('catalog.components.update', $paket), ['components' => [
            ['component_id' => $this->catalog('Cetak 4R')->id, 'quantity' => 0],
            ['component_id' => 999_999, 'quantity' => 1],
        ]])->assertSessionHasErrors(['components.0.quantity', 'components.1.component_id']);

        $this->assertSame(0, $paket->components()->count());
    }

    public function test_type_change_cannot_create_nesting_or_product_bundle()
    {
        $paket = $this->bundle();
        $print = $this->catalog('Cetak 4R');

        // Komponen jadi jasa → paket berisi jasa (bersarang).
        $this->put(route('catalog.update', $print), ['name' => 'Cetak 4R', 'type' => 'service', 'price' => 5_000, 'category' => 'Add-on'])
            ->assertSessionHasErrors(['type' => 'Produk ini komponen paket jasa — tidak bisa diubah jadi jasa. Keluarkan dulu dari paketnya.']);
        // Paket jadi produk → produk berkomponen.
        $this->put(route('catalog.update', $paket), ['name' => $paket->name, 'type' => 'product', 'price' => 350_000, 'unit_cost' => 0, 'category' => 'Studio'])
            ->assertSessionHasErrors(['type' => 'Paket ini punya komponen — tidak bisa diubah jadi produk. Kosongkan komponennya dulu.']);
    }

    public function test_bundle_still_cannot_carry_typed_unit_cost()
    {
        $paket = $this->bundle();

        // Aturan 3: HPP paket dihitung, bukan diketik.
        $this->put(route('catalog.update', $paket), ['name' => $paket->name, 'type' => 'service', 'price' => 350_000, 'category' => 'Studio', 'unit_cost' => 10_000])
            ->assertSessionHasErrors('unit_cost');
    }

    public function test_inactive_component_is_still_counted_but_cannot_be_added()
    {
        $paket = $this->bundle();
        $print = $this->catalog('Cetak 4R');
        $this->patch(route('catalog.toggle-active', $print));

        // Aturan 4: nonaktif hanya menyembunyikan dari pilihan — HPP paket tetap menghitungnya.
        $this->assertSame(39_500, $paket->load('components')->bundleCost());
        $this->assertSame(39_500, $this->orderBundle()->items->sole()->unit_cost);
        // Komponen lama yang nonaktif boleh tetap di daftar saat disimpan ulang…
        $this->putComponents($paket, [[$print, 6], [$this->catalog('Cetak 10R + Bingkai'), 1]])->assertSessionHasNoErrors();
        $this->assertSame(6 * 1_500 + 32_000, $paket->load('components')->bundleCost());
        // …dan tetap terbaca di pilihan halaman Edit paket.
        $this->get(route('catalog.edit', $paket))
            ->assertInertia(fn (Assert $page) => $page->where('component_options', fn ($o) => collect($o)->firstWhere('name', 'Cetak 4R')['is_active'] === false));

        // Tapi produk nonaktif tidak bisa ditambahkan ke paket lain.
        $other = $this->catalog('Paket Wedding Full Day');
        $this->putComponents($other, [[$print, 1]])
            ->assertSessionHasErrors(['components.0.component_id' => 'Cetak 4R sudah nonaktif — aktifkan dulu untuk menambahkannya.']);
    }

    public function test_removing_component_deletes_it_from_bundle()
    {
        $paket = $this->bundle();

        $this->putComponents($paket, [[$this->catalog('Cetak 4R'), 5]])
            ->assertSessionHasNoErrors()
            ->assertRedirect();
        $this->assertSame(['Cetak 4R'], $paket->components()->pluck('name')->all());
        $this->assertSame(7_500, $paket->load('components')->bundleCost());

        // Daftar kosong = bukan paket berkomponen lagi; order berikutnya tanpa HPP.
        $this->put(route('catalog.components.update', $paket), ['components' => []])->assertSessionHasNoErrors();
        $this->assertSame(0, $paket->components()->count());
        $line = $this->orderBundle()->items->sole();
        $this->assertSame([null, null], [$line->unit_cost, $line->components]);
    }

    public function test_service_without_components_keeps_null_cost()
    {
        $line = $this->orderBundle()->items->sole();

        $this->assertSame([350_000, null, null], [$line->unit_price, $line->unit_cost, $line->components]);
    }

    public function test_order_line_snapshots_bundle_cost_and_components()
    {
        $this->bundle();
        $order = $this->orderBundle(2);
        $line = $order->items->sole();

        // Satu baris paket — cetak tidak ditagih dua kali; HPP paket per unit.
        $this->assertSame(['Paket Studio 1 Jam', 350_000, 39_500], [$line->name, $line->unit_price, $line->unit_cost]);
        $this->assertSame(700_000, $order->total());
        $this->assertSame(2 * 39_500, $order->materialCost());
        $this->assertSame([
            ['name' => 'Cetak 10R + Bingkai', 'quantity' => 1, 'unit_cost' => 32_000],
            ['name' => 'Cetak 4R', 'quantity' => 5, 'unit_cost' => 1_500],
        ], $line->components);

        // HPP & nama komponen berubah setelah order → order tetap lama.
        $this->catalog('Cetak 4R')->update(['name' => 'Cetak 4R Glossy', 'unit_cost' => 2_500]);
        $line->refresh();
        $this->assertSame(39_500, $line->unit_cost);
        $this->assertSame('Cetak 4R', $line->components[1]['name'] ?? null);

        // Ubah Order: baris lama hanya berubah qty, snapshot tidak disalin ulang.
        $this->put(route('orders.update', $order), [
            'customer_id' => $order->customer_id, 'service_date' => '2026-09-05', 'service_time' => '', 'location' => 'Studio', 'notes' => '',
            'items' => [['id' => $line->id, 'catalog_item_id' => $line->catalog_item_id, 'quantity' => 3]],
        ])->assertSessionHasNoErrors();
        $line->refresh();
        $this->assertSame([3, 39_500, 1_500], [$line->quantity, $line->unit_cost, $line->components[1]['unit_cost'] ?? null]);

        // Detail order (internal) membawa HPP komponen; invoice (customer) tidak.
        $this->get(route('orders.show', $order))
            ->assertInertia(fn (Assert $page) => $page->where('order.items.0.components.1', ['name' => 'Cetak 4R', 'quantity' => 5, 'unit_cost' => 1_500]));
        $this->get($order->invoiceUrl())
            ->assertInertia(fn (Assert $page) => $page->where('invoice.items.0.components', [
                ['name' => 'Cetak 10R + Bingkai', 'quantity' => 1],
                ['name' => 'Cetak 4R', 'quantity' => 5],
            ]));
    }

    public function test_new_bundle_line_in_order_edit_snapshots_cost()
    {
        $this->bundle();
        $order = Order::with('items')->where('number', 'ORD-0005')->sole();
        $own = $order->items->sole();

        $this->put(route('orders.update', $order), [
            'customer_id' => $order->customer_id,
            'service_date' => $order->service_date->toDateString(),
            'service_time' => $order->service_time === null ? '' : substr($order->service_time, 0, 5),
            'location' => $order->location ?? '',
            'notes' => $order->notes ?? '',
            'items' => [
                ['id' => $own->id, 'catalog_item_id' => $own->catalog_item_id, 'quantity' => $own->quantity],
                ['id' => null, 'catalog_item_id' => $this->catalog('Paket Studio 1 Jam')->id, 'quantity' => 1],
            ],
        ])->assertSessionHasNoErrors();

        $line = OrderItem::where('order_id', $order->id)->where('name', 'Paket Studio 1 Jam')->latest('id')->firstOrFail();
        $this->assertSame(39_500, $line->unit_cost);
        $this->assertCount(2, $line->components ?? []);
    }

    public function test_order_form_options_describe_bundle_contents()
    {
        $this->bundle();

        $this->get(route('orders.create'))
            ->assertInertia(fn (Assert $page) => $page->where('catalog', fn ($c) => collect($c)->firstWhere('name', 'Paket Studio 1 Jam')['components'] === [
                ['name' => 'Cetak 10R + Bingkai', 'quantity' => 1],
                ['name' => 'Cetak 4R', 'quantity' => 5],
            ]));
    }

    public function test_sales_report_shows_bundle_cost_for_service()
    {
        $this->bundle();
        $this->orderBundle(2);

        $this->get(route('reports.sales', ['month' => '2026-08']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('finance::reports/sales')
                ->where('services', fn ($s) => collect($s)->firstWhere('name', 'Paket Studio 1 Jam')['cost'] === 2 * 39_500
                    // Paket tanpa komponen tetap "—" (null), bukan Rp 0.
                    && collect($s)->firstWhere('name', 'Paket Wedding Full Day')['cost'] === null)
            );
    }
}
