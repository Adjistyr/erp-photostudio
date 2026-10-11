<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Register aset (spek 8.1): kategori dikelola owner, kode manual, merek,
 * nomor seri, garansi, lokasi, catatan.
 *
 * Kolom `assets.category` (teks) diganti FK — satu sumber. Aset lama mendapat
 * kode lamanya (AST-01 …) supaya label/stiker yang sudah dipakai tetap cocok.
 */
return new class extends Migration
{
    /** Tujuh kategori lama (dulu konstanta Asset::CATEGORIES) + prefiks kode. */
    private const SEED = [
        ['Kamera', 'KAM', 48, 6],
        ['Lensa', 'LEN', 48, 12],
        ['Lighting', 'LGT', 48, 12],
        ['Printer', 'PRN', 36, 1],
        ['Aksesori', 'AKS', 24, null],
        ['Komputer', 'KOM', 36, 12],
        ['Properti & furnitur', 'PRP', 36, null],
    ];

    public function up(): void
    {
        Schema::create('asset_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique();
            $table->string('code_prefix', 6)->unique();
            // Default untuk aset BARU saja — mengubahnya tidak menyentuh aset lama.
            $table->unsignedSmallInteger('useful_life_months');
            $table->unsignedSmallInteger('maintenance_interval_months')->nullable();
            $table->unsignedInteger('position');
            $table->timestamps();
        });

        $now = now();
        foreach (self::SEED as $i => [$name, $prefix, $life, $interval]) {
            DB::table('asset_categories')->insert([
                'name' => $name, 'code_prefix' => $prefix, 'useful_life_months' => $life,
                'maintenance_interval_months' => $interval, 'position' => $i + 1,
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }

        Schema::table('assets', function (Blueprint $table) {
            $table->foreignId('asset_category_id')->nullable()->after('name')->constrained()->restrictOnDelete();
            $table->string('code', 30)->nullable()->unique()->after('id');
            $table->string('brand', 100)->nullable()->after('asset_category_id');
            $table->string('serial_number')->nullable();
            $table->date('warranty_until')->nullable();
            $table->string('location', 100)->nullable();
            $table->text('notes')->nullable();
        });

        // Backfill: kategori dari nama lama; nama tak dikenal → kategori baru.
        foreach (DB::table('assets')->orderBy('id')->get(['id', 'category']) as $row) {
            $categoryId = DB::table('asset_categories')->where('name', $row->category)->value('id')
                ?? DB::table('asset_categories')->insertGetId([
                    'name' => $row->category,
                    'code_prefix' => 'K'.(DB::table('asset_categories')->count() + 1),
                    'useful_life_months' => 36, 'maintenance_interval_months' => null,
                    'position' => DB::table('asset_categories')->max('position') + 1,
                    'created_at' => $now, 'updated_at' => $now,
                ]);
            DB::table('assets')->where('id', $row->id)->update([
                'asset_category_id' => $categoryId,
                'code' => sprintf('AST-%02d', $row->id),
            ]);
        }

        Schema::table('assets', function (Blueprint $table) {
            $table->dropColumn('category');
        });
        Schema::table('assets', function (Blueprint $table) {
            $table->foreignId('asset_category_id')->nullable(false)->change();
            $table->string('code', 30)->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->string('category')->nullable();
        });
        foreach (DB::table('assets')->get(['id', 'asset_category_id']) as $row) {
            DB::table('assets')->where('id', $row->id)->update([
                'category' => DB::table('asset_categories')->where('id', $row->asset_category_id)->value('name'),
            ]);
        }
        Schema::table('assets', function (Blueprint $table) {
            $table->string('category')->nullable(false)->change();
            $table->dropConstrainedForeignId('asset_category_id');
            $table->dropUnique(['code']);
            $table->dropColumn(['code', 'brand', 'serial_number', 'warranty_until', 'location', 'notes']);
        });
        Schema::dropIfExists('asset_categories');
    }
};
