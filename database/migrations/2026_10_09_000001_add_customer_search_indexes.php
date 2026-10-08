<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Index pencarian customer (spek 3.1). Expression index PostgreSQL — Blueprint
 * tidak mendukung ekspresi. Tanpa pg_trgm/full-text: tiga kolom pendek dengan
 * LIKE '%q%' pada ribuan baris masih cepat, dan ekstensi butuh hak superuser
 * di hosting yang belum diputuskan.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE INDEX customers_name_lower_idx ON customers (LOWER(name))');
        DB::statement('CREATE INDEX customers_phone_idx ON customers (phone)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS customers_name_lower_idx');
        DB::statement('DROP INDEX IF EXISTS customers_phone_idx');
    }
};
