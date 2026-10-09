<?php

use Illuminate\Support\Facades\Route;
use Modules\Order\Controllers\InvoiceController;
use Modules\Order\Controllers\OrderController;
use Modules\Order\Controllers\OrderPaymentController;
use Modules\Order\Controllers\OrderRefundController;
use Modules\Order\Controllers\PosController;
use Modules\Order\Controllers\ReceivableController;

Route::middleware(['web', 'auth', 'verified'])->group(function () {
    Route::get('orders', [OrderController::class, 'index'])->name('orders.index');
    Route::get('orders/create', [OrderController::class, 'create'])->name('orders.create');
    Route::get('orders/calendar', [OrderController::class, 'calendar'])->name('orders.calendar');
    Route::post('orders', [OrderController::class, 'store'])->name('orders.store');
    // Setelah orders/create & orders/calendar supaya "create" tidak dibaca sebagai {order}.
    Route::get('orders/{order}/edit', [OrderController::class, 'edit'])->name('orders.edit');
    Route::put('orders/{order}', [OrderController::class, 'update'])->name('orders.update');
    Route::patch('orders/{order}/advance', [OrderController::class, 'advance'])->name('orders.advance');
    Route::patch('orders/{order}/revert', [OrderController::class, 'revert'])->name('orders.revert');
    Route::patch('orders/{order}/cancel', [OrderController::class, 'cancel'])->name('orders.cancel');
    Route::patch('orders/{order}/result-link', [OrderController::class, 'updateResultLink'])->name('orders.result-link');
    Route::post('orders/{order}/payments', [OrderPaymentController::class, 'store'])->name('orders.payments.store');
    Route::delete('orders/{order}/payments/{payment}', [OrderPaymentController::class, 'destroy'])
        ->scopeBindings()
        ->name('orders.payments.destroy');
    // Pengembalian uang (spek 4.2).
    Route::post('orders/{order}/refunds', [OrderRefundController::class, 'store'])->name('orders.refunds.store');
    Route::delete('orders/{order}/refunds/{refund}', [OrderRefundController::class, 'destroy'])
        ->scopeBindings()
        ->name('orders.refunds.destroy');

    Route::get('invoices', [InvoiceController::class, 'index'])->name('invoices.index');

    Route::get('pos', [PosController::class, 'index'])->name('pos.index');
    Route::post('pos', [PosController::class, 'store'])->name('pos.store');

    Route::get('receivables', [ReceivableController::class, 'index'])->name('receivables.index');
});

// Invoice untuk customer: tanpa login, dilindungi tanda tangan URL (signed).
Route::get('i/{order}', [InvoiceController::class, 'show'])
    ->middleware(['web', 'signed'])
    ->name('invoices.public');
