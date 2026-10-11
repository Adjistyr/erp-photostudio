<?php

namespace Modules\Asset\Tests\Feature;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** Backfill migrasi register aset (spek 8.1). */
class AssetRegisterMigrationTest extends TestCase
{
    use RefreshDatabase;

    private function migration(): Migration
    {
        /** @var Migration $m */
        $m = require base_path('database/migrations/2026_10_11_000001_asset_register.php');

        return $m;
    }

    public function test_backfills_category_and_keeps_old_code()
    {
        $m = $this->migration();
        $m->down();
        $base = ['units' => 1, 'unit_price' => 1_000_000, 'purchased_on' => '2026-07-01', 'maintenance_percent' => 5,
            'useful_life_months' => 48, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()];
        $lensa = DB::table('assets')->insertGetId(['name' => 'Lensa', 'category' => 'Lensa', 'model' => 'Canon RF 50mm', ...$base]);
        $drone = DB::table('assets')->insertGetId(['name' => 'Drone', 'category' => 'Drone', ...$base]);

        $m->up();

        $row = fn (int $id) => DB::table('assets')->join('asset_categories', 'asset_categories.id', '=', 'assets.asset_category_id')
            ->where('assets.id', $id)->first(['assets.code', 'assets.model', 'assets.brand', 'asset_categories.name']);
        $this->assertSame([sprintf('AST-%02d', $lensa), 'Canon RF 50mm', null, 'Lensa'], array_values((array) $row($lensa)));
        // Kategori tak dikenal dibuat, bukan dibuang.
        $this->assertSame('Drone', $row($drone)->name);
        $this->assertSame(8, DB::table('asset_categories')->count());
    }
}
