<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Estimasi biaya job per jasa (fee crew, transport, sewa) — diisi di katalog,
 * disalin ke `order_items.estimated_cost` saat transaksi (snapshot, sama
 * dengan harga). Hanya untuk estimasi margin order sebelum biaya job aktual
 * dicatat; TIDAK masuk Laba Rugi basis kas.
 *
 * Kolom terpisah, bukan `unit_cost`: `unit_cost` adalah HPP bahan aktual yang
 * diakui di Laba Rugi, dan estimasi di sana akan mengubah angka bulan yang
 * sudah tutup buku begitu biaya job aktual dicatat belakangan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('catalog_items', function (Blueprint $table) {
            // Per 1 unit jasa; null = tidak diestimasi. Produk selalu null.
            $table->bigInteger('estimated_cost')->nullable()->after('unit_cost');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->bigInteger('estimated_cost')->nullable()->after('unit_cost');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('estimated_cost');
        });
        Schema::table('catalog_items', function (Blueprint $table) {
            $table->dropColumn('estimated_cost');
        });
    }
};
