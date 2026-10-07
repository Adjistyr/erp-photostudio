<?php

namespace Modules\Order\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Catalog\Models\CatalogItem;
use Modules\Customer\Models\Customer;
use Modules\Expense\Models\JobCost;
use Modules\Finance\Services\Periods;
use Modules\Order\Enums\PaymentMethod;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Modules\Order\Models\OrderItem;
use Modules\Order\Models\Payment;
use Modules\Order\Requests\CancelOrderRequest;
use Modules\Order\Requests\OrderResultLinkRequest;
use Modules\Order\Requests\StoreOrderRequest;
use Modules\Shared\Enums\BusinessLine;

/**
 * Order & Booking — satu tabel untuk retail, studio, event (business-flow 3).
 *
 * Detail order ikut dikirim di daftar (item, pembayaran, biaya job): volumenya
 * kecil, dan Sheet detail jadi terbuka seketika tanpa request tambahan.
 *
 * ponytail: semua order sekaligus, tanpa paginasi — < 10 order/hari. Tambah
 * paginasi/filter server saat order mencapai ribuan.
 */
class OrderController extends Controller
{
    public function index(): Response
    {
        $orders = Order::with(['customer', 'items', 'payments.creator', 'jobCosts.creator', 'creator'])
            ->orderByDesc('number')
            ->get();

        return Inertia::render('order::index', [
            'orders' => $orders->map($this->orderProps(...))->values()->all(),
        ]);
    }

    /**
     * Kalender per bulan. Hanya studio & event — retail tidak punya jadwal.
     * Bulan tidak valid jatuh ke bulan berjalan, bukan error: URL kalender
     * sering diketik/dibagikan manual.
     */
    public function calendar(Request $request): Response
    {
        $month = Periods::orCurrent($request->query('month'));
        $start = Periods::start($month);

        $orders = Order::with(['customer', 'items', 'payments.creator', 'jobCosts.creator', 'creator'])
            ->whereIn('business_line', [BusinessLine::Studio, BusinessLine::Event])
            ->whereBetween('service_date', [$start->toDateString(), $start->endOfMonth()->toDateString()])
            ->orderBy('service_date')
            ->orderBy('service_time')
            ->get();

        return Inertia::render('order::calendar', [
            'month' => $month,
            'today' => now()->toDateString(),
            'orders' => $orders->map($this->orderProps(...))->values()->all(),
        ]);
    }

    /**
     * Halaman penuh, bukan modal (R9): form panjang yang sering diisi bertahap.
     * Hanya jasa aktif — produk dijual lewat POS.
     */
    public function create(): Response
    {
        return Inertia::render('order::create', [
            'customers' => Customer::orderBy('name')->get(['id', 'name', 'phone']),
            'catalog' => CatalogItem::where('is_active', true)
                ->where('type', CatalogItemType::Service)
                ->orderBy('name')
                ->get(['id', 'name', 'price', 'category']),
        ]);
    }

    /**
     * Order + item + DP dalam satu transaksi: order tanpa item, atau DP tanpa
     * order, merusak laporan tanpa terlihat di layar.
     */
    public function store(StoreOrderRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $line = BusinessLine::from($data['business_line']);
        $deposit = $request->deposit();
        $total = $request->total();
        $location = trim((string) ($data['location'] ?? ''));

        $order = DB::transaction(function () use ($request, $data, $line, $deposit, $total, $location) {
            $order = Order::create([
                'number' => Order::nextNumber(),
                'customer_id' => $data['customer_id'],
                'business_line' => $line,
                'service_date' => $data['service_date'],
                'service_time' => $data['service_time'] ?? null,
                // DP masuk = tanggal sudah fix = Dijadwalkan (business-flow 5.2 langkah 5).
                'work_status' => $deposit > 0 ? WorkStatus::Scheduled : WorkStatus::Booking,
                'location' => $location !== '' ? $location : ($line === BusinessLine::Studio ? 'Studio' : null),
                'notes' => trim((string) ($data['notes'] ?? '')) ?: null,
            ]);

            foreach ($request->lines() as ['item' => $item, 'quantity' => $quantity]) {
                $order->items()->create([
                    'catalog_item_id' => $item->id,
                    'name' => $item->name,
                    'quantity' => $quantity,
                    'unit_price' => $item->price,
                    'unit_cost' => $item->unit_cost,
                ]);
            }

            if ($deposit > 0) {
                $order->payments()->create([
                    'paid_on' => now()->toDateString(),
                    'amount' => $deposit,
                    'method' => $data['dp_method'] ?? PaymentMethod::Transfer->value,
                    // Sama dengan OrderPaymentController: menutup total = pelunasan.
                    'note' => $deposit >= $total ? 'Pelunasan' : 'DP',
                ]);
            }

            return $order;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$order->number} tersimpan."]);

        return to_route('orders.index');
    }

    /**
     * Status kerja — SATU-SATUNYA status yang diinput manual, dan hanya maju
     * satu langkah. Server yang menentukan langkahnya; klien tidak mengirim
     * status sembarang. Status bayar tidak punya endpoint sama sekali.
     */
    public function advance(Order $order): RedirectResponse
    {
        $next = $order->work_status->next();
        if ($next === null) {
            throw ValidationException::withMessages([
                'work_status' => "Order berstatus {$order->work_status->label()} tidak bisa dilanjutkan.",
            ]);
        }

        $order->update(['work_status' => $next]);
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$order->number}: status jadi {$next->label()}."]);

        return to_route('orders.index');
    }

