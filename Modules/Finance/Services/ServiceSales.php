<?php

namespace Modules\Finance\Services;

use Modules\Catalog\Models\CatalogItem;

final readonly class ServiceSales
{
    public function __construct(
        public CatalogItem $item,
        public int $quantity,
        public int $value,
        /** HPP bahan dari `order_items.unit_cost` (paket berkomponen, spek 6.3); null = tidak ada baris ber-HPP. */
        public ?int $cost = null,
    ) {}
}
