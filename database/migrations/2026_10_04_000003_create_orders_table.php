<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique(); // ORD-0001, dibacakan ke customer
            // Null = walk-in tanpa data customer. Bukan baris customer "Umum":
            // baris palsu ikut terhitung jumlah customer & daftar blast.
            $table->foreignId('customer_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('business_line'); // BusinessLine
            // Tanggal sesi/acara (studio, event) atau transaksi (retail), sekaligus
            // jatuh tempo tagihan. Jam terpisah karena retail tidak punya jam.
            $table->date('service_date');
            $table->time('service_time')->nullable();
            $table->string('work_status'); // WorkStatus — status bayar tidak disimpan
            $table->string('location')->nullable();
            $table->text('notes')->nullable();
            $table->string('result_link')->nullable();
            $table->bigInteger('discount')->default(0);
            $table->timestamps();

            $table->index('service_date');
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            // Null untuk item custom event yang tidak diambil dari katalog.
            $table->foreignId('catalog_item_id')->nullable()->constrained()->nullOnDelete();
            // Nama, harga, dan HPP disalin SAAT transaksi — perubahan katalog
            // belakangan tidak boleh mengubah nilai order lama.
            $table->string('name');
            $table->unsignedInteger('quantity');
            $table->bigInteger('unit_price');
            $table->bigInteger('unit_cost')->nullable();
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->restrictOnDelete();
            $table->date('paid_on');
            $table->bigInteger('amount');
            $table->string('method'); // PaymentMethod
            $table->string('note');
            $table->timestamps();

            $table->index('paid_on');
        });

        Schema::create('job_costs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->restrictOnDelete();
            $table->date('incurred_on');
            $table->string('category');
            $table->string('description');
            $table->bigInteger('amount');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_costs');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
