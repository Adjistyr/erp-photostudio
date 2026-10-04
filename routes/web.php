<?php

use App\Http\Controllers\CatalogItemController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\OrderPaymentController;
use Illuminate\Support\Facades\Route;

// Dashboard internal — "/" tidak punya landing page. Website company profile
// (Paket A) berjalan di domain/subdomain sendiri. Tamu otomatis diarahkan ke
// login oleh middleware auth di dashboard.
Route::get('/', fn () => to_route('dashboard'))->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::get('orders', [OrderController::class, 'index'])->name('orders.index');
    Route::patch('orders/{order}/advance', [OrderController::class, 'advance'])->name('orders.advance');
    Route::patch('orders/{order}/cancel', [OrderController::class, 'cancel'])->name('orders.cancel');
    Route::patch('orders/{order}/result-link', [OrderController::class, 'updateResultLink'])->name('orders.result-link');
    Route::post('orders/{order}/payments', [OrderPaymentController::class, 'store'])->name('orders.payments.store');

    Route::resource('customers', CustomerController::class)->only(['index', 'store', 'update']);

    Route::resource('catalog', CatalogItemController::class)
        ->only(['index', 'store', 'update'])
        ->parameters(['catalog' => 'catalogItem']);
    Route::patch('catalog/{catalogItem}/toggle-active', [CatalogItemController::class, 'toggleActive'])
        ->name('catalog.toggle-active');
});

require __DIR__.'/settings.php';
