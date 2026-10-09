<?php

namespace Modules\Finance\Services;

use Modules\Catalog\Models\CatalogItem;
use Modules\Catalog\Models\CatalogItemVariant;

final readonly class ProductSales
{
    public function __construct(
        public CatalogItem $item,
        public int $quantity,
        public int $revenue,
        public int $cost,
        public int $margin,
        public float $marginRatio,
        /** Varian (spek 7.3); null = produk tanpa varian / terjual sebelum punya varian. */
        public ?CatalogItemVariant $variant = null,
    ) {}

    /** "Bingkai Kayu – A4" untuk varian, nama item untuk yang lain. */
    public function name(): string
    {
        return $this->variant ? CatalogItemVariant::label($this->item->name, $this->variant->name) : $this->item->name;
    }
}
