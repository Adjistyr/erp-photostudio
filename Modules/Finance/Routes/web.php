<?php

use Illuminate\Support\Facades\Route;
use Modules\Finance\Controllers\CapitalController;
use Modules\Finance\Controllers\ReportController;

// Seluruh modul Finance hanya untuk owner (spek 5.1): laporan, modal & bagi hasil.
Route::middleware(['web', 'auth', 'verified', 'can:view-finance'])->group(function () {
    Route::get('reports', [ReportController::class, 'profitLoss'])->name('reports.profit-loss');
    Route::get('reports/margin', [ReportController::class, 'margin'])->name('reports.margin');
    Route::get('reports/sales', [ReportController::class, 'sales'])->name('reports.sales');
    Route::get('reports/cash', [ReportController::class, 'cash'])->name('reports.cash');
    Route::get('reports/cash/export', [ReportController::class, 'cashExport'])->name('reports.cash.export');
    Route::get('reports/receivables', [ReportController::class, 'receivables'])->name('reports.receivables');

    Route::get('capital', [CapitalController::class, 'index'])->name('capital.index');
    Route::post('capital/contributions', [CapitalController::class, 'storeContribution'])->name('capital.contributions.store');
    Route::post('capital/withdrawals', [CapitalController::class, 'storeWithdrawal'])->name('capital.withdrawals.store');
    Route::delete('capital/withdrawals/{withdrawal}', [CapitalController::class, 'destroyWithdrawal'])
        ->middleware('can:delete-money')
        ->name('capital.withdrawals.destroy');
    Route::delete('capital/contributions/{contribution}', [CapitalController::class, 'destroyContribution'])
        ->middleware('can:delete-money')
        ->name('capital.contributions.destroy');
    Route::post('capital/investments', [CapitalController::class, 'storeInvestment'])->name('capital.investments.store');
    Route::post('capital/rules', [CapitalController::class, 'storeRule'])->name('capital.rules.store');
    Route::post('capital/closings', [CapitalController::class, 'closeMonth'])
        ->middleware('can:close-period')
        ->name('capital.closings.store');
    Route::post('capital/closings/{month}/reopen', [CapitalController::class, 'reopenMonth'])
        ->where('month', '\\d{4}-\\d{2}')
        ->middleware('can:close-period')
        ->name('capital.closings.reopen');
});
