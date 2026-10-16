<?php

namespace Modules\Catalog\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Catalog\Models\CatalogItem;
use Modules\Catalog\Models\CatalogPriceChange;
use Tests\TestCase;

class CatalogPriceHistoryTest extends TestCase
{
    use RefreshDatabase;

    private function item(): CatalogItem
    {
        return CatalogItem::create([
            'name' => 'Cetak 4R', 'type' => CatalogItemType::Product, 'price' => 5_000,
            'unit_cost' => 1_500, 'category' => 'Cetak',
        ]);
    }

    /** @return array<string, mixed> */
    private function payload(array $overrides = []): array
    {
        return ['name' => 'Cetak 4R', 'type' => 'product', 'price' => 5_000, 'unit_cost' => 1_500, 'category' => 'Cetak', ...$overrides];
    }

    public function test_creating_item_records_initial_price()
    {
        // Tanpa sesi (seeder/impor) tetap tercatat, pencatat null.
        $item = $this->item();
        $change = CatalogPriceChange::sole();
        $this->assertSame([$item->id, 5_000, 1_500, null], [$change->catalog_item_id, $change->price, $change->unit_cost, $change->changed_by]);

        // Lewat form: pencatat = user login.
        $user = User::factory()->create();
        $this->actingAs($user)->post(route('catalog.store'), $this->payload(['name' => 'Cetak 10R', 'price' => 20_000]))->assertSessionHasNoErrors();
        $this->assertSame([20_000, $user->id], [CatalogPriceChange::latest('id')->first()?->price, CatalogPriceChange::latest('id')->first()?->changed_by]);
    }

    public function test_updating_price_records_change_with_user()
    {
        $item = $this->item();
        $user = User::factory()->create();

        $this->actingAs($user)->put(route('catalog.update', $item), $this->payload(['price' => 6_000]))->assertSessionHasNoErrors();

        $this->assertSame(2, $item->priceChanges()->count());
        $latest = $item->priceChanges()->first();
        $this->assertSame([6_000, 1_500, $user->id], [$latest?->price, $latest?->unit_cost, $latest?->changed_by]);
    }

    public function test_updating_name_only_does_not_record()
    {
        $item = $this->item();

        $this->actingAs(User::factory()->create())
            ->put(route('catalog.update', $item), $this->payload(['name' => 'Cetak 4R Glossy', 'category' => 'Cetak Foto']))
            ->assertSessionHasNoErrors();
        $item->update(['is_active' => false]);

        $this->assertSame(1, $item->priceChanges()->count());
    }

    public function test_updating_unit_cost_only_records()
    {
        $item = $this->item();

        $this->actingAs(User::factory()->create())
            ->put(route('catalog.update', $item), $this->payload(['unit_cost' => 1_800]))
            ->assertSessionHasNoErrors();

        $latest = $item->priceChanges()->first();
        $this->assertSame([2, 5_000, 1_800], [$item->priceChanges()->count(), $latest?->price, $latest?->unit_cost]);
    }

    public function test_variant_price_change_records_when_item_price_follows()
    {
        $user = User::factory()->create();
        $this->actingAs($user)->post(route('catalog.store'), $this->payload([
            'name' => 'Bingkai', 'price' => null, 'unit_cost' => null,
            'variants' => [['id' => null, 'name' => 'A4', 'price' => 60_000, 'unit_cost' => 20_000, 'catalog_item_photo_id' => null, 'is_active' => true]],
        ]))->assertSessionHasNoErrors();
        $item = CatalogItem::sole();
        $variant = $item->variants()->sole();

        // Varian termurah turun → harga item ikut → tercatat.
        $this->put(route('catalog.update', $item), $this->payload([
            'name' => 'Bingkai', 'price' => null, 'unit_cost' => null,
            'variants' => [['id' => $variant->id, 'name' => 'A4', 'price' => 55_000, 'unit_cost' => 20_000, 'catalog_item_photo_id' => null, 'is_active' => true]],
        ]))->assertSessionHasNoErrors();

        $this->assertSame([55_000, 60_000], $item->priceChanges()->pluck('price')->all());
    }

    public function test_edit_props_include_recent_changes_newest_first()
    {
        $owner = User::factory()->create(['name' => 'Agung']);
        Carbon::setTestNow('2026-08-12 09:00');
        $item = $this->item();
        Carbon::setTestNow('2026-10-06 09:00');
        $this->actingAs($owner);
        $item->update(['price' => 6_000]);
        Carbon::setTestNow();

        $this->get(route('catalog.edit', $item))->assertInertia(fn (Assert $page) => $page
            ->component('catalog::form')
            ->has('price_changes', 2)
            ->where('price_changes.0.price', 6_000)
            ->where('price_changes.0.changed_by_name', 'Agung')
            ->where('price_changes.0.at', fn (string $at) => str_starts_with($at, '2026-10-06'))
            ->where('price_changes.1.price', 5_000)
            ->where('price_changes.1.unit_cost', 1_500)
            ->where('price_changes.1.changed_by_name', null));

        // Dibatasi 20 terakhir.
        foreach (range(1, 25) as $i) {
            $item->update(['price' => 6_000 + $i]);
        }
        $this->get(route('catalog.edit', $item))->assertInertia(fn (Assert $page) => $page
            ->has('price_changes', 20)
            ->where('price_changes.0.price', 6_025));
    }
}
