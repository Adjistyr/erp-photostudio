<?php

namespace Tests\Feature\Finance;

use App\Enums\AssetStatus;
use App\Enums\Fund;
use App\Enums\MaintenanceType;
use App\Models\Asset;
use App\Models\AssetMaintenance as MaintenanceRecord;
use App\Models\Investment;
use App\Services\Finance\AssetMaintenance;
use App\Services\Finance\Funds;
use App\Services\Finance\ProfitAndLoss;

/** Porting web/app/lib/aset.test.ts. */
class AssetMaintenanceTest extends DemoDataTestCase
{
    private function svc(): AssetMaintenance
    {
        return app(AssetMaintenance::class);
    }

    private function asset(string $name): Asset
    {
        return Asset::where('name', $name)->firstOrFail();
    }

    public function test_allocation_computed_from_assets_790_450()
    {
        $this->assertSame(790_450, $this->svc()->allocationForMonth('2026-07'));
        $this->assertSame(790_450, $this->svc()->allocationForMonth('2026-08'));
        $this->assertSame(790_450, app(ProfitAndLoss::class)->forMonth('2026-08')->maintenanceAllocation);
    }

    public function test_units_are_multiplied_sheet_bug_cannot_recur()
    {
        // Sheet client: harga × 5% tanpa unit = Rp 693.100.
        $withoutUnits = Asset::all()->sum(fn (Asset $a) => (int) round($a->unit_price * $a->maintenance_percent / 100));

        $this->assertSame(693_100, $withoutUnits);
        $this->assertSame(97_350, $this->svc()->allocationForMonth('2026-08') - $withoutUnits);
        $this->assertSame(12_000, $this->svc()->allocationFor($this->asset('Baterai kamera'), '2026-08'));
    }

    public function test_no_allocation_before_purchase()
    {
        $this->assertSame(0, $this->svc()->allocationForMonth('2026-06'));
    }

    public function test_new_asset_does_not_change_past_months()
    {
        Asset::create([
            'name' => 'Lensa 50mm', 'category' => 'Lensa', 'units' => 1, 'unit_price' => 2_000_000,
            'purchased_on' => '2026-09-05', 'maintenance_percent' => 5, 'useful_life_months' => 48,
            'maintenance_interval_months' => 12, 'status' => AssetStatus::Active,
        ]);

        $this->assertSame(790_450, $this->svc()->allocationForMonth('2026-08'));
        $this->assertSame(790_450 + 100_000, $this->svc()->allocationForMonth('2026-09'));
    }

    public function test_disposed_asset_stops_being_allocated()
    {
        $this->asset('Lighting studio')->update(['status' => AssetStatus::Disposed, 'disposed_on' => '2026-08-20', 'disposal_reason' => 'Dijual', 'sale_price' => 1_500_000]);

        // 2 × 1.350.000 × 5% = 135.000 hilang dari Agustus; Juli tidak berubah.
        $this->assertSame(790_450 - 135_000, $this->svc()->allocationForMonth('2026-08'));
        $this->assertSame(790_450, $this->svc()->allocationForMonth('2026-07'));
    }

    public function test_broken_asset_still_allocated()
    {
        $this->asset('Lighting studio')->update(['status' => AssetStatus::Broken]);

        $this->assertSame(790_450, $this->svc()->allocationForMonth('2026-08'));
    }

    public function test_book_value_straight_line_per_month_owned()
    {
        // Dibeli Juli, sekarang Agustus = 2 bulan terpakai.
        $this->assertSame(6_708_333, $this->svc()->bookValue($this->asset('Kamera mirrorless'))); // 7.000.000 × 46/48
        $this->assertSame(4_108_333, $this->svc()->bookValue($this->asset('Printer foto')));     // 4.350.000 × 34/36
    }

    public function test_book_value_never_negative_and_zero_when_disposed()
    {
        $camera = $this->asset('Kamera mirrorless');
        $camera->useful_life_months = 1;
        $this->assertSame(0, $this->svc()->bookValue($camera));

        $camera->refresh()->update(['disposed_on' => '2026-08-01', 'status' => AssetStatus::Disposed, 'disposal_reason' => 'Hilang']);
        $this->assertSame(0, $this->svc()->bookValue($camera));
    }

    public function test_next_maintenance_from_last_service_or_purchase()
    {
        // Printer: tiap 1 bulan, belum pernah dirawat → dari tanggal beli.
        $this->assertSame('2026-08-01', $this->svc()->nextMaintenance($this->asset('Printer foto'))?->toDateString());
        // Lighting: tiap 12 bulan, terakhir diservis 10 Agu.
        $this->assertSame('2027-08-10', $this->svc()->nextMaintenance($this->asset('Lighting studio'))?->toDateString());
        $this->assertNull($this->svc()->nextMaintenance($this->asset('Baterai kamera')));
    }

    public function test_due_soon_only_overdue_or_within_14_days()
    {
        $due = $this->svc()->dueSoon();

        $this->assertSame(['Printer foto'], array_map(fn ($d) => $d->asset->name, $due));
        $this->assertSame(-25, $due[0]->daysUntil);
    }

    public function test_routine_maintenance_resets_schedule_even_when_free()
    {
        $printer = $this->asset('Printer foto');
        $rowsBefore = count(app(Funds::class)->ledger(Fund::Maintenance));
        MaintenanceRecord::create(['asset_id' => $printer->id, 'performed_on' => '2026-08-26', 'type' => MaintenanceType::Routine, 'description' => 'Head cleaning', 'cost' => 0]);

        $this->assertSame('2026-09-26', $this->svc()->nextMaintenance($printer)?->toDateString());
        $this->assertSame([], $this->svc()->dueSoon());
        // Rp 0 tidak menggerakkan dana — tidak ada baris baru di mutasi.
        $this->assertCount($rowsBefore, app(Funds::class)->ledger(Fund::Maintenance));
    }

    public function test_disposed_asset_not_in_due_list()
    {
        $this->asset('Printer foto')->update(['status' => AssetStatus::Disposed, 'disposed_on' => '2026-08-20', 'disposal_reason' => 'Dijual']);

        $this->assertSame([], $this->svc()->dueSoon());
    }

    public function test_accumulated_allocation_vs_service_cost()
    {
        // Lighting: servis Rp 150.000 sudah melebihi Rp 135.000 yang
        // disisihkan untuknya (Juli) — kandidat diganti / persen terlalu kecil.
        $lighting = $this->asset('Lighting studio');

        $this->assertSame(135_000, $this->svc()->accumulated($lighting));
        $this->assertSame(150_000, (int) $lighting->maintenances()->sum('cost'));
    }

    public function test_opening_investment_equals_total_of_assets_it_bought()
    {
        $investment = Investment::firstOrFail();

        $this->assertSame($investment->amount, Asset::where('investment_id', $investment->id)->get()->sum(fn (Asset $a) => $a->purchaseTotal()));
    }
}
