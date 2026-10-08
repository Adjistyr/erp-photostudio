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
use Modules\Catalog\Enums\ServiceCategory;
use Modules\Catalog\Models\CatalogItem;
use Modules\Customer\Models\Customer;
use Modules\Expense\Models\JobCost;
use Modules\Finance\Services\Periods;
use Modules\Order\Actions\RecordOrderEvent;
use Modules\Order\Enums\OrderEventType;
use Modules\Order\Enums\PaymentMethod;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Modules\Order\Models\OrderEvent;
use Modules\Order\Models\OrderItem;
use Modules\Order\Models\Payment;
use Modules\Order\Requests\CancelOrderRequest;
use Modules\Order\Requests\OrderResultLinkRequest;
use Modules\Order\Requests\StoreOrderRequest;
use Modules\Order\Requests\UpdateOrderRequest;
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
        $orders = Order::with(['customer', 'items', 'payments.creator', 'jobCosts.creator', 'creator', 'events.user'])
            ->orderByDesc('number')
            ->get();

        return Inertia::render('order::index', [
            'orders' => $orders->map($this->orderProps(...))->values()->all(),
            // Nama & rekening studio untuk pesan bukti bayar.
            'studio' => config('studio'),
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

        $orders = Order::with(['customer', 'items', 'payments.creator', 'jobCosts.creator', 'creator', 'events.user'])
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
                // Aturan "paket muncul di form mana" ada di server, bukan tersembunyi di klien.
                ->whereIn('category', ServiceCategory::values())
                ->orderBy('name')
                ->get(['id', 'name', 'price', 'category']),
        ]);
    }

    /**
     * Order + item + DP dalam satu transaksi: order tanpa item, atau DP tanpa
     * order, merusak laporan tanpa terlihat di layar.
     */
    public function store(StoreOrderRequest $request, RecordOrderEvent $events): RedirectResponse
    {
        $data = $request->validated();
        $line = BusinessLine::from($data['business_line']);
        $deposit = $request->deposit();
        $total = $request->total();
        $location = trim((string) ($data['location'] ?? ''));

        $order = DB::transaction(function () use ($request, $data, $line, $deposit, $total, $location, $events) {
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

            foreach ($request->lines() as $line) {
                $order->items()->create([
                    // null = item custom (spek 1.3).
                    'catalog_item_id' => $line['item']?->id,
                    'name' => $line['name'],
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'unit_cost' => $line['unit_cost'],
                ]);
            }

            $events->execute($order, OrderEventType::Created, [
                'work_status' => ['from' => null, 'to' => $order->work_status->value],
                'total' => ['from' => null, 'to' => $total],
            ]);

            if ($deposit > 0) {
                $payment = $order->payments()->create([
                    'paid_on' => now()->toDateString(),
                    'amount' => $deposit,
                    'method' => $data['dp_method'] ?? PaymentMethod::Transfer->value,
                    // Sama dengan OrderPaymentController: menutup total = pelunasan.
                    'note' => $deposit >= $total ? 'Pelunasan' : 'DP',
                ]);
                $events->execute($order, OrderEventType::PaymentRecorded, Payment::eventChanges($payment, recorded: true));
            }

            return $order;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$order->number} tersimpan."]);

        return to_route('orders.index');
    }

    /**
     * Edit order studio/event (spek 1.2). 404, bukan 403: order retail/batal
     * memang tidak punya halaman edit dan tombolnya tidak ditampilkan.
     */
    public function edit(Order $order): Response
    {
        abort_unless($order->isEditable(), 404);
        $order->load(['customer', 'items', 'payments.creator', 'jobCosts.creator', 'creator', 'events.user']);
        $kept = $order->items->pluck('catalog_item_id')->filter()->all();

        return Inertia::render('order::edit', [
            'order' => $this->orderProps($order),
            'customers' => Customer::orderBy('name')->get(['id', 'name', 'phone']),
            // Paket aktif berkategori dikenal (sama dengan create) + paket yang
            // dirujuk baris lama walau sudah nonaktif — supaya namanya tampil.
            'catalog' => CatalogItem::where('type', CatalogItemType::Service)
                ->where(fn ($q) => $q
                    ->where(fn ($q) => $q->where('is_active', true)->whereIn('category', ServiceCategory::values()))
                    ->orWhereIn('id', $kept))
                ->orderBy('name')
                ->get(['id', 'name', 'price', 'category', 'is_active']),
            // Dua flag walau nilainya sama hari ini: K1 bisa direvisi tanpa
            // mengubah bentuk props.
            'locked' => ['schedule' => $order->hasLockedSchedule(), 'items' => $order->hasLockedSchedule()],
        ]);
    }

    /**
     * Sinkronisasi item: hapus yang hilang → ubah qty yang dipertahankan →
     * tambah baris baru. Baris lama TIDAK disalin ulang dari katalog (harga
     * deal tetap). Satu event `updated` berisi diff; tanpa perubahan → tanpa
     * event. `work_status` tidak berubah walau jadwal digeser, dan tanggal
     * baru tidak dicek tutup buku — jadwal bukan uang.
     */
    public function update(UpdateOrderRequest $request, Order $order, RecordOrderEvent $events): RedirectResponse
    {
        $changes = $request->changes($order);
        if ($changes === []) {
            Inertia::flash('toast', ['type' => 'success', 'message' => 'Tidak ada yang berubah.']);

            return to_route('orders.index');
        }

        DB::transaction(function () use ($request, $order, $changes, $events) {
            $order->update($request->normalised());

            $rows = $request->rows();
            $keep = array_values(array_filter(array_column($rows, 'id')));
            $order->items()->whereNotIn('id', $keep)->delete();

            $stored = $order->items()->get()->keyBy('id');
            foreach ($request->lines() as $i => $line) {
                $id = $rows[$i]['id'];
                $kept = $id !== null ? $stored->get($id) : null;
                if ($kept !== null) {
                    if ($kept->quantity !== $line['quantity']) {
                        $kept->update(['quantity' => $line['quantity']]);
                    }

                    continue;
                }
                $order->items()->create([
                    'catalog_item_id' => $line['item']?->id,
                    'name' => $line['name'],
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'unit_cost' => $line['unit_cost'],
                ]);
            }

            $events->execute($order, OrderEventType::Updated, $changes);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$order->number} diperbarui."]);

        return to_route('orders.index');
    }

    /**
     * Status kerja — SATU-SATUNYA status yang diinput manual, dan hanya maju
     * satu langkah. Server yang menentukan langkahnya; klien tidak mengirim
     * status sembarang. Status bayar tidak punya endpoint sama sekali.
     */
    public function advance(Order $order, RecordOrderEvent $events): RedirectResponse
    {
        $next = $order->work_status->next();
        if ($next === null) {
            throw ValidationException::withMessages([
                'work_status' => "Order berstatus {$order->work_status->label()} tidak bisa dilanjutkan.",
            ]);
        }

        $from = $order->work_status;
        DB::transaction(function () use ($order, $next, $from, $events) {
            $order->update(['work_status' => $next]);
            $events->execute($order, OrderEventType::Advanced, ['work_status' => ['from' => $from->value, 'to' => $next->value]]);
        });
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$order->number}: status jadi {$next->label()}."]);

        return to_route('orders.index');
    }

    /**
     * Mundur satu langkah — koreksi salah klik (spek 1.4). Simetris dengan
     * advance(): server yang menentukan tujuannya. Boleh mundur ke Booking
     * walau ada DP (melarangnya membuat salah klik dua kali tidak bisa
     * dikoreksi); link hasil tidak dihapus, hanya disembunyikan statusnya.
     */
    public function revert(Order $order, RecordOrderEvent $events): RedirectResponse
    {
        $previous = $order->work_status->previous();
        if ($previous === null) {
            throw ValidationException::withMessages(['work_status' => $order->isCancelled()
                ? 'Order yang dibatalkan tidak bisa dikembalikan statusnya.'
                : 'Booking adalah status awal.']);
        }

        $from = $order->work_status;
        DB::transaction(function () use ($order, $previous, $from, $events) {
            $order->update(['work_status' => $previous]);
            $events->execute($order, OrderEventType::Reverted, ['work_status' => ['from' => $from->value, 'to' => $previous->value]]);
        });
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$order->number}: status kembali ke {$previous->label()}."]);

        return to_route('orders.index');
    }

    /**
     * Pembatalan. DP yang sudah masuk TETAP omzet — kebijakan refund belum
     * ada (business-flow 2, pertanyaan 6). Alasan DITAMBAHKAN ke catatan,
     * bukan menimpa: catatan lama (permintaan customer, dsb.) tetap terbaca.
     */
    public function cancel(CancelOrderRequest $request, Order $order, RecordOrderEvent $events): RedirectResponse
    {
        if ($order->isCancelled()) {
            throw ValidationException::withMessages(['work_status' => 'Order sudah dibatalkan.']);
        }

        $reason = trim((string) $request->validated('reason'));
        $notes = $reason === ''
            ? $order->notes
            : trim(($order->notes ? $order->notes."\n" : '')."Dibatalkan: {$reason}");

        $from = $order->work_status;
        DB::transaction(function () use ($order, $notes, $reason, $from, $events) {
            $order->update(['work_status' => WorkStatus::Cancelled, 'notes' => $notes]);
            $events->execute($order, OrderEventType::Cancelled, [
                'work_status' => ['from' => $from->value, 'to' => WorkStatus::Cancelled->value],
                'reason' => ['from' => null, 'to' => $reason !== '' ? $reason : null],
            ]);
        });
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$order->number} dibatalkan."]);

        return to_route('orders.index');
    }

    public function updateResultLink(OrderResultLinkRequest $request, Order $order, RecordOrderEvent $events): RedirectResponse
    {
        $from = $order->result_link;
        $to = $request->validated('result_link');
        DB::transaction(function () use ($order, $from, $to, $events) {
            $order->update(['result_link' => $to]);
            $events->execute($order, OrderEventType::ResultLink, ['result_link' => ['from' => $from, 'to' => $to]]);
        });
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
            'customer_id' => $o->customer_id,
            'customer_name' => $o->customer?->name,
            // null = dicatat sebelum ada pencatat (data lama) atau user sudah dihapus.
            'created_by_name' => $o->creator?->name,
            'business_line' => $o->business_line->value,
            // Tombol Ubah di Sheet — aturan dari server, tidak dihitung ulang di klien.
            'editable' => $o->isEditable(),
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
            // null = Booking (status awal) atau Batal (final).
            'previous_status' => $o->work_status->previous()?->value,
            'payment_status' => $o->paymentStatus()->value,
            'paid_percent' => (int) round($o->paidRatio() * 100),
            'items' => $o->items->map(fn (OrderItem $i) => [
                'id' => $i->id, 'name' => $i->name, 'quantity' => $i->quantity, 'unit_price' => $i->unit_price,
                'catalog_item_id' => $i->catalog_item_id, 'unit_cost' => $i->unit_cost,
                // Item custom (spek 1.3) — harga nego di luar katalog.
                'is_custom' => $i->catalog_item_id === null,
            ])->values()->all(),
            'payments' => $o->payments->sortBy('paid_on')->map(fn (Payment $p) => [
                'id' => $p->id, 'paid_on' => $p->paid_on->toDateString(), 'amount' => $p->amount,
                'method' => $p->method->value, 'note' => $p->note, 'created_by_name' => $p->creator?->name,
            ])->values()->all(),
            'events' => $o->events->map(fn (OrderEvent $e) => [
                'id' => $e->id, 'type' => $e->type->value, 'changes' => $e->changes,
                'user_name' => $e->user?->name, 'at' => $e->created_at->toIso8601String(),
            ])->values()->all(),
            'job_costs' => $o->jobCosts->sortBy('incurred_on')->map(fn (JobCost $j) => [
                'id' => $j->id, 'incurred_on' => $j->incurred_on->toDateString(), 'category' => $j->category,
                'description' => $j->description, 'amount' => $j->amount, 'created_by_name' => $j->creator?->name,
            ])->values()->all(),
        ];
    }
}
