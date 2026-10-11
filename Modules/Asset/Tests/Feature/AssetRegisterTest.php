<?php

namespace Modules\Asset\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Asset\Models\Asset;
use Modules\Asset\Models\AssetCategory;
use Tests\TestCase;

/** Register aset (spek 8.1): kode, identitas, edit terbatas. */
class AssetRegisterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');
        $this->actingAs(User::factory()->create());
    }

    private function categoryId(string $name): int
    {
        return AssetCategory::where('name', $name)->sole()->id;
    }

    /** @param  array<string, mixed>  $data */
    private function store(array $data = [])
    {
        return $this->post(route('assets.store'), [
            'name' => 'Lensa portrait', 'asset_category_id' => $this->categoryId('Lensa'),
            'brand' => 'Canon', 'model' => 'RF 50mm f/1.8', 'units' => 1, 'unit_price' => 1_500_000,
            'purchased_on' => '2026-08-20', 'maintenance_percent' => 5, 'useful_life_months' => 48,
            'maintenance_interval_months' => 12, 'paid_by' => null, ...$data,
        ]);
    }

    private function asset(string $name): Asset
    {
        return Asset::where('name', $name)->sole();
    }

    /** @return array<string, mixed> */
    private function identity(Asset $a, array $overrides = []): array
    {
        return [
            'name' => $a->name, 'asset_category_id' => $a->asset_category_id, 'code' => $a->code,
            'useful_life_months' => $a->useful_life_months, 'maintenance_interval_months' => $a->maintenance_interval_months,
            ...$overrides,
        ];
    }

    public function test_code_is_generated_per_category_continuing_from_highest_number()
    {
        $this->store()->assertSessionHasNoErrors();
        $this->assertSame('LEN-001', $this->asset('Lensa portrait')->code);

        // Aksesori sudah punya AKS-001..003 dari seeder; kode manual berpola lain tidak dihitung.
        $this->store(['name' => 'Gimbal', 'asset_category_id' => $this->categoryId('Aksesori'), 'code' => 'AKS-010'])->assertSessionHasNoErrors();
        $this->store(['name' => 'Tripod', 'asset_category_id' => $this->categoryId('Aksesori'), 'code' => 'TRIPOD-A'])->assertSessionHasNoErrors();
        $this->store(['name' => 'Reflektor', 'asset_category_id' => $this->categoryId('Aksesori')])->assertSessionHasNoErrors();

        $this->assertSame('AKS-011', $this->asset('Reflektor')->code);
    }

    public function test_manual_code_is_uppercased_validated_and_unique()
    {
        $this->store(['code' => ' len-a1 '])->assertSessionHasNoErrors();
        $this->assertSame('LEN-A1', $this->asset('Lensa portrait')->code);

        $this->store(['name' => 'Lain', 'code' => 'Len-A1'])->assertSessionHasErrors(['code' => 'Kode ini sudah dipakai aset lain.']);
        $this->store(['name' => 'Lain', 'code' => 'ada spasi'])->assertSessionHasErrors('code');
    }

    public function test_store_saves_identity_fields()
    {
        $this->store(['serial_number' => 'SN-1, SN-2', 'warranty_until' => '2027-08-20', 'location' => ' Lemari lensa ', 'notes' => 'Beli di Tokopedia'])
            ->assertSessionHasNoErrors();

        $a = $this->asset('Lensa portrait');
        $this->assertSame(['Canon', 'RF 50mm f/1.8', 'SN-1, SN-2', '2027-08-20', 'Lemari lensa', 'Beli di Tokopedia'],
            [$a->brand, $a->model, $a->serial_number, $a->warranty_until?->toDateString(), $a->location, $a->notes]);
        $this->assertSame('Canon RF 50mm f/1.8', $a->brandModel());
    }

    public function test_edit_changes_identity_but_ignores_financial_fields()
    {
        $kamera = $this->asset('Kamera mirrorless');

        $this->put(route('assets.update', $kamera), $this->identity($kamera, [
            'name' => 'Kamera utama', 'code' => 'cam-01', 'asset_category_id' => $this->categoryId('Lensa'),
            'brand' => 'Canon', 'model' => 'EOS M50 Mark II', 'location' => 'Tas event', 'notes' => '',
            'useful_life_months' => 60, 'maintenance_interval_months' => null,
            // Field keuangan dikirim pun diabaikan (aturan 1).
            'unit_price' => 1, 'units' => 9, 'purchased_on' => '2026-08-01', 'maintenance_percent' => 50,
        ]))->assertRedirect(route('assets.show', $kamera))->assertSessionHasNoErrors();

        $kamera->refresh();
        $this->assertSame(['Kamera utama', 'CAM-01', 'Lensa', 'EOS M50 Mark II', 'Tas event', null, 60, null],
            [$kamera->name, $kamera->code, $kamera->category->name, $kamera->model, $kamera->location, $kamera->notes, $kamera->useful_life_months, $kamera->maintenance_interval_months]);
        $this->assertSame([7_000_000, 1, '2026-07-01', 5], [$kamera->unit_price, $kamera->units, $kamera->purchased_on->toDateString(), $kamera->maintenance_percent]);
    }

    public function test_empty_code_on_edit_keeps_existing_code_and_unique_ignores_self()
    {
        $kamera = $this->asset('Kamera mirrorless');

        $this->put(route('assets.update', $kamera), $this->identity($kamera, ['code' => '']))->assertSessionHasNoErrors();
        $this->assertSame('KAM-001', $kamera->fresh()?->code);

        $this->put(route('assets.update', $kamera), $this->identity($kamera, ['code' => $this->asset('Printer foto')->code]))
            ->assertSessionHasErrors('code');
    }

    public function test_disposed_asset_identity_can_still_be_fixed()
    {
        $kamera = $this->asset('Kamera mirrorless');
        $this->patch(route('assets.dispose', $kamera), ['reason' => 'Hilang', 'disposed_on' => '2026-08-26']);

        $this->put(route('assets.update', $kamera), $this->identity($kamera->refresh(), ['serial_number' => '183052001234X']))
            ->assertSessionHasNoErrors();
        $this->assertSame('183052001234X', $kamera->fresh()?->serial_number);
    }

    public function test_form_pages_carry_choices_and_suggestions()
    {
        $this->get(route('assets.create'))->assertInertia(fn (Assert $page) => $page
            ->component('asset::form')
            ->where('asset', null)
            ->has('categories', 7)
            ->where('categories.1.next_code', 'LEN-001')
            ->where('brands', ['Canon', 'Epson', 'Godox', 'Kingma', 'SanDisk'])
            ->where('locations', ['Lemari kamera', 'Meja POS', 'Studio'])
            ->has('owners', 2));

        $kamera = $this->asset('Kamera mirrorless');
        $this->get(route('assets.edit', $kamera))->assertInertia(fn (Assert $page) => $page
            ->component('asset::form')
            ->where('asset.code', 'KAM-001')
            ->where('asset.warranty_until', '2027-07-01'));
    }

    public function test_missing_asset_is_not_found_and_guest_redirected()
    {
        $this->get(route('assets.show', 99999))->assertNotFound();
        $this->get(route('assets.edit', 99999))->assertNotFound();
        auth()->logout();
        $this->get(route('assets.create'))->assertRedirect(route('login'));
    }
}
