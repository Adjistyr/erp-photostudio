<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Termin pembayaran per order event (spek 6.4): "DP saat booking – 50% H-7 –
 * pelunasan H-1". Rencana tagihan, bukan catatan uang — boleh diganti utuh
 * lewat Ubah Order. Status termin TIDAK disimpan: diturunkan FIFO dari
 * pembayaran (Order::scheduleStatuses()).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('sequence'); // 1..n, urut due_on
            $table->date('due_on');
            $table->bigInteger('amount');
            $table->string('label', 50)->nullable(); // "DP", "Termin 2", "Pelunasan"
            $table->timestamps();

            $table->unique(['order_id', 'sequence']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_schedules');
    }
};
