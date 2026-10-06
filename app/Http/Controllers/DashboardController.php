<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;
use Modules\Catalog\Models\CatalogItem;
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
 * (Order, Finance, Asset), jadi controller ini hanya merangkai service modul.
 * Semua angka dari service yang sama dengan layar asalnya — tidak dihitung
 * ulang di sini.
 */
class DashboardController extends Controller
{
    public function __invoke(Receivables $receivables, ProfitAndLoss $pnl, AssetMaintenance $assets, Periods $periods): Response
    {
        $today = today();
        $month = $periods->current();

        // Studio & event terjadwal hari ini. Retail tidak punya jadwal.
        $bookings = Order::with(['customer', 'items', 'payments'])
            ->whereDate('service_date', $today)
            ->whereIn('business_line', [BusinessLine::Studio, BusinessLine::Event])
            ->where('work_status', '!=', WorkStatus::Cancelled)
            ->orderBy('service_time')
            ->get();

        $open = $receivables->open();
        $overdue = $open->filter(fn (Order $o) => $o->daysUntilDue($today) < 0);
        $breakEven = $pnl->breakEven($month);

        return Inertia::render('dashboard', [
            'has_catalog' => CatalogItem::query()->exists(),
            // Bulan lalu yang belum tutup buku → bagi hasilnya belum final.
            'unclosed_month' => $periods->nextToClose(),
            'today' => $today->toDateString(),
            'month' => $month,
            'bookings_today' => $bookings->map(fn (Order $o) => [
                'id' => $o->id,
                'number' => $o->number,
                'customer_name' => $o->customer?->name,
                'business_line' => $o->business_line->value,
                'items_summary' => $o->itemsSummary(),
                'service_time' => $o->service_time === null ? null : substr($o->service_time, 0, 5),
                'work_status' => $o->work_status->value,
                'payment_status' => $o->paymentStatus()->value,
                'paid_percent' => (int) round($o->paidRatio() * 100),
            ])->values()->all(),
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
}
