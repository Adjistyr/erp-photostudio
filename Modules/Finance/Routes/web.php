<?php

use Illuminate\Support\Facades\Route;
use Modules\Finance\Controllers\ReportController;

Route::middleware(['web', 'auth', 'verified'])->group(function () {
    Route::get('reports', [ReportController::class, 'profitLoss'])->name('reports.profit-loss');
    Route::get('reports/margin', [ReportController::class, 'margin'])->name('reports.margin');
    Route::get('reports/sales', [ReportController::class, 'sales'])->name('reports.sales');
    Route::get('reports/receivables', [ReportController::class, 'receivables'])->name('reports.receivables');
});
