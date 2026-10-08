<?php

namespace App\Http\Controllers;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Catalog\Models\CatalogItem;
use Modules\Customer\Models\MessageTemplate;
use Modules\Finance\Services\AssetMaintenance;
use Modules\Finance\Services\DueMaintenance;
use Modules\Finance\Services\Periods;
use Modules\Finance\Services\ProfitAndLoss;
use Modules\Finance\Services\Receivables;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Modules\Shared\Enums\BusinessLine;

/**
 * Dashboard (prompt 4.13) — "apa yang menunggu owner hari ini, dan uang mana
 * yang menggantung". Halaman app, bukan modul: isinya ringkasan lintas domain
 * (Order, Finance, Asset, Customer), jadi controller ini hanya merangkai service modul.
 * Semua angka dari service yang sama dengan layar asalnya — tidak dihitung
 * ulang di sini.
 */
class DashboardController extends Controller
{
    public function __invoke(Receivables $receivables, ProfitAndLoss $pnl, AssetMaintenance $assets, Periods $periods): Response
    {
        $today = today();
        $month = $periods->current();

        $open = $receivables->open();
        $overdue = $open->filter(fn (Order $o) => $o->daysUntilDue($today) < 0);
        $breakEven = $pnl->breakEven($month);

        return Inertia::render('dashboard', [
            'has_catalog' => CatalogItem::query()->exists(),
            // Bulan lalu yang belum tutup buku → bagi hasilnya belum final.
            'unclosed_month' => $periods->nextToClose(),
            'today' => $today->toDateString(),
            'month' => $month,
            'bookings_today' => $this->scheduledOn($today)->map($this->bookingRow(...))->values()->all(),
            // Reminder H-1 (spek 3.5): tombol WA dengan template Komunikasi.
            'bookings_tomorrow' => $this->scheduledOn($today->copy()->addDay())->map($this->bookingRow(...))->values()->all(),
            'reminder_template' => MessageTemplate::bodyFor('reminder'),
            'revenue' => $pnl->revenue($month),
            'receivables' => [
                'total' => $open->sum(fn (Order $o) => $o->balance()),
                'count' => $open->count(),
                'overdue' => $overdue->sum(fn (Order $o) => $o->balance()),
                'overdue_count' => $overdue->count(),
                'orders' => $open->map(fn (Order $o) => [
                    'id' => $o->id,
                    'number' => $o->number,
                    'customer_name' => $o->customer?->name,
                    'business_line' => $o->business_line->value,
                    'balance' => $o->balance(),
                    'days_until_due' => $o->daysUntilDue($today),
                    'payment_status' => $o->paymentStatus()->value,
                    'paid_percent' => (int) round($o->paidRatio() * 100),
                ])->values()->all(),
            ],
            'break_even' => [
                'fixed_costs' => $breakEven->fixedCosts,
                'gross_profit' => $breakEven->grossProfit,
                'shortfall' => $breakEven->shortfall,
                'ratio' => $breakEven->ratio,
            ],
            'due_maintenance' => array_map(fn (DueMaintenance $d) => [
                'asset_name' => $d->asset->name,
                'days_until' => $d->daysUntil,
            ], $assets->dueSoon()),
        ]);
    }

    /**
     * Studio & event terjadwal pada satu tanggal (hari ini / besok). Retail
     * tidak punya jadwal; order batal tidak ditunggu. Urut jam — PostgreSQL
     * menaruh jam kosong (null) di akhir untuk ASC.
     *
     * @return Collection<int, Order>
     */
    private function scheduledOn(CarbonInterface $date): Collection
    {
        return Order::with(['customer', 'items', 'payments'])
            ->whereDate('service_date', $date)
            ->whereIn('business_line', [BusinessLine::Studio, BusinessLine::Event])
            ->where('work_status', '!=', WorkStatus::Cancelled)
            ->orderBy('service_time')
            ->orderBy('id')
            ->get();
    }

    /** @return array<string, mixed> */
    private function bookingRow(Order $o): array
    {
        return [
            'id' => $o->id,
            'number' => $o->number,
            'customer_name' => $o->customer?->name,
            // HP untuk tombol WA (reminder besok, hubungi customer hari ini).
            'customer_phone' => $o->customer?->phone,
            'business_line' => $o->business_line->value,
            'items_summary' => $o->itemsSummary(),
            'service_date' => $o->service_date->toDateString(),
            'service_time' => $o->service_time === null ? null : substr($o->service_time, 0, 5),
            'location' => $o->location,
            'work_status' => $o->work_status->value,
            'payment_status' => $o->paymentStatus()->value,
            'paid_percent' => (int) round($o->paidRatio() * 100),
        ];
    }
}
