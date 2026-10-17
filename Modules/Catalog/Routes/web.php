<?php

use Illuminate\Support\Facades\Route;
use Modules\Catalog\Controllers\CatalogItemController;
use Modules\Catalog\Controllers\CatalogPhotoController;

Route::middleware(['web', 'auth', 'verified'])->group(function () {
    // Admin melihat katalog saja (tanpa HPP); mengelolanya hanya owner (spek 5.1).
    Route::resource('catalog', CatalogItemController::class)
        ->only(['index'])
        ->parameters(['catalog' => 'catalogItem']);

    Route::middleware('can:manage-catalog')->group(function () {
        Route::resource('catalog', CatalogItemController::class)
            ->only(['create', 'store', 'edit', 'update'])
            ->parameters(['catalog' => 'catalogItem']);
        Route::patch('catalog/{catalogItem}/toggle-active', [CatalogItemController::class, 'toggleActive'])
            ->name('catalog.toggle-active');
        // Komponen paket jasa (spek 6.3) — mengganti seluruh daftar.
        Route::put('catalog/{catalogItem}/components', [CatalogItemController::class, 'updateComponents'])
            ->name('catalog.components.update');
        // Galeri foto (spek 7.1). scopeBindings: foto item lain → 404.
        Route::post('catalog/{catalogItem}/photos', [CatalogPhotoController::class, 'store'])->name('catalog.photos.store');
        Route::delete('catalog/{catalogItem}/photos/{photo}', [CatalogPhotoController::class, 'destroy'])
            ->scopeBindings()
            ->name('catalog.photos.destroy');
        Route::patch('catalog/{catalogItem}/photos/{photo}/cover', [CatalogPhotoController::class, 'cover'])
            ->scopeBindings()
            ->name('catalog.photos.cover');
    });
});
