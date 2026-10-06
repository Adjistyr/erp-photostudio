<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tutup buku per bulan (keputusan owner 2026-10-06). Bulan "final" = sudah
 * ditutup owner, bukan sekadar sudah lewat kalender — transaksi tanggal 30
 * yang baru dicatat tanggal 2 masih bisa masuk sebelum tutup buku.
 *
 * Buka kembali TIDAK menghapus baris: `reopened_*` diisi, supaya tercatat
 * siapa membuka bulan yang sudah final dan kapan. Tutup lagi = baris baru.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('period_closings', function (Blueprint $table) {
            $table->id();
            $table->string('month', 7); // "YYYY-MM"
            $table->timestamp('closed_at');
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reopened_at')->nullable();
            $table->foreignId('reopened_by')->nullable()->constrained('users')->nullOnDelete();

            $table->index(['month', 'reopened_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('period_closings');
    }
};
