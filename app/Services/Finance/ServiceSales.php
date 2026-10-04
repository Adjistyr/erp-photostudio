<?php

namespace App\Services\Finance;

use App\Models\CatalogItem;

final readonly class ServiceSales
{
    public function __construct(
        public CatalogItem $item,
        public int $quantity,
        public int $value,
    ) {}
}
