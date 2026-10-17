<?php

use Illuminate\Support\Facades\Route;
use Modules\Expense\Controllers\ExpenseController;

Route::middleware(['web', 'auth', 'verified'])->group(function () {
    Route::get('expenses', [ExpenseController::class, 'index'])->name('expenses.index');
    Route::post('expenses/job-costs', [ExpenseController::class, 'storeJobCost'])->name('expenses.job-costs.store');
    // Biaya operasional = kas usaha, hanya owner; admin mencatat biaya job (spek 5.1).
    Route::post('expenses/operating', [ExpenseController::class, 'storeOperatingExpense'])
        ->middleware('can:record-operating-expense')
        ->name('expenses.operating.store');
    Route::middleware('can:delete-money')->group(function () {
        Route::delete('expenses/job-costs/{jobCost}', [ExpenseController::class, 'destroyJobCost'])->name('expenses.job-costs.destroy');
        Route::delete('expenses/operating/{operatingExpense}', [ExpenseController::class, 'destroyOperatingExpense'])->name('expenses.operating.destroy');
    });
});
