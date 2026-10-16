<?php

use Illuminate\Support\Facades\Route;
use Modules\Asset\Controllers\AssetCategoryController;
use Modules\Asset\Controllers\AssetCheckoutController;
use Modules\Asset\Controllers\AssetController;
use Modules\Asset\Controllers\AssetPhotoController;

Route::middleware(['web', 'auth', 'verified'])->group(function () {
    Route::get('assets', [AssetController::class, 'index'])->name('assets.index');
    // Ekspor memuat nilai buku & harga jual — hanya owner (spek 5.1).
    Route::get('assets/export', [AssetController::class, 'export'])
        ->middleware('can:view-finance')
        ->name('assets.export');

    // Register alat dikelola owner (spek 5.1): tambah, ubah identitas, lepas,
    // kategori, foto & nota. Admin: lihat, catat servis, status rusak/aktif, peminjaman.
    Route::middleware('can:manage-assets')->group(function () {
        // Halaman tambah/edit (spek 8.1) — `create` sebelum `{asset}`.
        Route::get('assets/create', [AssetController::class, 'create'])->name('assets.create');
        Route::post('assets', [AssetController::class, 'store'])->name('assets.store');
        Route::get('assets/{asset}/edit', [AssetController::class, 'edit'])->name('assets.edit');
        Route::put('assets/{asset}', [AssetController::class, 'update'])->name('assets.update');
        Route::patch('assets/{asset}/dispose', [AssetController::class, 'dispose'])->name('assets.dispose');
        // Foto alat & nota (spek 8.2).
        Route::post('assets/{asset}/photos', [AssetPhotoController::class, 'store'])->name('assets.photos.store');
        Route::scopeBindings()->group(function () {
            Route::delete('assets/{asset}/photos/{photo}', [AssetPhotoController::class, 'destroy'])->name('assets.photos.destroy');
            Route::patch('assets/{asset}/photos/{photo}/cover', [AssetPhotoController::class, 'cover'])->name('assets.photos.cover');
        });
        // Tidak ada halaman per kategori.
        Route::resource('asset-categories', AssetCategoryController::class)
            ->only(['index', 'store', 'update', 'destroy'])
            ->parameters(['asset-categories' => 'assetCategory']);
    });

    Route::get('assets/{asset}', [AssetController::class, 'show'])->name('assets.show');
    // File foto/nota privat — `show` menyajikan file ber-auth (spek 8.2).
    Route::get('assets/{asset}/photos/{photo}', [AssetPhotoController::class, 'show'])
        ->scopeBindings()
        ->name('assets.photos.show');
    // Peminjaman alat ke event (spek 8.4).
    Route::post('assets/{asset}/checkouts', [AssetCheckoutController::class, 'store'])->name('assets.checkouts.store');
    Route::scopeBindings()->group(function () {
        Route::patch('assets/{asset}/checkouts/{checkout}/return', [AssetCheckoutController::class, 'return'])->name('assets.checkouts.return');
        Route::delete('assets/{asset}/checkouts/{checkout}', [AssetCheckoutController::class, 'destroy'])->name('assets.checkouts.destroy');
    });
    Route::post('assets/{asset}/maintenances', [AssetController::class, 'storeMaintenance'])->name('assets.maintenances.store');
    Route::delete('assets/{asset}/maintenances/{maintenance}', [AssetController::class, 'destroyMaintenance'])
        ->scopeBindings()
        ->middleware('can:delete-money')
        ->name('assets.maintenances.destroy');
    Route::patch('assets/{asset}/status', [AssetController::class, 'updateStatus'])->name('assets.status');
});
