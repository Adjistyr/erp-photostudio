<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Varian produk (spek 7.3): satu item katalog, beberapa pilihan dengan harga
 * & HPP sendiri. Varian tidak dihapus — dirujuk baris order lama.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalog_item_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('catalog_item_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->bigInteger('price');
            $table->bigInteger('unit_cost');
            // Foto dari galeri item; foto dihapus → varian kembali ke sampul item.
            $table->foreignId('catalog_item_photo_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->integer('position');
            $table->timestamps();

            $table->index(['catalog_item_id', 'position']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            // Snapshot nama/harga/HPP tetap di baris order; FK ini untuk laporan per varian.
            $table->foreignId('catalog_item_variant_id')->nullable()->after('catalog_item_id')
                ->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('catalog_item_variant_id');
        });
        Schema::dropIfExists('catalog_item_variants');
    }
};
