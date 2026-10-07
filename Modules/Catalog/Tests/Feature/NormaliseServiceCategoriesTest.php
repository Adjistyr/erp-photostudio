<?php

namespace Modules\Catalog\Tests\Feature;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Catalog\Models\CatalogItem;
use Tests\TestCase;

/** Migrasi data normalisasi kategori jasa (spek 1.1, K2). */
class NormaliseServiceCategoriesTest extends TestCase
{
    use RefreshDatabase;

    private function migration(): Migration
    {
        /** @var Migration $m */
        $m = require base_path('database/migrations/2026_10_08_000003_normalise_service_categories.php');

        return $m;
    }

    private function service(string $name, string $category): CatalogItem
    {
        return CatalogItem::create(['name' => $name, 'type' => CatalogItemType::Service, 'price' => 100_000, 'unit_cost' => null, 'category' => $category]);
    }

    public function test_migration_normalises_case_and_spacing()
    {
        $a = $this->service('A', 'studio');
        $b = $this->service('B', 'ADD ON');
        $c = $this->service('C', 'Event ');

        $this->migration()->up();

        $this->assertSame(['Studio', 'Add-on', 'Event'], [$a->refresh()->category, $b->refresh()->category, $c->refresh()->category]);
    }

    public function test_migration_leaves_unknown_and_products_alone()
    {
        $wedding = $this->service('W', 'Wedding');
        $product = CatalogItem::create(['name' => 'P', 'type' => CatalogItemType::Product, 'price' => 5_000, 'unit_cost' => 1_000, 'category' => 'studio']);

        $this->migration()->up();

        $this->assertSame('Wedding', $wedding->refresh()->category);
        // Produk boleh teks bebas — tidak disentuh walau cocok huruf.
        $this->assertSame('studio', $product->refresh()->category);
    }
}
