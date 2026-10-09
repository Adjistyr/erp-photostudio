<?php

namespace Modules\Finance\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Expense\Models\OperatingExpense;
use Modules\Finance\Services\AgingBucket;
use Modules\Finance\Services\CashDay;
use Modules\Finance\Services\CashReceipts;
use Modules\Finance\Services\CustomerSummary;
use Modules\Finance\Services\LineMargin;
use Modules\Finance\Services\LineReceivable;
use Modules\Finance\Services\OwnerShare;
use Modules\Finance\Services\Periods;
use Modules\Finance\Services\ProductSales;
use Modules\Finance\Services\ProfitAndLoss;
use Modules\Finance\Services\ProfitSharing;
use Modules\Finance\Services\Receivables;
use Modules\Finance\Services\SalesReport;
use Modules\Finance\Services\ServiceSales;
use Modules\Order\Enums\PaymentMethod;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Modules\Order\Models\Payment;
use Modules\Shared\Enums\BusinessLine;

/**
 * Laporan (prompt 4.19–4.22) + Kas Harian (spek 3.3). Controller ini hanya MENYAJIKAN angka service
 * Finance — tidak ada rumus di sini, supaya angka laporan tidak bisa berbeda
 * dengan Dashboard, Biaya, atau Pembayaran.
 */
class ReportController extends Controller
{
    public function __construct(private readonly ProfitAndLoss $pnl) {}

    public function profitLoss(Request $request, ProfitSharing $sharing): Response
    {
        $month = Periods::orCurrent($request->query('month'));
        $s = $this->pnl->forMonth($month);
        $share = $sharing->forMonth($month);
        $rule = $sharing->ruleFor($month);
        $owners = $rule?->owners->pluck('name', 'id') ?? collect();

        return Inertia::render('finance::reports/profit-loss', [
            'month' => $month,
            'statement' => [
                'revenue_by_line' => array_map(fn (BusinessLine $l) => [
                    'line' => $l->value,
                    'amount' => $s->revenueByLine[$l->value] ?? 0,
                ], BusinessLine::cases()),
                'total_revenue' => $s->totalRevenue,
                'material_cost' => $s->materialCost,
                'job_cost' => $s->jobCost,
                'total_direct_cost' => $s->totalDirectCost,
                'gross_profit' => $s->grossProfit,
                'gross_margin' => $s->grossMargin,
                'operating' => $s->operatingExpenses->map(fn (OperatingExpense $e) => [
                    'id' => $e->id, 'category' => $e->category, 'description' => $e->description, 'amount' => $e->amount,
                ])->values()->all(),
                'total_operating' => $s->totalOperating,
                'maintenance_allocation' => $s->maintenanceAllocation,
                'net_profit' => $s->netProfit,
            ],
            'profit_share' => $share === null ? null : [
                'net_profit' => $share->netProfit,
                'final' => $share->final,
                'deduction' => $share->calculation->deduction,
                'distributable' => $share->calculation->distributable,
                'reserve' => $share->calculation->reserve,
                'reserve_percent' => $rule->reserve_percent ?? 0,
                'shares' => array_map(fn (OwnerShare $o) => [
                    'owner_name' => $owners[$o->ownerId] ?? '—',
                    'percent' => $o->percent,
                    'amount' => $o->amount,
                ], $share->calculation->shares),
                'accumulated_loss' => $share->calculation->accumulatedLoss,
                'next_month' => Periods::next($month),
            ],
            'cash_basis_example' => $this->cashBasisExample($month),
        ]);
    }

    public function margin(Request $request): Response
    {
        $month = Periods::orCurrent($request->query('month'));
        $s = $this->pnl->forMonth($month);

        return Inertia::render('finance::reports/margin', [
            'month' => $month,
            'lines' => array_map(fn (LineMargin $m) => [
                'line' => $m->line->value,
                'revenue' => $m->revenue,
                'direct_cost' => $m->directCost,
                'margin' => $m->margin,
                'margin_ratio' => $m->marginRatio,
                'share' => $m->share,
            ], $this->pnl->marginByLine($month)),
            'totals' => [
                'revenue' => $s->totalRevenue,
                'direct_cost' => $s->totalDirectCost,
                'gross_profit' => $s->grossProfit,
                'gross_margin' => $s->grossMargin,
            ],
        ]);
    }

