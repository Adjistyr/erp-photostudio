<?php

namespace Modules\Catalog\Tests\Unit;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Catalog\Models\CatalogItem;
use PHPUnit\Framework\TestCase;

/** HPP paket = Σ HPP komponen × qty (spek 6.3). */
class CatalogItemBundleCostTest extends TestCase
{
    /** @param  list<array{0: int|null, 1: int}>  $components [unit_cost, qty] */
    private function service(array $components): CatalogItem
    {
        $item = new CatalogItem(['name' => 'Paket Studio 1 Jam', 'type' => CatalogItemType::Service, 'price' => 350_000]);
        $item->setRelation('components', new Collection(array_map(function (array $c) {
            $product = new CatalogItem(['name' => 'Cetak', 'type' => CatalogItemType::Product, 'price' => 5_000, 'unit_cost' => $c[0]]);

            return $product->setRelation('pivot', new Pivot(['quantity' => $c[1]]));
        }, $components)));

        return $item;
    }

    public function test_no_components_is_not_a_bundle()
    {
        $item = $this->service([]);

        $this->assertFalse($item->isBundle());
        $this->assertNull($item->bundleCost());
        $this->assertNull($item->componentsSnapshot());
    }

    public function test_two_components_sum_cost_times_quantity()
    {
        $item = $this->service([[1_500, 5], [32_000, 1]]);

        $this->assertTrue($item->isBundle());
        $this->assertSame(5 * 1_500 + 32_000, $item->bundleCost());
        $this->assertSame([5, 1], array_column($item->componentsSnapshot() ?? [], 'quantity'));
    }

    public function test_product_is_never_a_bundle()
    {
        $item = $this->service([[1_500, 5]]);
        $item->type = CatalogItemType::Product;

        $this->assertNull($item->bundleCost());
    }
}
