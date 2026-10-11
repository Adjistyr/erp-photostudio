<?php

use Illuminate\Support\Facades\Route;
use Modules\Asset\Controllers\AssetCategoryController;
use Modules\Asset\Controllers\AssetController;
use Modules\Asset\Controllers\AssetPhotoController;

Route::middleware(['web', 'auth', 'verified'])->group(function () {
    Route::get('assets', [AssetController::class, 'index'])->name('assets.index');
    Route::get('assets/export', [AssetController::class, 'export'])->name('assets.export');
    // Halaman tambah/detail/edit (spek 8.1) — `create` sebelum `{asset}`.
    Route::get('assets/create', [AssetController::class, 'create'])->name('assets.create');
    Route::post('assets', [AssetController::class, 'store'])->name('assets.store');
    Route::get('assets/{asset}', [AssetController::class, 'show'])->name('assets.show');
    Route::get('assets/{asset}/edit', [AssetController::class, 'edit'])->name('assets.edit');
    Route::put('assets/{asset}', [AssetController::class, 'update'])->name('assets.update');
    // Foto alat & nota (spek 8.2) — privat, `show` menyajikan file ber-auth.
    Route::post('assets/{asset}/photos', [AssetPhotoController::class, 'store'])->name('assets.photos.store');
    Route::scopeBindings()->group(function () {
        Route::get('assets/{asset}/photos/{photo}', [AssetPhotoController::class, 'show'])->name('assets.photos.show');
        Route::delete('assets/{asset}/photos/{photo}', [AssetPhotoController::class, 'destroy'])->name('assets.photos.destroy');
        Route::patch('assets/{asset}/photos/{photo}/cover', [AssetPhotoController::class, 'cover'])->name('assets.photos.cover');
    });
    // Kategori aset dikelola owner (spek 8.1). Tidak ada halaman per kategori.
    Route::resource('asset-categories', AssetCategoryController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->parameters(['asset-categories' => 'assetCategory']);
    Route::post('assets/{asset}/maintenances', [AssetController::class, 'storeMaintenance'])->name('assets.maintenances.store');
    Route::delete('assets/{asset}/maintenances/{maintenance}', [AssetController::class, 'destroyMaintenance'])
        ->scopeBindings()
        ->name('assets.maintenances.destroy');
    Route::patch('assets/{asset}/status', [AssetController::class, 'updateStatus'])->name('assets.status');
    Route::patch('assets/{asset}/dispose', [AssetController::class, 'dispose'])->name('assets.dispose');
});
