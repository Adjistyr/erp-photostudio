<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Riwayat perubahan order (docs/specs/0.2-order-events.md): siapa mengubah
 * apa, kapan, dari apa ke apa. Tidak pernah diedit/dihapus oleh app.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            // Null = tanpa sesi (seeder) atau user sudah dihapus — event tetap ada.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type'); // OrderEventType
            // Hanya field yang berubah: {field: {from, to}}. Null untuk tipe tanpa rincian.
            // jsonb, bukan json: PostgreSQL bisa query changes->>'work_status' kalau perlu.
            $table->jsonb('changes')->nullable();
            // Tanpa updated_at: event tidak pernah diubah.
            $table->timestamp('created_at');

            $table->index(['order_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_events');
    }
};
