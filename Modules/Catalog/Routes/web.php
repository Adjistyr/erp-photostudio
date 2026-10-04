<?php

use Illuminate\Support\Facades\Route;
use Modules\Catalog\Controllers\CatalogItemController;

Route::middleware(['web', 'auth', 'verified'])->group(function () {
    Route::resource('catalog', CatalogItemController::class)
        ->only(['index', 'store', 'update'])
        ->parameters(['catalog' => 'catalogItem']);
    Route::patch('catalog/{catalogItem}/toggle-active', [CatalogItemController::class, 'toggleActive'])
        ->name('catalog.toggle-active');
});
