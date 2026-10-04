<?php

use Illuminate\Support\Facades\Route;
use Modules\Order\Controllers\OrderController;
use Modules\Order\Controllers\OrderPaymentController;

Route::middleware(['web', 'auth', 'verified'])->group(function () {
    Route::get('orders', [OrderController::class, 'index'])->name('orders.index');
    Route::get('orders/create', [OrderController::class, 'create'])->name('orders.create');
    Route::get('orders/calendar', [OrderController::class, 'calendar'])->name('orders.calendar');
    Route::post('orders', [OrderController::class, 'store'])->name('orders.store');
    Route::patch('orders/{order}/advance', [OrderController::class, 'advance'])->name('orders.advance');
    Route::patch('orders/{order}/cancel', [OrderController::class, 'cancel'])->name('orders.cancel');
    Route::patch('orders/{order}/result-link', [OrderController::class, 'updateResultLink'])->name('orders.result-link');
    Route::post('orders/{order}/payments', [OrderPaymentController::class, 'store'])->name('orders.payments.store');
});
