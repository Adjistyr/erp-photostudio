<?php

namespace Modules\Asset\Tests\Feature;

use App\Models\User;
use Carbon\CarbonImmutable;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Asset\Enums\AssetStatus;
use Modules\Asset\Models\Asset;
use Modules\Asset\Models\AssetCategory;
use Modules\Finance\Enums\Fund;
use Modules\Finance\Services\AssetMaintenance;
use Modules\Finance\Services\Funds;
use Tests\TestCase;

/** Proyeksi penggantian (spek 6.2 / 8.3) + ringkasan per kategori. */
class AssetReplacementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');
        $this->actingAs(User::factory()->create());
    }

    /** Aset lama (dibeli sebelum data demo) — tanpa investasi, cukup untuk proyeksi. */
    private function old(string $name, string $purchasedOn, int $life, int $price, int $units = 1): Asset
    {
        $cat = AssetCategory::where('name', 'Aksesori')->sole();

        return Asset::create([
            'name' => $name, 'asset_category_id' => $cat->id, 'code' => $cat->nextCode(),
            'units' => $units, 'unit_price' => $price, 'purchased_on' => $purchasedOn,
            'maintenance_percent' => 0, 'useful_life_months' => $life, 'status' => AssetStatus::Active,
        ]);
    }

    private function due(): array
    {
        return app(AssetMaintenance::class)->replacementsDue(today());
    }

    public function test_assets_due_within_six_months_are_listed_in_order()
    {
        $this->old('Tripod', '2024-12-10', 24, 400_000);        // 10 Des 2026
        $this->old('Softbox', '2025-01-05', 24, 300_000, 2);    // 5 Jan 2027
        $this->old('Backdrop', '2025-03-01', 24, 200_000);      // 1 Mar 2027 — di luar 26 Feb 2027

        $due = $this->due();

        $this->assertSame(['Tripod', 'Softbox'], array_map(fn ($r) => $r->asset->name, $due));
        $this->assertSame([4, 600_000], [$due[0]->monthsUntil, $due[1]->estimate]);
    }

    public function test_disposed_assets_are_excluded_but_broken_ones_stay()
    {
        $this->old('Tripod', '2024-12-10', 24, 400_000)->update(['disposed_on' => '2026-08-01', 'status' => AssetStatus::Disposed]);
        $this->old('Softbox', '2025-01-05', 24, 300_000)->update(['status' => AssetStatus::Broken]);

        $this->assertSame(['Softbox'], array_map(fn ($r) => $r->asset->name, $this->due()));
    }

    public function test_overdue_asset_has_negative_months_until()
    {
        $this->old('Flash lama', '2024-05-20', 24, 900_000); // 20 Mei 2026 — lewat 3 bulan

        $this->assertSame(-3, $this->due()[0]->monthsUntil);
    }

    public function test_month_end_purchase_does_not_overflow()
    {
        $this->old('Reflektor', '2025-01-31', 13, 100_000); // + 13 bulan = 28 Feb 2026

        $this->assertSame('2026-02-28', $this->due()[0]->dueOn->toDateString());
        $this->assertInstanceOf(CarbonImmutable::class, $this->due()[0]->dueOn);
    }

    public function test_shortfall_is_zero_when_fund_covers_estimate_and_positive_otherwise()
    {
        $balance = app(Funds::class)->balance(Fund::Maintenance);
        $this->old('Tripod', '2024-12-10', 24, $balance + 1_000_000);

        $this->get(route('assets.index'))->assertInertia(fn (Assert $page) => $page
            ->has('replacements.items', 1)
            ->where('replacements.items.0.months_until', 4)
            ->where('replacements.total_estimate', $balance + 1_000_000)
            ->where('replacements.shortfall', 1_000_000));

        Asset::where('name', 'Tripod')->update(['unit_price' => max(1, $balance)]);
        $this->get(route('assets.index'))->assertInertia(fn (Assert $page) => $page->where('replacements.shortfall', 0));
    }

    public function test_dashboard_exposes_replacement_summary()
    {
        $balance = app(Funds::class)->balance(Fund::Maintenance);
        $this->old('Tripod', '2024-12-10', 24, $balance + 500_000);

        $this->get(route('dashboard'))->assertInertia(fn (Assert $page) => $page
            ->where('replacements_due_count', 1)
            ->where('replacements_shortfall', 500_000));
    }

    public function test_category_summary_totals_match_summary_cards()
    {
        $this->get(route('assets.index'))->assertInertia(function (Assert $page) {
            $props = $page->toArray()['props'];
            $rows = collect($props['by_category']);
            foreach (['units', 'purchase_value', 'book_value', 'allocation'] as $key) {
                $this->assertSame($props['summary'][$key], $rows->sum($key), $key);
            }
            // Urut nilai beli terbesar: Kamera 7 jt di atas.
            $this->assertSame('Kamera', $rows->first()['name']);
            $this->assertSame([3, 5], [$rows->firstWhere('name', 'Aksesori')['kinds'], $rows->firstWhere('name', 'Aksesori')['units']]);
        });
    }

    public function test_category_summary_excludes_disposed()
    {
        $kamera = Asset::where('name', 'Kamera mirrorless')->sole();
        $this->patch(route('assets.dispose', $kamera), ['reason' => 'Hilang', 'disposed_on' => '2026-08-26']);

        $this->get(route('assets.index'))->assertInertia(fn (Assert $page) => $page
            ->where('by_category', fn ($rows) => ! collect($rows)->contains('name', 'Kamera')));
    }
}
