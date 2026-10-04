<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('category');
            $table->string('model')->nullable(); // merek/model, mis. Canon EOS M50
            // Satu baris = satu jenis alat dengan jumlah unit (baterai × 2).
            $table->unsignedInteger('units');
            $table->bigInteger('unit_price');
            $table->date('purchased_on');
            $table->unsignedTinyInteger('maintenance_percent');
            $table->unsignedSmallInteger('useful_life_months'); // hanya untuk nilai buku
            $table->unsignedSmallInteger('maintenance_interval_months')->nullable();
            $table->string('status'); // AssetStatus
            // Aset dilepas, tidak dihapus: menghapus mengubah alokasi bulan-bulan
            // saat aset masih dimiliki dan menghilangkan riwayat servisnya.
            $table->date('disposed_on')->nullable();
            $table->string('disposal_reason')->nullable();
            $table->bigInteger('sale_price')->nullable();
            $table->foreignId('investment_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('asset_maintenances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained()->restrictOnDelete();
            $table->date('performed_on');
            $table->string('type'); // MaintenanceType
            $table->string('description');
            // Boleh 0: perawatan dikerjakan sendiri tetap mereset jadwal.
            $table->bigInteger('cost')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_maintenances');
        Schema::dropIfExists('assets');
    }
};
