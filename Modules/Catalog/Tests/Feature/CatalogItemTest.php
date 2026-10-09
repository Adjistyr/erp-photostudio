<?php

namespace Modules\Catalog\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Catalog\Models\CatalogItem;
use Modules\Catalog\Models\CatalogItemPhoto;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Modules\Shared\Enums\BusinessLine;
use Tests\TestCase;

class CatalogItemTest extends TestCase
{
    use RefreshDatabase;

    private function item(array $attributes = []): CatalogItem
    {
        return CatalogItem::create([
            'name' => 'Cetak 4R', 'type' => CatalogItemType::Product, 'price' => 5_000,
            'unit_cost' => 1_500, 'category' => 'Cetak', ...$attributes,
        ]);
    }

    private function product(array $overrides = []): array
    {
        return ['name' => 'Keychain Foto Akrilik', 'type' => 'product', 'price' => 25_000, 'unit_cost' => 8_000, 'category' => 'Merchandise', ...$overrides];
    }

    public function test_store_and_update_public_profile_fields()
    {
        $this->actingAs(User::factory()->create())
            ->post(route('catalog.store'), $this->product(['description' => '  Akrilik 5 cm, cetak dua sisi.  ', 'is_public' => true]))
            ->assertSessionHasNoErrors();

        $item = CatalogItem::sole();
        $this->assertSame(['Akrilik 5 cm, cetak dua sisi.', true], [$item->description, $item->is_public]);

        // Deskripsi spasi saja = kosong; penanda bisa dicabut.
        $this->put(route('catalog.update', $item), $this->product(['description' => '   ', 'is_public' => false]))->assertSessionHasNoErrors();
        $this->assertSame([null, false], [$item->fresh()?->description, $item->fresh()?->is_public]);
    }

    public function test_public_profile_defaults_and_limits()
    {
        $this->actingAs(User::factory()->create());
        $this->post(route('catalog.store'), $this->product())->assertSessionHasNoErrors();
        $this->assertFalse(CatalogItem::sole()->is_public);

        $this->post(route('catalog.store'), $this->product(['description' => str_repeat('a', 2001)]))->assertSessionHasErrors('description');
        $this->post(route('catalog.store'), $this->product(['is_public' => 'ya']))->assertSessionHasErrors('is_public');

        $this->get(route('catalog.index'))->assertInertia(fn (Assert $page) => $page
            ->where('items.0.description', null)
            ->where('items.0.is_public', false)
            ->where('items.0.photos', []));
    }

