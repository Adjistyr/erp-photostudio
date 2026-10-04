<?php

use App\Providers\AppServiceProvider;
use App\Providers\FortifyServiceProvider;
use Modules\Catalog\Providers\CatalogServiceProvider;
use Modules\Customer\Providers\CustomerServiceProvider;
use Modules\Expense\Providers\ExpenseServiceProvider;
use Modules\Order\Providers\OrderServiceProvider;

return [
    AppServiceProvider::class,
    FortifyServiceProvider::class,
    // Modul domain didaftarkan eksplisit (tanpa auto-discovery) — lihat docs/development.md.
    CatalogServiceProvider::class,
    CustomerServiceProvider::class,
    ExpenseServiceProvider::class,
    OrderServiceProvider::class,
];
