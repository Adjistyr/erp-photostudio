<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Foto alat & nota/garansi aset (spek 8.2). File di disk `local` (privat) —
 * nota memuat harga & data pribadi, dibuka lewat route ber-auth.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_photos', function (Blueprint $table) {
            $table->id();
            // Aset tidak pernah dihapus (dilepas) — cascade hanya pengaman.
            $table->foreignId('asset_id')->constrained()->cascadeOnDelete();
            $table->string('kind'); // AssetPhotoKind: item | receipt
            $table->string('path');
            $table->string('thumb_path')->nullable(); // null untuk PDF
            $table->string('mime', 100);
            $table->string('original_name');
            $table->integer('position');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['asset_id', 'kind', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_photos');
    }
};