    public function test_create_page_renders_empty_form()
    {
        $this->actingAs(User::factory()->create())
            ->get(route('catalog.create'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('catalog::form')
                ->where('item', null)
                ->has('service_categories', 3)
                ->where('service_categories.0.value', 'Studio')
                ->has('low_margin_ratio'));
    }

    public function test_edit_page_renders_item_with_photos()
    {
        Storage::fake(CatalogItemPhoto::DISK);
        $item = $this->item(['description' => 'Cetak glossy', 'is_public' => true]);
        $this->actingAs(User::factory()->create())
            ->post(route('catalog.photos.store', $item), ['photos' => [UploadedFile::fake()->image('a.jpg', 300, 300)]]);

        $this->get(route('catalog.edit', $item))
            ->assertInertia(fn (Assert $page) => $page
                ->component('catalog::form')
                ->where('item.id', $item->id)
                ->where('item.unit_cost', 1_500)
                ->where('item.description', 'Cetak glossy')
                ->where('item.is_public', true)
                ->has('item.photos', 1)
                ->has('service_categories', 3));
    }

    public function test_edit_missing_item_is_not_found()
    {
        $this->actingAs(User::factory()->create())->get(route('catalog.edit', 999))->assertNotFound();
    }

    public function test_guest_cannot_open_form_pages()
    {
        $item = $this->item();

        $this->get(route('catalog.create'))->assertRedirect(route('login'));
        $this->get(route('catalog.edit', $item))->assertRedirect(route('login'));
    }

    public function test_guest_is_redirected_to_login()
    {
        $this->get(route('catalog.index'))->assertRedirect(route('login'));
    }

    public function test_index_lists_products_before_services()
    {
        $this->item(['name' => 'Paket Studio 1 Jam', 'type' => CatalogItemType::Service, 'price' => 350_000, 'unit_cost' => null, 'category' => 'Studio']);
        $this->item();

        $this->actingAs(User::factory()->create())
            ->get(route('catalog.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('catalog::index')
                ->has('items', 2)
                ->where('items.0.name', 'Cetak 4R')
                ->where('items.0.type', 'product')
                ->where('items.0.unit_cost', 1_500)
                ->where('items.1.type', 'service')
                // Jasa: HPP null, bukan 0 — biayanya dicatat per job.
                ->where('items.1.unit_cost', null)
            );
    }

    public function test_store_product_with_unit_cost()
    {
        $this->actingAs(User::factory()->create())
            ->post(route('catalog.store'), $this->product())
            // Ke halaman Edit supaya foto bisa langsung ditambahkan (spek 7.2).
            ->assertRedirect(route('catalog.edit', CatalogItem::sole()))
            ->assertSessionHasNoErrors();

        $item = CatalogItem::sole();
        $this->assertSame([CatalogItemType::Product, 25_000, 8_000, true], [$item->type, $item->price, $item->unit_cost, $item->is_active]);
    }

    public function test_store_service_cannot_carry_unit_cost()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('catalog.store'), ['name' => 'Paket Wedding', 'type' => 'service', 'price' => 8_500_000, 'category' => 'Event', 'unit_cost' => 1_000_000])
            ->assertSessionHasErrors('unit_cost');

        $this->actingAs($user)
            ->post(route('catalog.store'), ['name' => 'Paket Wedding', 'type' => 'service', 'price' => 8_500_000, 'category' => 'Event', 'unit_cost' => null])
            ->assertSessionHasNoErrors();
        $this->assertNull(CatalogItem::sole()->unit_cost);
    }

    public function test_product_requires_unit_cost()
    {
        // Produk tanpa HPP membuat margin retail terlihat 100% — persis
        // kebocoran yang mau dicegah (business-flow 7, Soal HPP).
        $this->actingAs(User::factory()->create())
            ->post(route('catalog.store'), $this->product(['unit_cost' => null]))
            ->assertSessionHasErrors('unit_cost');
    }

    public function test_blank_category_defaults_to_lain_lain()
    {
        $this->actingAs(User::factory()->create())->post(route('catalog.store'), $this->product(['category' => '']));

        $this->assertSame('Lain-lain', CatalogItem::sole()->category);
    }

    public function test_service_category_must_be_one_of_three()
    {
        $user = User::factory()->create();
        $service = fn (string $category) => ['name' => 'Paket Wedding', 'type' => 'service', 'price' => 8_500_000, 'category' => $category];

        $this->actingAs($user)->post(route('catalog.store'), $service('studio'))->assertSessionHasErrors('category');
        $this->actingAs($user)->post(route('catalog.store'), $service('Wedding'))->assertSessionHasErrors('category');
        $this->actingAs($user)->post(route('catalog.store'), $service('Event'))->assertSessionHasNoErrors();

        $this->assertSame('Event', CatalogItem::sole()->category);
    }

    public function test_service_without_category_is_rejected()
    {
        // Bukan "Lain-lain": jasa tanpa kategori tidak akan muncul di Buat Order.
        $this->actingAs(User::factory()->create())
            ->post(route('catalog.store'), ['name' => 'Paket Wedding', 'type' => 'service', 'price' => 8_500_000])
            ->assertSessionHasErrors('category');
    }

    public function test_product_category_stays_free_text()
    {
        $this->actingAs(User::factory()->create())
            ->post(route('catalog.store'), $this->product(['category' => 'Bingkai']))
            ->assertSessionHasNoErrors();

        $this->assertSame('Bingkai', CatalogItem::sole()->category);
    }

