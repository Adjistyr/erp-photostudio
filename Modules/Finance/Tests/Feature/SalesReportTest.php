<?php

namespace Modules\Finance\Tests\Feature;

use Modules\Customer\Models\Customer;
use Modules\Finance\Services\ProfitAndLoss;
use Modules\Finance\Services\SalesReport;
use Modules\Shared\Enums\BusinessLine;

/** Porting web/app/lib/dummy.test.ts (penjualan, customer, booking). */
class SalesReportTest extends DemoDataTestCase
{
    private const AUG = '2026-08';

    private function sales(): SalesReport
    {
        return app(SalesReport::class);
    }

    public function test_bookings_today_exclude_completed_walk_in_retail()
    {
        $this->assertSame(['ORD-0012'], $this->sales()->bookingsToday()->pluck('number')->all());
        // ORD-0010 retail di tanggal yang sama, sudah diserahkan — tidak ikut.
        $this->assertTrue($this->order('ORD-0010')->service_date->isToday());
    }

    public function test_top_products_match_retail_revenue_and_material_cost()
    {
        $products = collect($this->sales()->topProducts(self::AUG))->keyBy(fn ($p) => $p->item->name);

        $this->assertSame([15, 75_000, 22_500], [$products['Cetak 4R']->quantity, $products['Cetak 4R']->revenue, $products['Cetak 4R']->cost]);
        $this->assertSame(4, $products['Photostrip 3 Pose']->quantity);
        $this->assertSame(2, $products['Keychain Foto Akrilik']->quantity);
        $this->assertSame(1, $products['Cetak 10R + Bingkai']->quantity);
        // Produk tidak laku tetap tampil — kandidat pertama dihentikan.
        $this->assertSame(0, $products['Album Mini 20 Halaman']->quantity);

        $this->assertSame(22, $products->sum('quantity'));
        $this->assertSame(290_000, $products->sum('revenue'));
        $this->assertSame(94_500, $products->sum('cost'));

        $pnl = app(ProfitAndLoss::class);
        $this->assertSame($pnl->revenue(self::AUG, BusinessLine::Retail), $products->sum('revenue'));
        $this->assertSame($pnl->forMonth(self::AUG)->materialCost, $products->sum('cost'));
    }

    public function test_top_services_exclude_cancelled_orders()
    {
        $services = collect($this->sales()->topServices())->keyBy(fn ($s) => $s->item->name);

        $this->assertSame(8_500_000, $services['Paket Wedding Full Day']->value);
        $this->assertSame(4, $services['Paket Studio 1 Jam']->quantity);
        $this->assertSame(1_400_000, $services['Paket Studio 1 Jam']->value);
        $this->assertSame(650_000, $services['Paket Studio Keluarga 2 Jam']->value);
        // ORD-0004 (Prewedding) Batal, tinggal 1 order dari ORD-0008.
        $this->assertSame(1, $services['Paket Prewedding Outdoor']->quantity);
        $this->assertSame(2_500_000, $services['Paket Prewedding Outdoor']->value);
    }

    public function test_customer_summaries_sorted_by_order_value()
    {
        $summaries = $this->sales()->customerSummaries();
        $byName = collect($summaries)->keyBy(fn ($s) => $s->customer->name);

        $this->assertSame([8_500_000, 2_500_000], [$byName['Rani & Dimas']->orderValue, $byName['Rani & Dimas']->paid]);
        $this->assertSame(2_500_000, $byName['Nadia Salsabila']->orderValue);
        $this->assertSame([2, 1_000_000], [$byName['Budi Hartono']->orderCount, $byName['Budi Hartono']->orderValue]);
        $this->assertSame([2, 395_000], [$byName['Sinta Prameswari']->orderCount, $byName['Sinta Prameswari']->orderValue]);
        $this->assertSame(0, $byName['Dewi Anggraini']->paid);
        $this->assertSame('Rani & Dimas', $summaries[0]->customer->name);
    }

    public function test_cancelled_order_does_not_raise_customer_value_but_stays_in_history()
    {
        $fajar = collect($this->sales()->customerSummaries())->first(fn ($s) => $s->customer->name === 'Fajar Nugroho');

        $this->assertSame(0, $fajar->orderCount);
        $this->assertSame(0, $fajar->orderValue);
        $this->assertCount(1, $fajar->orders);
        $this->assertTrue($fajar->orders->first()->isCancelled());
    }

    public function test_customer_without_orders_still_listed_as_lead()
    {
        // Disesuaikan dari prototype ("Umum" tetap muncul): walk-in di DB
        // tidak punya baris customer, tapi lead tanpa order harus tetap ada —
        // kalau disaring, customer yang baru ditambah langsung lenyap.
        $lead = Customer::create(['name' => 'Lead Instagram', 'phone' => '0811-0000-0000']);

        $names = collect($this->sales()->customerSummaries())->map(fn ($s) => $s->customer->name);
        $this->assertContains($lead->name, $names);
        $this->assertSame(Customer::count(), $names->count());
        $this->assertSame($names->unique()->count(), $names->count());
    }
}
