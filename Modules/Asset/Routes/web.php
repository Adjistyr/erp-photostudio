<?php

use Illuminate\Support\Facades\Route;
use Modules\Asset\Controllers\AssetController;

Route::middleware(['web', 'auth', 'verified'])->group(function () {
    Route::get('assets', [AssetController::class, 'index'])->name('assets.index');
    Route::post('assets', [AssetController::class, 'store'])->name('assets.store');
    Route::post('assets/{asset}/maintenances', [AssetController::class, 'storeMaintenance'])->name('assets.maintenances.store');
    Route::patch('assets/{asset}/status', [AssetController::class, 'updateStatus'])->name('assets.status');
    Route::patch('assets/{asset}/dispose', [AssetController::class, 'dispose'])->name('assets.dispose');
});
