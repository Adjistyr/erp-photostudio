<?php

use Illuminate\Support\Facades\Route;
use Modules\Customer\Controllers\CustomerController;

Route::middleware(['web', 'auth', 'verified'])->group(function () {
    Route::resource('customers', CustomerController::class)->only(['index', 'store', 'update']);
});
