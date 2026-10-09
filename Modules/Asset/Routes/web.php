<?php

use Illuminate\Support\Facades\Route;
use Modules\Asset\Controllers\AssetController;

Route::middleware(['web', 'auth', 'verified'])->group(function () {
    Route::get('assets', [AssetController::class, 'index'])->name('assets.index');
    Route::get('assets/export', [AssetController::class, 'export'])->name('assets.export');
    Route::post('assets', [AssetController::class, 'store'])->name('assets.store');
    Route::post('assets/{asset}/maintenances', [AssetController::class, 'storeMaintenance'])->name('assets.maintenances.store');
    Route::delete('assets/{asset}/maintenances/{maintenance}', [AssetController::class, 'destroyMaintenance'])
        ->scopeBindings()
        ->name('assets.maintenances.destroy');
    Route::patch('assets/{asset}/status', [AssetController::class, 'updateStatus'])->name('assets.status');
    Route::patch('assets/{asset}/dispose', [AssetController::class, 'dispose'])->name('assets.dispose');
});
