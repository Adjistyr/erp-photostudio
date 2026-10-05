<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Template pesan yang sudah DIEDIT owner. Template yang belum pernah diedit
 * tidak punya baris — isinya default di MessageTemplate::defaults(), supaya
 * default bisa diperbaiki lewat kode tanpa migrasi data.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('message_templates', function (Blueprint $table) {
            $table->string('key')->primary(); // promo, thank_you, reminder
            $table->text('body');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_templates');
    }
};