    /**
     * Pembatalan. DP yang sudah masuk TETAP omzet — kebijakan refund belum
     * ada (business-flow 2, pertanyaan 6). Alasan DITAMBAHKAN ke catatan,
     * bukan menimpa: catatan lama (permintaan customer, dsb.) tetap terbaca.
     */
    public function cancel(CancelOrderRequest $request, Order $order): RedirectResponse
    {
        if ($order->isCancelled()) {
            throw ValidationException::withMessages(['work_status' => 'Order sudah dibatalkan.']);
        }

        $reason = trim((string) $request->validated('reason'));
        $notes = $reason === ''
            ? $order->notes
            : trim(($order->notes ? $order->notes."\n" : '')."Dibatalkan: {$reason}");

        $order->update(['work_status' => WorkStatus::Cancelled, 'notes' => $notes]);
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$order->number} dibatalkan."]);

        return to_route('orders.index');
    }

    public function updateResultLink(OrderResultLinkRequest $request, Order $order): RedirectResponse
    {
        $order->update(['result_link' => $request->validated('result_link')]);
        Inertia::flash('toast', ['type' => 'success', 'message' => "Link hasil {$order->number} disimpan."]);

        return to_route('orders.index');
    }

    /** @return array<string, mixed> */
    private function orderProps(Order $o): array
    {
        $total = $o->total();
        $direct = $o->directCost();

        return [
            'id' => $o->id,
            'number' => $o->number,
            // null = walk-in tanpa data customer.
            'customer_name' => $o->customer?->name,
            // null = dicatat sebelum ada pencatat (data lama) atau user sudah dihapus.
            'created_by_name' => $o->creator?->name,
            'business_line' => $o->business_line->value,
            'items_summary' => $o->itemsSummary(),
            'service_date' => $o->service_date->toDateString(),
            'service_time' => $o->service_time === null ? null : substr($o->service_time, 0, 5),
            'location' => $o->location,
            'notes' => $o->notes,
            'result_link' => $o->result_link,
            // Order batal tidak punya invoice — tidak ditagih lagi.
            'invoice_url' => $o->isCancelled() ? null : $o->invoiceUrl(),
            'total' => $total,
            'paid' => $o->totalPaid(),
            'balance' => $o->balance(),
            'direct_cost' => $direct,
            'margin' => $o->margin(),
            'work_status' => $o->work_status->value,
            'next_status' => $o->work_status->next()?->value,
            'payment_status' => $o->paymentStatus()->value,
            'paid_percent' => (int) round($o->paidRatio() * 100),
            'items' => $o->items->map(fn (OrderItem $i) => [
                'id' => $i->id, 'name' => $i->name, 'quantity' => $i->quantity, 'unit_price' => $i->unit_price,
            ])->values()->all(),
            'payments' => $o->payments->sortBy('paid_on')->map(fn (Payment $p) => [
                'id' => $p->id, 'paid_on' => $p->paid_on->toDateString(), 'amount' => $p->amount,
                'method' => $p->method->value, 'note' => $p->note, 'created_by_name' => $p->creator?->name,
            ])->values()->all(),
            'job_costs' => $o->jobCosts->sortBy('incurred_on')->map(fn (JobCost $j) => [
                'id' => $j->id, 'incurred_on' => $j->incurred_on->toDateString(), 'category' => $j->category,
                'description' => $j->description, 'amount' => $j->amount, 'created_by_name' => $j->creator?->name,
            ])->values()->all(),
        ];
    }
}
