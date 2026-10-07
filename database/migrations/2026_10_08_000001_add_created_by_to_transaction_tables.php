<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Siapa yang mencatat (docs/specs/0.1-created-by.md). Baris lama tetap null =
 * sebelum pencatatan; user dihapus → null, catatannya tetap ada.
 */
return new class extends Migration
{
    private const TABLES = [
        'orders', 'payments', 'job_costs', 'operating_expenses',
        'assets', 'asset_maintenances',
        'owner_contributions', 'fund_withdrawals', 'investments',
    ];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropConstrainedForeignId('created_by');
            });
        }
    }
};
