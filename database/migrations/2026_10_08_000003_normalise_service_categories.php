<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Normalisasi huruf/spasi kategori jasa ke nilai ServiceCategory (spek 1.1,
 * keputusan K2): "studio" → "Studio", "add on" → "Add-on". Kategori yang tidak
 * cocok (mis. "Wedding") DIBIARKAN — ditandai di Katalog, owner memperbaiki
 * manual; pemetaan tebakan bisa salah tanpa terlihat.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            UPDATE catalog_items
            SET category = CASE lower(trim(category))
                WHEN 'studio' THEN 'Studio'
                WHEN 'event' THEN 'Event'
                WHEN 'add-on' THEN 'Add-on'
                WHEN 'addon' THEN 'Add-on'
                WHEN 'add on' THEN 'Add-on'
            END
            WHERE type = 'service'
              AND lower(trim(category)) IN ('studio', 'event', 'add-on', 'addon', 'add on')
        SQL);
    }

    /** Normalisasi huruf tidak perlu dibalik. */
    public function down(): void {}
};