    public function test_index_flags_services_with_unknown_category()
    {
        $this->item(['name' => 'Paket Wedding', 'type' => CatalogItemType::Service, 'unit_cost' => null, 'category' => 'Wedding']);
        $this->item(['category' => 'Lain-lain']);

        $this->actingAs(User::factory()->create())
            ->get(route('catalog.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('items.0.unknown_category', false)
                ->where('items.1.unknown_category', true)
                // Pilihan kategori jasa hanya dibutuhkan halaman form (spek 7.2).
                ->missing('service_categories')
            );
    }

    public function test_updating_unknown_service_requires_known_category()
    {
        $item = $this->item(['name' => 'Paket Wedding', 'type' => CatalogItemType::Service, 'unit_cost' => null, 'category' => 'Wedding']);
        $user = User::factory()->create();

        $this->actingAs($user)
            ->put(route('catalog.update', $item), ['name' => 'Paket Wedding', 'type' => 'service', 'price' => 8_500_000, 'category' => 'Wedding'])
            ->assertSessionHasErrors('category');
        $this->actingAs($user)
            ->put(route('catalog.update', $item), ['name' => 'Paket Wedding', 'type' => 'service', 'price' => 8_500_000, 'category' => 'Event'])
            ->assertSessionHasNoErrors();

        $this->assertSame('Event', $item->refresh()->category);
    }

    public function test_validation_rejects_bad_input()
    {
        $this->actingAs(User::factory()->create())
            ->post(route('catalog.store'), ['name' => ' ', 'type' => 'barang', 'price' => 0, 'unit_cost' => -1])
            ->assertSessionHasErrors(['name', 'type', 'price', 'unit_cost']);

        $this->assertSame(0, CatalogItem::count());
    }

    public function test_update_price_does_not_change_past_orders()
    {
        $item = $this->item();
        $order = Order::create(['number' => 'ORD-0001', 'business_line' => BusinessLine::Retail, 'service_date' => '2026-08-20', 'work_status' => WorkStatus::Delivered]);
        $line = $order->items()->create(['catalog_item_id' => $item->id, 'name' => $item->name, 'quantity' => 2, 'unit_price' => 5_000, 'unit_cost' => 1_500]);

        $this->actingAs(User::factory()->create())
            ->put(route('catalog.update', $item), ['name' => 'Cetak 4R Glossy', 'type' => 'product', 'price' => 6_000, 'unit_cost' => 1_800, 'category' => 'Cetak'])
            ->assertRedirect(route('catalog.index'));

        $this->assertSame([6_000, 'Cetak 4R Glossy'], [$item->refresh()->price, $item->name]);
        // Harga & HPP disalin saat transaksi — order lama tidak ikut berubah.
        $this->assertSame([5_000, 1_500], [$line->refresh()->unit_price, $line->unit_cost]);
    }

    public function test_toggle_active_flips_status()
    {
        $item = $this->item();
        $user = User::factory()->create();

        $this->actingAs($user)->patch(route('catalog.toggle-active', $item))->assertRedirect(route('catalog.index'));
        $this->assertFalse($item->refresh()->is_active);

        $this->actingAs($user)->patch(route('catalog.toggle-active', $item));
        $this->assertTrue($item->refresh()->is_active);
    }

    public function test_catalog_items_cannot_be_deleted()
    {
        // Item yang pernah terjual hanya dinonaktifkan — menghapus memutus
        // referensi item order lama.
        $this->assertFalse(Route::has('catalog.destroy'));
    }

    public function test_index_exposes_low_margin_ratio_from_config()
    {
        config(['studio.low_margin_ratio' => 0.35]);

        $this->actingAs(User::factory()->create())
            ->get(route('catalog.index'))
            ->assertInertia(fn (Assert $page) => $page->where('low_margin_ratio', 0.35));
    }
}
