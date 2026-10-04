<?php

use Illuminate\Support\Facades\Route;
use Modules\Expense\Controllers\ExpenseController;

Route::middleware(['web', 'auth', 'verified'])->group(function () {
    Route::get('expenses', [ExpenseController::class, 'index'])->name('expenses.index');
    Route::post('expenses/job-costs', [ExpenseController::class, 'storeJobCost'])->name('expenses.job-costs.store');
    Route::post('expenses/operating', [ExpenseController::class, 'storeOperatingExpense'])->name('expenses.operating.store');
});
