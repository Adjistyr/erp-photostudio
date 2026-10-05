<?php

namespace Modules\Asset\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Asset\Enums\AssetStatus;
use Modules\Asset\Models\Asset;
use Modules\Finance\Enums\ContributionDestination;
use Modules\Finance\Enums\ContributionKind;
use Modules\Finance\Enums\Fund;
use Modules\Finance\Models\Investment;
use Modules\Finance\Models\Owner;
use Modules\Finance\Models\OwnerContribution;
use Modules\Finance\Services\AssetMaintenance;
use Modules\Finance\Services\Funds;
use Tests\TestCase;

/** Aset & Maintenance (business-flow 8.9) — satu-satunya pintu menambah aset. */
class AssetsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');
        $this->actingAs(User::factory()->create());
    }

    private function asset(string $name): Asset
    {
        return Asset::where('name', $name)->sole();
    }

    private function balance(): int
    {
        return app(Funds::class)->balance(Fund::Maintenance);
    }

    /** @param  array<string, mixed>  $data */
    private function store(array $data = [])
    {
        return $this->post(route('assets.store'), [
            'name' => 'Lensa portrait',
            'category' => 'Lensa',
            'model' => 'Canon RF 50mm',
            'units' => 2,
            'unit_price' => 1_500_000,
            'purchased_on' => '2026-08-20',
            'maintenance_percent' => 5,
            'useful_life_months' => 48,
            'maintenance_interval_months' => 12,
            'paid_by' => null,
            ...$data,
        ]);
    }

    public function test_guest_is_redirected_to_login()
    {
        auth()->logout();

        $this->get(route('assets.index'))->assertRedirect(route('login'));
    }

    public function test_index_summary_matches_finance_services()
    {
        $this->get(route('assets.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('asset::index')
                ->has('assets', 6)
                // Kode dari id (sequence PostgreSQL tidak di-reset antar test).
                ->where('assets.0.code', sprintf('AST-%02d', $this->asset('Kamera mirrorless')->id))
                ->where('assets.0.funded_by', 'Modal Agung')
                ->where('summary.units', 9)
                ->where('summary.kinds', 6)
                ->where('summary.purchase_value', 15_809_000)
                // Sheet client salah Rp 693.100 karena lupa mengalikan unit.
                ->where('summary.allocation', 790_450)
                ->has('due', 1)
                ->where('due.0.name', 'Printer foto')
                ->where('due.0.days_until', -25)
                ->where('maintenance_balance', $this->balance())
                ->has('owners', 2)
                ->has('categories', 7)
            );
    }

    public function test_store_paid_from_cash_records_investment_without_contribution()
    {
        $contributions = OwnerContribution::count();

        $this->store()->assertRedirect(route('assets.index'))->assertSessionHasNoErrors();

        $asset = $this->asset('Lensa portrait');
        $this->assertSame(AssetStatus::Active, $asset->status);
        $this->assertSame(3_000_000, $asset->investment?->amount);
        $this->assertSame('Lensa portrait × 2', $asset->investment?->description);
        $this->assertNull($asset->investment?->owner_contribution_id);
        $this->assertSame($contributions, OwnerContribution::count());
        // 3 jt × 5% = 150 rb mulai bulan beli.
        $this->assertSame(790_450 + 150_000, app(AssetMaintenance::class)->allocationForMonth('2026-08'));
        $this->assertSame(790_450, app(AssetMaintenance::class)->allocationForMonth('2026-07'));
    }

    public function test_store_paid_by_owner_records_equity_contribution()
    {
        $raka = Owner::where('name', 'Raka')->sole();

        $this->store(['paid_by' => $raka->id])->assertSessionHasNoErrors();

        $contribution = $this->asset('Lensa portrait')->investment?->contribution;
        $this->assertSame($raka->id, $contribution?->owner_id);
        $this->assertSame(3_000_000, $contribution?->amount);
        $this->assertSame(ContributionKind::Equity, $contribution?->kind);
        $this->assertSame(ContributionDestination::Investment, $contribution?->destination);
    }

    public function test_store_validation()
    {
        $investments = Investment::count();

        $this->store([
            'name' => ' ', 'category' => 'Drone', 'units' => 0, 'unit_price' => 0,
            'purchased_on' => '2026-08-27', 'maintenance_percent' => 101,
            'useful_life_months' => 0, 'maintenance_interval_months' => 0, 'paid_by' => 999,
        ])->assertSessionHasErrors([
            'name', 'category', 'units', 'unit_price', 'purchased_on',
            'maintenance_percent', 'useful_life_months', 'maintenance_interval_months', 'paid_by',
        ]);

        $this->assertSame($investments, Investment::count());
        $this->assertSame(6, Asset::count());
    }

    public function test_service_comes_out_of_maintenance_fund_and_resets_schedule()
    {
        $printer = $this->asset('Printer foto');
        $before = $this->balance();

        $this->post(route('assets.maintenances.store', $printer), [
            'type' => 'routine', 'description' => 'Head cleaning', 'performed_on' => '2026-08-26', 'cost' => 50_000,
        ])->assertRedirect(route('assets.index'))->assertSessionHasNoErrors();

        $this->assertSame($before - 50_000, $this->balance());
        $this->assertSame([], app(AssetMaintenance::class)->dueSoon());
    }

    public function test_free_service_allowed_and_cost_above_balance_rejected()
    {
        $printer = $this->asset('Printer foto');
        $payload = ['type' => 'routine', 'description' => 'Dibersihkan sendiri', 'performed_on' => '2026-08-26'];

        $this->post(route('assets.maintenances.store', $printer), [...$payload, 'cost' => 0])->assertSessionHasNoErrors();
        $this->post(route('assets.maintenances.store', $printer), [...$payload, 'cost' => $this->balance() + 1])
            ->assertSessionHasErrors('cost');
    }

    public function test_service_validation()
    {
        $this->post(route('assets.maintenances.store', $this->asset('Printer foto')), [
            'type' => 'upgrade', 'description' => '', 'performed_on' => '2026-06-01', 'cost' => -1,
        ])->assertSessionHasErrors(['type', 'description', 'performed_on', 'cost']);
    }

    public function test_toggle_broken_and_back()
    {
        $kamera = $this->asset('Kamera mirrorless');

        $this->patch(route('assets.status', $kamera), ['status' => 'broken'])->assertSessionHasNoErrors();
        $this->assertSame(AssetStatus::Broken, $kamera->refresh()->status);
        // Rusak tetap dimiliki → alokasi tetap jalan.
        $this->assertSame(790_450, app(AssetMaintenance::class)->allocationForMonth('2026-08'));

        $this->patch(route('assets.status', $kamera), ['status' => 'active']);
        $this->assertSame(AssetStatus::Active, $kamera->refresh()->status);

        $this->patch(route('assets.status', $kamera), ['status' => 'disposed'])->assertSessionHasErrors('status');
    }

    public function test_sold_asset_proceeds_go_to_maintenance_fund()
    {
        $kamera = $this->asset('Kamera mirrorless');
        $before = $this->balance();

        $this->patch(route('assets.dispose', $kamera), [
            'reason' => 'Dijual', 'disposed_on' => '2026-08-26', 'sale_price' => 5_000_000,
        ])->assertRedirect(route('assets.index'))->assertSessionHasNoErrors();

        $kamera->refresh();
        $this->assertSame(AssetStatus::Disposed, $kamera->status);
        $this->assertSame('Dijual', $kamera->disposal_reason);
        $this->assertSame($before + 5_000_000, $this->balance());
        // Dilepas Agustus → alokasi Agustus berhenti untuk kamera (7 jt × 5%).
        $this->assertSame(790_450 - 350_000, app(AssetMaintenance::class)->allocationForMonth('2026-08'));
    }

    public function test_lost_asset_has_no_sale_price_and_cannot_be_disposed_twice_or_serviced()
    {
        $kamera = $this->asset('Kamera mirrorless');

        $this->patch(route('assets.dispose', $kamera), ['reason' => 'Hilang', 'disposed_on' => '2026-08-26', 'sale_price' => 9_999])
            ->assertSessionHasNoErrors();
        $this->assertSame(0, $kamera->refresh()->sale_price);

        $this->patch(route('assets.dispose', $kamera), ['reason' => 'Hilang', 'disposed_on' => '2026-08-26'])
            ->assertSessionHasErrors('reason');
        $this->post(route('assets.maintenances.store', $kamera), [
            'type' => 'repair', 'description' => 'x', 'performed_on' => '2026-08-26', 'cost' => 0,
        ])->assertSessionHasErrors('type');
        $this->patch(route('assets.status', $kamera), ['status' => 'broken'])->assertSessionHasErrors('status');
    }

    public function test_dispose_date_rules()
    {
        $this->patch(route('assets.dispose', $this->asset('Kamera mirrorless')), [
            'reason' => 'Dibuang', 'disposed_on' => '2026-06-30', 'sale_price' => -1,
        ])->assertSessionHasErrors(['reason', 'disposed_on', 'sale_price']);
    }
}
