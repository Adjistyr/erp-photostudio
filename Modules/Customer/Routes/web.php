<?php

use Illuminate\Support\Facades\Route;
use Modules\Customer\Controllers\CommunicationController;
use Modules\Customer\Controllers\CustomerController;

Route::middleware(['web', 'auth', 'verified'])->group(function () {
    Route::resource('customers', CustomerController::class)->only(['index', 'store', 'update']);

    Route::get('communication', [CommunicationController::class, 'index'])->name('communication.index');
    // Admin membaca & mengirim template, mengubahnya hanya owner (spek 5.1).
    Route::put('communication/templates/{key}', [CommunicationController::class, 'updateTemplate'])
        ->middleware('can:manage-templates')
        ->name('communication.templates.update');
    Route::post('communication/email', [CommunicationController::class, 'sendEmail'])->name('communication.email.send');
});
