<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Profil publik item katalog (spek 7.1) — disiapkan untuk company profile
 * (produk terpisah). Belum ada yang membacanya dari luar app.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('catalog_items', function (Blueprint $table) {
            $table->text('description')->nullable();
            // "Tampil di company profile" — tidak memengaruhi POS/form order.
            $table->boolean('is_public')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('catalog_items', function (Blueprint $table) {
            $table->dropColumn(['description', 'is_public']);
        });
    }
};
