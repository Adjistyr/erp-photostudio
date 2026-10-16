<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Riwayat harga katalog (spek 6.5): satu baris tiap harga/HPP berubah, diisi
 * observer di CatalogItem. Append-only — tidak ada updated_at.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalog_price_changes', function (Blueprint $table) {
            $table->id();
            // Item katalog tidak pernah dihapus di app (hanya nonaktif) → cascade aman.
            $table->foreignId('catalog_item_id')->constrained()->cascadeOnDelete();
            $table->bigInteger('price');
            $table->bigInteger('unit_cost')->nullable();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->nullable();

            $table->index(['catalog_item_id', 'created_at']);
        });

        // Titik awal untuk item yang sudah ada: harga saat ini, berlaku sejak
        // item dibuat. Harga sebelum migrasi ini tidak bisa direkonstruksi.
        DB::table('catalog_price_changes')->insertUsing(
            ['catalog_item_id', 'price', 'unit_cost', 'created_at'],
            DB::table('catalog_items')->select(['id', 'price', 'unit_cost', DB::raw('coalesce(created_at, current_timestamp)')]),
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('catalog_price_changes');
    }
};
