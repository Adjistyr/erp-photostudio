<?php

namespace Modules\Catalog\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Catalog\Models\CatalogItem;
use Modules\Catalog\Models\CatalogItemPhoto;
use Tests\TestCase;

/** Varian produk (spek 7.3). */
class CatalogVariantTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create());
    }

    /** @param  array<string, mixed>  $overrides */
    private function product(array $overrides = []): array
    {
        return ['name' => 'Bingkai Kayu', 'type' => 'product', 'category' => 'Bingkai', ...$overrides];
    }

    /** @return list<array<string, mixed>> */
    private function variants(): array
    {
        return [
            ['name' => 'A3', 'price' => 90_000, 'unit_cost' => 55_000],
            ['name' => 'A4', 'price' => 60_000, 'unit_cost' => 35_000],
        ];
    }

    private function storeWithVariants(): CatalogItem
    {
        $this->post(route('catalog.store'), $this->product(['variants' => $this->variants()]))->assertSessionHasNoErrors();

        return CatalogItem::sole();
    }

    public function test_store_product_with_variants_copies_cheapest_active_price()
    {
        $item = $this->storeWithVariants();

        $this->assertSame([['A3', 90_000, 55_000, true], ['A4', 60_000, 35_000, true]],
            $item->variants->map(fn ($v) => [$v->name, $v->price, $v->unit_cost, $v->is_active])->all());
        // Harga item tidak diisi manual — disalin dari varian aktif termurah.
        $this->assertSame([60_000, 35_000], [$item->price, $item->unit_cost]);
    }

    public function test_update_edits_adds_and_deactivates_variants()
    {
        $item = $this->storeWithVariants();
        [$a3, $a4] = $item->variants->all();

        $this->put(route('catalog.update', $item), $this->product(['variants' => [
            ['id' => $a3->id, 'name' => 'A3', 'price' => 95_000, 'unit_cost' => 55_000],
            ['id' => $a4->id, 'name' => 'A4', 'price' => 60_000, 'unit_cost' => 35_000, 'is_active' => false],
            ['name' => 'A5', 'price' => 45_000, 'unit_cost' => 25_000],
        ]]))->assertSessionHasNoErrors();

        $item->refresh();
        $this->assertSame([['A3', 95_000, true], ['A4', 60_000, false], ['A5', 45_000, true]],
            $item->variants->map(fn ($v) => [$v->name, $v->price, $v->is_active])->all());
        $this->assertSame(45_000, $item->price);
    }

    public function test_all_variants_inactive_falls_back_to_cheapest_overall()
    {
        $item = $this->storeWithVariants();
        $rows = $item->variants->map(fn ($v) => [...$v->only('id', 'name', 'price', 'unit_cost'), 'is_active' => false])->all();

        $this->put(route('catalog.update', $item), $this->product(['variants' => $rows]))->assertSessionHasNoErrors();

        $this->assertSame(60_000, $item->fresh()?->price);
    }

    public function test_service_cannot_have_variants()
    {
        $this->post(route('catalog.store'), ['name' => 'Paket Studio', 'type' => 'service', 'price' => 350_000, 'category' => 'Studio', 'variants' => $this->variants()])
            ->assertSessionHasErrors(['variants' => 'Varian hanya untuk produk fisik — paket jasa dibuat sebagai item terpisah.']);
    }

    public function test_duplicate_variant_names_are_rejected_case_insensitively()
    {
        $this->post(route('catalog.store'), $this->product(['variants' => [
            ['name' => 'A4', 'price' => 60_000, 'unit_cost' => 35_000],
            ['name' => 'a4 ', 'price' => 61_000, 'unit_cost' => 35_000],
        ]]))->assertSessionHasErrors('variants.1.name');

        $this->assertSame(0, CatalogItem::count());
    }

    public function test_variant_needs_price_and_unit_cost()
    {
        $this->post(route('catalog.store'), $this->product(['variants' => [['name' => 'A4', 'price' => 0]]]))
            ->assertSessionHasErrors(['variants.0.price', 'variants.0.unit_cost']);
    }

    public function test_variant_and_photo_of_other_item_are_rejected()
    {
        Storage::fake(CatalogItemPhoto::DISK);
        $mine = $this->storeWithVariants();
        $other = CatalogItem::create(['name' => 'Keychain', 'type' => CatalogItemType::Product, 'price' => 25_000, 'unit_cost' => 8_000, 'category' => 'Merch']);
        $foreign = $other->variants()->create(['name' => 'Bulat', 'price' => 25_000, 'unit_cost' => 8_000, 'position' => 1]);
        $this->post(route('catalog.photos.store', $other), ['photos' => [UploadedFile::fake()->image('a.jpg', 300, 300)]]);

        $this->put(route('catalog.update', $mine), $this->product(['variants' => [
            ['id' => $foreign->id, 'name' => 'Curian', 'price' => 1, 'unit_cost' => 0],
            ['name' => 'A2', 'price' => 120_000, 'unit_cost' => 70_000, 'catalog_item_photo_id' => $other->photos()->sole()->id],
        ]]))->assertSessionHasErrors(['variants.0.id', 'variants.1.catalog_item_photo_id']);

        $this->assertSame('Bulat', $foreign->fresh()?->name);
    }

    public function test_product_with_variants_cannot_become_service()
    {
        $item = $this->storeWithVariants();

        $this->put(route('catalog.update', $item), ['name' => 'Bingkai Kayu', 'type' => 'service', 'price' => 60_000, 'category' => 'Studio'])
            ->assertSessionHasErrors('type');
        $this->assertSame(CatalogItemType::Product, $item->fresh()?->type);
    }

    public function test_props_carry_variants_with_photo()
    {
        Storage::fake(CatalogItemPhoto::DISK);
        $item = $this->storeWithVariants();
        $this->post(route('catalog.photos.store', $item), ['photos' => [UploadedFile::fake()->image('a.jpg', 300, 300)]]);
        $photo = $item->photos()->sole();
        $rows = $item->variants->map(fn ($v) => $v->only('id', 'name', 'price', 'unit_cost'))->all();
        $rows[1]['catalog_item_photo_id'] = $photo->id;
        $this->put(route('catalog.update', $item), $this->product(['variants' => $rows]))->assertSessionHasNoErrors();

        $this->get(route('catalog.edit', $item))->assertInertia(fn (Assert $page) => $page
            ->has('item.variants', 2)
            ->where('item.variants.1.name', 'A4')
            ->where('item.variants.1.catalog_item_photo_id', $photo->id)
            ->where('item.variants.0.is_active', true));

        // Foto dihapus → varian kembali ke sampul item.
        $this->delete(route('catalog.photos.destroy', [$item, $photo]));
        $this->assertNull($item->variants()->where('name', 'A4')->sole()->catalog_item_photo_id);
    }
}
