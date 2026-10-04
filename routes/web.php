<?php

use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;

// Dashboard internal — "/" tidak punya landing page. Website company profile
// (Paket A) berjalan di domain/subdomain sendiri. Tamu otomatis diarahkan ke
// login oleh middleware auth di dashboard.
Route::get('/', fn () => to_route('dashboard'))->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    // Rute per domain ada di Modules/<Modul>/Routes/web.php, dimuat provider modulnya.
});

require __DIR__.'/settings.php';
