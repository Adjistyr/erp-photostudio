<?php

use App\Providers\AppServiceProvider;
use App\Providers\FortifyServiceProvider;
use Modules\Asset\Providers\AssetServiceProvider;
use Modules\Catalog\Providers\CatalogServiceProvider;
use Modules\Customer\Providers\CustomerServiceProvider;
use Modules\Expense\Providers\ExpenseServiceProvider;
use Modules\Order\Providers\OrderServiceProvider;

return [
    AppServiceProvider::class,
    FortifyServiceProvider::class,
    // Modul domain didaftarkan eksplisit (tanpa auto-discovery) — lihat docs/development.md.
    AssetServiceProvider::class,
    CatalogServiceProvider::class,
    CustomerServiceProvider::class,
    ExpenseServiceProvider::class,
    OrderServiceProvider::class,
];
