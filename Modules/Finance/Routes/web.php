<?php

use Illuminate\Support\Facades\Route;
use Modules\Finance\Controllers\CapitalController;
use Modules\Finance\Controllers\ReportController;

Route::middleware(['web', 'auth', 'verified'])->group(function () {
    Route::get('reports', [ReportController::class, 'profitLoss'])->name('reports.profit-loss');
    Route::get('reports/margin', [ReportController::class, 'margin'])->name('reports.margin');
    Route::get('reports/sales', [ReportController::class, 'sales'])->name('reports.sales');
    Route::get('reports/receivables', [ReportController::class, 'receivables'])->name('reports.receivables');

    Route::get('capital', [CapitalController::class, 'index'])->name('capital.index');
    Route::post('capital/contributions', [CapitalController::class, 'storeContribution'])->name('capital.contributions.store');
    Route::post('capital/withdrawals', [CapitalController::class, 'storeWithdrawal'])->name('capital.withdrawals.store');
    Route::post('capital/investments', [CapitalController::class, 'storeInvestment'])->name('capital.investments.store');
    Route::post('capital/rules', [CapitalController::class, 'storeRule'])->name('capital.rules.store');
});
