<?php

use Illuminate\Support\Facades\Route;
use Modules\Catalog\Controllers\CatalogItemController;
use Modules\Catalog\Controllers\CatalogPhotoController;

Route::middleware(['web', 'auth', 'verified'])->group(function () {
    Route::resource('catalog', CatalogItemController::class)
        ->only(['index', 'create', 'store', 'edit', 'update'])
        ->parameters(['catalog' => 'catalogItem']);
    Route::patch('catalog/{catalogItem}/toggle-active', [CatalogItemController::class, 'toggleActive'])
        ->name('catalog.toggle-active');
    // Galeri foto (spek 7.1). scopeBindings: foto item lain → 404.
    Route::post('catalog/{catalogItem}/photos', [CatalogPhotoController::class, 'store'])->name('catalog.photos.store');
    Route::delete('catalog/{catalogItem}/photos/{photo}', [CatalogPhotoController::class, 'destroy'])
        ->scopeBindings()
        ->name('catalog.photos.destroy');
    Route::patch('catalog/{catalogItem}/photos/{photo}/cover', [CatalogPhotoController::class, 'cover'])
        ->scopeBindings()
        ->name('catalog.photos.cover');
});
