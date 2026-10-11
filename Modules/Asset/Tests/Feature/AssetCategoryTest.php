<?php

namespace Modules\Asset\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Asset\Models\Asset;
use Modules\Asset\Models\AssetCategory;
use Tests\TestCase;

/** Kategori aset dikelola owner (spek 8.1). */
class AssetCategoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->actingAs(User::factory()->create());
    }

    private function category(string $name): AssetCategory
    {
        return AssetCategory::where('name', $name)->sole();
    }

    public function test_index_lists_seeded_categories_with_usage_and_next_code()
    {
        $this->get(route('asset-categories.index'))->assertInertia(fn (Assert $page) => $page
            ->component('asset::categories')
            ->has('categories', 7)
            ->where('categories.0.name', 'Kamera')
            ->where('categories.0.assets_count', 1)
            ->where('categories.0.next_code', 'KAM-002')
            ->where('categories.4.name', 'Aksesori')
            ->where('categories.4.assets_count', 3));
    }

    public function test_store_normalises_prefix_and_appends_position()
    {
        $this->post(route('asset-categories.store'), ['name' => ' Drone ', 'code_prefix' => 'drn', 'useful_life_months' => 36, 'maintenance_interval_months' => 6])
            ->assertSessionHasNoErrors();

        $drone = $this->category('Drone');
        $this->assertSame(['DRN', 36, 6, 8], [$drone->code_prefix, $drone->useful_life_months, $drone->maintenance_interval_months, $drone->position]);
        $this->assertSame('DRN-001', $drone->nextCode());
    }

    public function test_name_and_prefix_must_be_unique_and_valid()
    {
        $this->post(route('asset-categories.store'), ['name' => 'Kamera', 'code_prefix' => 'kam', 'useful_life_months' => 0])
            ->assertSessionHasErrors(['name', 'code_prefix', 'useful_life_months']);
        $this->post(route('asset-categories.store'), ['name' => 'Gimbal', 'code_prefix' => 'G', 'useful_life_months' => 24])
            ->assertSessionHasErrors(['code_prefix' => 'Prefiks 2–6 huruf/angka, mis. KAM.']);

        // Ubah diri sendiri tanpa ganti nama/prefiks tetap lolos.
        $kamera = $this->category('Kamera');
        $this->put(route('asset-categories.update', $kamera), ['name' => 'Kamera', 'code_prefix' => 'KAM', 'useful_life_months' => 60])
            ->assertSessionHasNoErrors();
    }

    public function test_changing_defaults_does_not_touch_existing_assets()
    {
        $kamera = $this->category('Kamera');
        $asset = Asset::where('name', 'Kamera mirrorless')->sole();

        $this->put(route('asset-categories.update', $kamera), ['name' => 'Kamera & body', 'code_prefix' => 'KAM', 'useful_life_months' => 60, 'maintenance_interval_months' => 3])
            ->assertSessionHasNoErrors();

        $asset->refresh();
        $this->assertSame([48, 6], [$asset->useful_life_months, $asset->maintenance_interval_months]);
        $this->assertSame('Kamera & body', $asset->category->name);
    }

    public function test_category_in_use_cannot_be_deleted()
    {
        $this->delete(route('asset-categories.destroy', $this->category('Kamera')))
            ->assertSessionHasErrors(['delete' => 'Masih dipakai 1 aset — pindahkan asetnya ke kategori lain dulu.']);
        $this->assertNotNull(AssetCategory::where('name', 'Kamera')->first());

        $this->delete(route('asset-categories.destroy', $this->category('Komputer')))->assertSessionHasNoErrors();
        $this->assertNull(AssetCategory::where('name', 'Komputer')->first());
    }

    public function test_guest_is_redirected()
    {
        auth()->logout();
        $this->get(route('asset-categories.index'))->assertRedirect(route('login'));
    }
}
