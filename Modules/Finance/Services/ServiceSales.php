<?php

namespace Modules\Finance\Services;

use Modules\Catalog\Models\CatalogItem;

final readonly class ServiceSales
{
    public function __construct(
        public CatalogItem $item,
        public int $quantity,
        public int $value,
    ) {}
}
