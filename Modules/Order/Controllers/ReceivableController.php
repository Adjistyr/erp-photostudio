<?php

namespace Modules\Order\Controllers;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Finance\Services\Receivables;
use Modules\Order\Models\Order;

/**
 * Pembayaran — daftar piutang (prompt 4.9). Layar yang paling sering dibuka
 * owner (business-flow 5.4): tanpa layar ini tagihan yang belum ditagih
 * terlupakan. Pencatatan pembayaran memakai OrderPaymentController yang sama
 * dengan Detail Order.
 */
class ReceivableController extends Controller
{
    public function index(Receivables $receivables): Response
    {
        $today = today();
        $open = $receivables->open();
        $overdue = $open->filter(fn (Order $o) => $o->daysUntilDue($today) < 0);

        return Inertia::render('order::receivables', [
            'orders' => $open->map(fn (Order $o) => [
                'id' => $o->id,
                'number' => $o->number,
                'customer_name' => $o->customer?->name,
                'business_line' => $o->business_line->value,
                // Tanggal layanan = jatuh tempo tagihan (docs/database.md).
                'service_date' => $o->service_date->toDateString(),
                'days_until_due' => $o->daysUntilDue($today),
                'total' => $o->total(),
                'paid' => $o->totalPaid(),
                'balance' => $o->balance(),
                'payment_status' => $o->paymentStatus()->value,
                'paid_percent' => (int) round($o->paidRatio() * 100),
            ])->values()->all(),
            'totals' => [
                'total' => $open->sum(fn (Order $o) => $o->balance()),
                'overdue' => $overdue->sum(fn (Order $o) => $o->balance()),
                'overdue_count' => $overdue->count(),
            ],
        ]);
    }
}
