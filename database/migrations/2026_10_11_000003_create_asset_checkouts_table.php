<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Peminjaman alat ke event (spek 8.4): siapa membawa, untuk order mana,
 * kapan kembali. Bukan catatan uang.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_checkouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained()->restrictOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->restrictOnDelete();
            $table->unsignedInteger('quantity');
            // Teks bebas sampai ada data crew/staf (5.1).
            $table->string('holder', 100);
            $table->date('checked_out_on');
            $table->date('due_back_on')->nullable();
            $table->date('returned_on')->nullable(); // null = belum kembali
            $table->string('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['asset_id', 'returned_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_checkouts');
    }
};
