<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pengembalian uang ke customer (spek 4.2, keputusan K3): uang KELUAR pada
 * hari pengembalian — basis kas. Pembayaran asli tidak disentuh, jadi bulan
 * yang sudah tutup buku tetap utuh.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('refunds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->restrictOnDelete();
            $table->date('refunded_on'); // tanggal uang keluar — basis kas
            $table->bigInteger('amount');
            $table->string('method'); // PaymentMethod — dari kas mana uang keluar
            $table->string('reason');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('refunded_on');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('refunds');
    }
};
