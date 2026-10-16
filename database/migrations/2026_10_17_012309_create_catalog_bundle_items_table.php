<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bundel katalog (spek 6.3): paket jasa berisi produk fisik ("Paket Studio
 * 1 Jam termasuk 5 cetak 4R"). HPP paket dihitung dari komponen SAAT
 * transaksi lalu disalin ke `order_items.unit_cost` — katalog tidak
 * menyimpannya. `order_items.components` = snapshot komponen saat itu.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalog_bundle_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bundle_id')->constrained('catalog_items')->cascadeOnDelete();
            // Produk yang menjadi komponen tidak boleh terhapus diam-diam dari paket.
            $table->foreignId('component_id')->constrained('catalog_items')->restrictOnDelete();
            $table->unsignedInteger('quantity');

            $table->unique(['bundle_id', 'component_id']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            // [{name, quantity, unit_cost}] per 1 paket; null = bukan paket berkomponen.
            $table->json('components')->nullable()->after('unit_cost');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('components');
        });
        Schema::dropIfExists('catalog_bundle_items');
    }
};
