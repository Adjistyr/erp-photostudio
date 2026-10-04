<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Konvensi seluruh tabel bisnis (docs/database.md):
 * - Uang: bigInteger rupiah utuh, tanpa desimal (R5).
 * - Tanggal transaksi/jadwal: kolom `date`, bukan timestamp — tanggal
 *   kalender tidak boleh bergeser karena konversi zona waktu.
 * - Enum disimpan sebagai string + cast PHP enum, bukan enum database:
 *   status & kategori masih akan berubah di bisnis yang baru berjalan, dan
 *   mengubah enum database butuh migration.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalog_items', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type'); // CatalogItemType
            $table->bigInteger('price');
            // Null untuk jasa — HPP jasa bukan 0, tapi tidak tetap (dicatat per job).
            $table->bigInteger('unit_cost')->nullable();
            $table->string('category');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catalog_items');
    }
};
