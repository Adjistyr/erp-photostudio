<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Galeri foto item katalog (spek 7.1). File di disk `public`; baris ini hanya
 * menyimpan path dan urutan. Sampul = `position` terkecil.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalog_item_photos', function (Blueprint $table) {
            $table->id();
            // Item katalog tidak pernah dihapus (dinonaktifkan) — cascade hanya pengaman.
            $table->foreignId('catalog_item_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->string('thumb_path');
            $table->integer('position');
            $table->timestamps();

            $table->index(['catalog_item_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catalog_item_photos');
    }
};
