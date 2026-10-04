<?php

use App\Http\Controllers\CatalogItemController;
use Illuminate\Support\Facades\Route;

// Dashboard internal — "/" tidak punya landing page. Website company profile
// (Paket A) berjalan di domain/subdomain sendiri. Tamu otomatis diarahkan ke
// login oleh middleware auth di dashboard.
Route::get('/', fn () => to_route('dashboard'))->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::resource('catalog', CatalogItemController::class)
        ->only(['index', 'store', 'update'])
        ->parameters(['catalog' => 'catalogItem']);
    Route::patch('catalog/{catalogItem}/toggle-active', [CatalogItemController::class, 'toggleActive'])
        ->name('catalog.toggle-active');
});

require __DIR__.'/settings.php';
