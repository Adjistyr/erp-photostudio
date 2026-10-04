<?php

namespace Modules\Finance\Services;

use Modules\Catalog\Models\CatalogItem;

final readonly class ProductSales
{
    public function __construct(
        public CatalogItem $item,
        public int $quantity,
        public int $revenue,
        public int $cost,
        public int $margin,
        public float $marginRatio,
    ) {}
}