    public function sales(Request $request, SalesReport $sales): Response
    {
        $month = Periods::orCurrent($request->query('month'));
        $walkIns = Order::with('items')
            ->whereNull('customer_id')
            ->where('work_status', '!=', WorkStatus::Cancelled)
            ->get();

        return Inertia::render('finance::reports/sales', [
            'month' => $month,
            'products' => array_map(fn (ProductSales $p) => [
                'id' => $p->item->id,
                'name' => $p->item->name,
                'quantity' => $p->quantity,
                'revenue' => $p->revenue,
                'cost' => $p->cost,
                'margin' => $p->margin,
                'margin_ratio' => $p->marginRatio,
            ], $sales->topProducts($month)),
            'services' => array_map(fn (ServiceSales $s) => [
                'id' => $s->item->id,
                'name' => $s->item->name,
                'category' => $s->item->category,
                'quantity' => $s->quantity,
                'value' => $s->value,
            ], $sales->topServices()),
            // Item di luar katalog (harga nego) — satu baris agregat di bawah jasa.
            'custom_items' => $sales->customItems(),
            // Lead tanpa order tidak dirangking — tabel ini untuk menentukan
            // siapa yang layak di-follow up.
            'customers' => array_values(array_map(fn (CustomerSummary $c) => [
                'id' => $c->customer->id,
                'name' => $c->customer->name,
                'lines' => array_map(fn (BusinessLine $l) => $l->value, $c->lines),
                'order_count' => $c->orderCount,
                'order_value' => $c->orderValue,
                'paid' => $c->paid,
                'last_transaction' => $c->lastTransaction?->toDateString(),
            ], array_filter($sales->customerSummaries(), fn (CustomerSummary $c) => $c->orderCount > 0))),
            // Walk-in tanpa nama tidak punya baris customer — ditampilkan
            // sebagai catatan, supaya omzetnya tidak "hilang" dari layar ini.
            'walk_in' => [
                'count' => $walkIns->count(),
                'value' => $walkIns->sum(fn (Order $o) => $o->total()),
            ],
        ]);
    }

    /** Kas Harian: penerimaan per hari × metode untuk tutup hari (spek 3.3). */
    public function cash(Request $request, CashReceipts $cash): Response
    {
        $month = Periods::orCurrent($request->query('month'));
        $r = $cash->forMonth($month);

        return Inertia::render('finance::reports/cash', [
            'month' => $month,
            'today' => today()->toDateString(),
            // Urutan kolom dari enum — satu sumber dengan PaymentMethod.
            'methods' => array_map(fn (PaymentMethod $m) => $m->value, PaymentMethod::cases()),
            'days' => array_map(fn (CashDay $d) => [
                'date' => $d->date,
                'by_method' => $d->byMethod,
                'total' => $d->total,
                'count' => $d->count,
                // Uang keluar per metode hari itu (spek 4.2); by_method sudah bersih.
                'refunds' => $d->refunds,
            ], $r->days),
            'refund_totals' => $r->refunds,
            'totals' => $r->totals,
            'total' => $r->total,
            'count' => $r->count,
            'shares' => array_map(fn (int $v) => $r->total > 0 ? $v / $r->total : 0, $r->totals),
        ]);
    }

    public function receivables(Receivables $receivables, Periods $periods): Response
    {
        $today = today();
        $open = $receivables->open();

        return Inertia::render('finance::reports/receivables', [
            'month' => $periods->current(),
            'revenue' => $this->pnl->revenue($periods->current()),
            'total' => $open->sum(fn (Order $o) => $o->balance()),
            'aging' => array_map(fn (AgingBucket $b) => [
                'label' => $b->label,
                'count' => $b->orders->count(),
                'amount' => $b->amount,
                'share' => $b->share,
            ], $receivables->aging()),
            'by_line' => array_map(fn (LineReceivable $l) => [
                'line' => $l->line->value,
                'amount' => $l->amount,
                'share' => $l->share,
            ], $receivables->byLine()),
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
        ]);
    }

    /**
     * Contoh nyata basis kas untuk Alert di atas Laba Rugi: uang terbesar yang
     * diterima bulan ini untuk acara di bulan SESUDAHNYA. Prototype menulis
     * ORD-0011 secara keras; di sini dicari dari data supaya tetap benar.
     *
     * @return array{number: string, paid_in_month: int, service_date: string}|null
     */
    private function cashBasisExample(string $month): ?array
    {
        $payment = Payment::query()
            ->whereBetween('paid_on', [Periods::start($month)->toDateString(), Periods::end($month)->toDateString()])
            ->whereHas('order', fn ($q) => $q->where('service_date', '>', Periods::end($month)->toDateString()))
            ->selectRaw('order_id, SUM(amount) as total')
            ->groupBy('order_id')
            ->orderByDesc('total')
            ->first();
        if ($payment === null) {
            return null;
        }
        $order = Order::findOrFail($payment->order_id);

        return [
            'number' => $order->number,
            'paid_in_month' => (int) $payment->getAttribute('total'),
            'service_date' => $order->service_date->toDateString(),
        ];
    }
}
