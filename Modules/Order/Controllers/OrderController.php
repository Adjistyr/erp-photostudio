<?php

namespace Modules\Order\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Asset\Models\AssetCheckout;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Catalog\Enums\ServiceCategory;
use Modules\Catalog\Models\CatalogItem;
use Modules\Customer\Actions\FindOrCreateCustomer;
use Modules\Customer\Models\Customer;
use Modules\Expense\Models\JobCost;
use Modules\Finance\Services\Periods;
use Modules\Order\Actions\RecordOrderEvent;
use Modules\Order\Actions\ReplacePaymentSchedules;
use Modules\Order\Enums\OrderEventType;
use Modules\Order\Enums\PaymentMethod;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Modules\Order\Models\OrderEvent;
use Modules\Order\Models\OrderItem;
use Modules\Order\Models\Payment;
use Modules\Order\Models\Refund;
use Modules\Order\Requests\CancelOrderRequest;
use Modules\Order\Requests\OrderResultLinkRequest;
use Modules\Order\Requests\StoreOrderRequest;
use Modules\Order\Requests\UpdateOrderRequest;
use Modules\Shared\Enums\BusinessLine;
use Modules\Shared\Http\CsvResponse;
use Modules\Shared\Http\ListQuery;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
    /**
     * Daftar dengan pencarian, filter, dan paginasi server-side (spek 3.1).
     * Urut id, bukan nomor: "ORD-10000" < "ORD-9999" (lihat Order::nextNumber()).
     */
    public function index(Request $request): Response
    {
        $list = $this->listQuery($request);
        $orders = Order::with(['customer', 'items', 'payments.creator', 'refunds.creator', 'jobCosts.creator', 'creator', 'events.user', 'assetCheckouts.asset', 'schedules'])
            ->search($list)
            ->orderByDesc('id')
            ->paginate(ListQuery::PER_PAGE)
            ->withQueryString();

        return Inertia::render('order::index', [
            'orders' => ListQuery::paginated($orders, $this->orderProps(...)),
            'filters' => $list->toArray(),
            // Nama & rekening studio untuk pesan bukti bayar.
            'studio' => config('studio'),
        ]);
    }

    /**
     * Ekspor CSV dengan filter yang SAMA dengan daftar (spek 4.5) — yang
     * terlihat = yang diekspor. Satu baris = satu order (item diringkas)
     * supaya total per baris bisa langsung dijumlahkan.
     *
     * ponytail: batas jumlah baris, bukan antrean ekspor — melindungi DB dari
     * query tanpa filter; pindah ke job + email kalau order mulai puluhan ribu.
     *
     * Setelah peran (spek 5.1): butuh `view-finance` — memuat HPP & margin.
     */
    public function export(Request $request): RedirectResponse|StreamedResponse
    {
        $list = $this->listQuery($request);
        $limit = (int) config('studio.export_limit');
        if (Order::query()->search($list)->count() > $limit) {
            Inertia::flash('toast', ['type' => 'error', 'message' => "Lebih dari {$limit} order — persempit rentang tanggal atau filter dulu."]);

            return back();
        }

        $rows = function () use ($list) {
            $orders = Order::with(['customer', 'items', 'payments', 'refunds', 'jobCosts', 'creator'])
                ->search($list)
                ->orderByDesc('id')
                ->lazy(500);
            foreach ($orders as $o) {
                $status = $o->paymentStatus();
                yield [
                    $o->number,
                    $o->service_date->toDateString(),
                    $o->service_time === null ? null : substr($o->service_time, 0, 5),
                    $o->business_line->value,
                    $o->business_line->label(),
                    $o->customer?->name,
                    $o->customer?->phone,
                    $o->itemsSummary(),
                    $o->total(),
                    $o->totalPaid(),
                    $o->totalRefunded(),
                    $o->balance(),
                    $status->value,
                    $status->label(),
                    $o->work_status->value,
                    $o->work_status->label(),
                    $o->materialCost(),
                    $o->directCost() - $o->materialCost(),
                    $o->margin(),
                    $o->location,
                    $o->notes,
                    $o->source,
                    $o->creator?->name,
                    $o->created_at?->toDateTimeString(),
                ];
            }
        };

        return CsvResponse::stream('potrait-time-order-'.today()->toDateString().'.csv', $rows(), [
            'nomor', 'tanggal_layanan', 'jam', 'lini', 'lini_label', 'customer', 'hp', 'item',
            'total', 'dibayar', 'dikembalikan', 'sisa', 'status_bayar', 'status_bayar_label',
            'status_kerja', 'status_kerja_label', 'hpp_bahan', 'biaya_job', 'margin',
            'lokasi', 'catatan', 'sumber', 'dicatat_oleh', 'dibuat_pada',
        ]);
    }

    /** Filter daftar & ekspor order — satu definisi supaya keduanya tidak bisa berbeda. */
    private function listQuery(Request $request): ListQuery
    {
        return ListQuery::fromRequest($request, [
            'line' => BusinessLine::values(),
            'status' => WorkStatus::values(),
            'pay' => ['unpaid', 'partial', 'paid'],
            'from' => 'date',
            'to' => 'date',
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

        $orders = Order::with(['customer', 'items', 'payments.creator', 'refunds.creator', 'jobCosts.creator', 'creator', 'events.user', 'assetCheckouts.asset', 'schedules'])
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
            // `source` = default sumber order saat customer dipilih (spek 6.6).
            'customers' => Customer::orderBy('name')->get(['id', 'name', 'phone', 'source']),
            'sources' => Customer::SOURCES,
            'catalog' => $this->catalogOptions(),
        ]);
    }

    /**
     * Order + item + termin + DP dalam satu transaksi: order tanpa item, atau
     * DP tanpa order, merusak laporan tanpa terlihat di layar.
     */
    public function store(StoreOrderRequest $request, RecordOrderEvent $events, FindOrCreateCustomer $findOrCreate, ReplacePaymentSchedules $schedules): RedirectResponse
    {
        $data = $request->validated();
        $line = BusinessLine::from($data['business_line']);
        $deposit = $request->deposit();
        $total = $request->total();
        $location = trim((string) ($data['location'] ?? ''));

        $customer = null;
        $order = DB::transaction(function () use ($request, $data, $line, $deposit, $total, $location, $events, $findOrCreate, $schedules, &$customer) {
            // Customer baru dibuat di transaksi yang sama — gagal simpan order
            // tidak boleh meninggalkan customer yatim (spek 3.4).
            $customer = $request->resolveCustomer($findOrCreate);
            $order = Order::create([
                'number' => Order::nextNumber(),
                'customer_id' => $customer->id,
                'business_line' => $line,
                'service_date' => $data['service_date'],
                'service_time' => $data['service_time'] ?? null,
                // DP masuk = tanggal sudah fix = Dijadwalkan (business-flow 5.2 langkah 5).
                'work_status' => $deposit > 0 ? WorkStatus::Scheduled : WorkStatus::Booking,
                'location' => $location !== '' ? $location : ($line === BusinessLine::Studio ? 'Studio' : null),
                'notes' => trim((string) ($data['notes'] ?? '')) ?: null,
                // Default dari customer (spek 6.6) — customer lama bisa datang lewat kanal lain.
                'source' => $data['source'] ?? $customer->source,
            ]);

            foreach ($request->lines() as $line) {
                $order->items()->create([
                    // null = item custom (spek 1.3).
                    'catalog_item_id' => $line['item']?->id,
                    'catalog_item_variant_id' => $line['variant']?->id,
                    'name' => $line['name'],
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'unit_cost' => $line['unit_cost'],
                ]);
            }
            // Termin pembayaran (spek 6.4) — sudah dicek event-only di request.
            if ($request->submittedSchedules() !== []) {
                $schedules->execute($order, $request->submittedSchedules());
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

        $isNew = $customer?->wasRecentlyCreated === true;
        Inertia::flash('toast', ['type' => 'success', 'message' => $isNew
            ? "{$order->number} tersimpan untuk {$customer->name} (customer baru)."
            : "{$order->number} tersimpan."]);

        // Ke halaman detail order baru (spek 7.4).
        return to_route('orders.show', $order);
    }

    /**
     * Detail order — halaman penuh (spek 7.4), dulu Sheet di daftar.
     */
    public function show(Order $order): Response
    {
        $order->load(['customer', 'items', 'payments.creator', 'refunds.creator', 'jobCosts.creator', 'creator', 'events.user', 'assetCheckouts.asset', 'schedules']);

        return Inertia::render('order::show', [
            'order' => $this->orderProps($order),
            // Profil studio untuk bukti bayar setelah Catat Pembayaran.
            'studio' => config('studio'),
        ]);
    }

    /**
     * Edit order (spek 1.2; retail sejak 7.4 — customer & catatan saja). 404,
     * bukan 403: order batal memang tidak punya halaman edit dan tombolnya
     * tidak ditampilkan.
     */
    public function edit(Order $order): Response
    {
        abort_unless($order->isEditable(), 404);
        $order->load(['customer', 'items', 'payments.creator', 'refunds.creator', 'jobCosts.creator', 'creator', 'events.user', 'schedules']);
        /** @var list<int> $kept */
        $kept = $order->items->pluck('catalog_item_id')->filter()->map(fn ($id) => (int) $id)->values()->all();

        return Inertia::render('order::edit', [
            'order' => $this->orderProps($order),
            'customers' => Customer::orderBy('name')->get(['id', 'name', 'phone', 'source']),
            // Retail tidak mencatat sumber (spek 6.6) — null = Select disembunyikan.
            'sources' => $order->business_line === BusinessLine::Retail ? null : Customer::SOURCES,
            // Paket aktif berkategori dikenal (sama dengan create) + paket yang
            // dirujuk baris lama walau sudah nonaktif — supaya namanya tampil.
            // + item yang dirujuk baris lama walau nonaktif (produk di order retail, spek 7.4).
            'catalog' => $this->catalogOptions($kept),
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
     *
     * Termin (spek 6.4) diganti utuh bila berubah; total berubah yang membuat
     * Σ termin ≠ total menghapus termin dengan peringatan (aturan 5).
     */
    public function update(UpdateOrderRequest $request, Order $order, RecordOrderEvent $events, FindOrCreateCustomer $findOrCreate, ReplacePaymentSchedules $schedules): RedirectResponse
    {
        // Dihitung sebelum item diubah — keduanya membandingkan dengan total lama.
        $dropped = $request->dropsSchedules();
        $newSchedules = $request->schedulesAfterUpdate();

        // Customer dicocokkan/dibuat lebih dulu (di transaksi) supaya diff
        // membandingkan customer yang sebenarnya — "customer baru" yang ternyata
        // cocok dengan customer order ini bukan perubahan.
        $changes = DB::transaction(function () use ($request, $order, $events, $findOrCreate, $schedules, $newSchedules) {
            // Retail walk-in boleh tanpa customer (spek 7.4) — aturan request menjamin studio/event terisi.
            $customerId = $request->resolveCustomerOrNull($findOrCreate)?->id;
            $changes = $request->changes($order, $customerId);
            if ($changes === []) {
                return [];
            }

            $order->update($request->normalised($customerId));
            if (array_key_exists('schedules', $changes)) {
                $schedules->execute($order, $newSchedules);
            }

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
                    'catalog_item_variant_id' => $line['variant']?->id,
                    'name' => $line['name'],
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'unit_cost' => $line['unit_cost'],
                ]);
            }

            $events->execute($order, OrderEventType::Updated, $changes);

            return $changes;
        });

        Inertia::flash('toast', match (true) {
            $changes === [] => ['type' => 'success', 'message' => 'Tidak ada yang berubah.'],
            // Aturan 5 (spek 6.4) — kalimat sama dengan peringatan di form.
            $dropped => ['type' => 'warning', 'message' => "{$order->number} diperbarui. Termin dihapus karena total berubah — atur ulang."],
            default => ['type' => 'success', 'message' => "{$order->number} diperbarui."],
        });

        // Kembali ke halaman detail (spek 7.4), bukan daftar.
        return to_route('orders.show', $order);
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

        // Dari halaman detail (spek 7.4) — kembali ke sana.
        return back();
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

        // Dari halaman detail (spek 7.4) — kembali ke sana.
        return back();
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

        // Dari halaman detail (spek 7.4) — kembali ke sana.
        return back();
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

        // Dari halaman detail (spek 7.4) — kembali ke sana.
        return back();
    }

    /**
     * Pilihan item Form Order: paket jasa aktif berkategori dikenal (aturan
     * "paket muncul di form mana" di server) + PRODUK aktif (spek 7.5: cetak
     * tambahan, album, bingkai) dengan varian aktifnya. `$kept` = item yang
     * dirujuk baris lama, tampil walau nonaktif supaya namanya terbaca.
     *
     * @param  list<int>  $kept
     * @return array<int, array<string, mixed>>
     */
    private function catalogOptions(array $kept = []): array
    {
        return CatalogItem::query()
            ->with(['variants' => fn ($q) => $q->where('is_active', true)])
            ->where(fn ($q) => $q
                ->where(fn ($q) => $q->where('type', CatalogItemType::Service)->where('is_active', true)->whereIn('category', ServiceCategory::values()))
                ->orWhere(fn ($q) => $q->where('type', CatalogItemType::Product)->where('is_active', true))
                ->orWhereIn('id', $kept))
            ->orderBy('name')
            ->get()
            // Produk bervarian tanpa varian aktif tidak bisa dijual (spek 7.3) — kecuali dirujuk baris lama.
            ->reject(fn (CatalogItem $c) => ! in_array($c->id, $kept, true)
                && $c->type === CatalogItemType::Product && $c->variants->isEmpty() && $c->variants()->exists())
            ->map(fn (CatalogItem $c) => [
                'id' => $c->id, 'name' => $c->name, 'price' => $c->price, 'category' => $c->category,
                'type' => $c->type->value, 'is_active' => $c->is_active,
                'variants' => $c->variants->map(fn ($v) => ['id' => $v->id, 'name' => $v->name, 'price' => $v->price])->values()->all(),
            ])->values()->all();
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
            // Sumber lead (spek 6.6); null = tidak dicatat.
            'source' => $o->source,
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
            // Termin pembayaran (spek 6.4): status FIFO dari pembayaran, tidak disimpan.
            'schedules' => array_map(fn (array $r) => [
                'sequence' => $r['schedule']->sequence, 'label' => $r['schedule']->label,
                'due_on' => $r['schedule']->due_on->toDateString(), 'amount' => $r['schedule']->amount,
                'status' => $r['status']->value,
            ], $o->scheduleStatuses()),
            'next_installment' => $o->nextInstallment(),
            // Jatuh tempo efektif: termin berikutnya, atau tanggal layanan.
            'due_on' => $o->dueOn()->toDateString(),
            'items' => $o->items->map(fn (OrderItem $i) => [
                'id' => $i->id, 'name' => $i->name, 'quantity' => $i->quantity, 'unit_price' => $i->unit_price,
                'catalog_item_id' => $i->catalog_item_id, 'unit_cost' => $i->unit_cost,
                // Item custom (spek 1.3) — harga nego di luar katalog.
                'is_custom' => $i->catalog_item_id === null,
            ])->values()->all(),
            'payments' => $o->payments->sortBy('paid_on')->map(fn (Payment $p) => [
                'id' => $p->id, 'paid_on' => $p->paid_on->toDateString(), 'amount' => $p->amount,
                'method' => $p->method->value, 'note' => $p->note, 'created_by_name' => $p->creator?->name,
                'proof_url' => $p->proofUrl(),
            ])->values()->all(),
            // Pengembalian uang (spek 4.2) — sisa tagihan & status bayar tetap bruto.
            'refunds' => $o->refunds->sortBy('refunded_on')->map(fn (Refund $r) => [
                'id' => $r->id, 'refunded_on' => $r->refunded_on->toDateString(), 'amount' => $r->amount,
                'method' => $r->method->value, 'reason' => $r->reason, 'created_by_name' => $r->creator?->name,
            ])->values()->all(),
            'total_refunded' => $o->totalRefunded(),
            'refundable' => $o->netPaid(),
            'events' => $o->events->map(fn (OrderEvent $e) => [
                'id' => $e->id, 'type' => $e->type->value, 'changes' => $e->changes,
                'user_name' => $e->user?->name, 'at' => $e->created_at->toIso8601String(),
            ])->values()->all(),
            // Alat yang dibawa (spek 8.4, modul Aset) — baca saja di Sheet order.
            'asset_checkouts' => $o->assetCheckouts->map(fn (AssetCheckout $c) => [
                'id' => $c->id, 'asset_id' => $c->asset_id, 'asset_code' => $c->asset->code, 'asset_name' => $c->asset->name,
                'quantity' => $c->quantity, 'holder' => $c->holder, 'due_back_on' => $c->due_back_on?->toDateString(),
                'returned_on' => $c->returned_on?->toDateString(), 'overdue' => $c->isOverdue(today()),
            ])->values()->all(),
            'job_costs' => $o->jobCosts->sortBy('incurred_on')->map(fn (JobCost $j) => [
                'id' => $j->id, 'incurred_on' => $j->incurred_on->toDateString(), 'category' => $j->category,
                'description' => $j->description, 'amount' => $j->amount, 'created_by_name' => $j->creator?->name,
            ])->values()->all(),
        ];
    }
}
