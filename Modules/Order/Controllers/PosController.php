<?php

namespace Modules\Order\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Catalog\Models\CatalogItem;
use Modules\Customer\Actions\FindOrCreateCustomer;
use Modules\Order\Actions\RecordOrderEvent;
use Modules\Order\Enums\OrderEventType;
use Modules\Order\Enums\PaymentStatus;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Modules\Order\Models\Payment;
use Modules\Order\Requests\StorePosSaleRequest;
use Modules\Shared\Enums\BusinessLine;
use Modules\Shared\Support\Money;

/**
 * POS — transaksi walk-in retail (prompt 4.12). Target: satu transaksi < 30
 * detik (business-flow bagian 1). Risiko terbesar proyek ini disiplin input,
 * jadi semua yang bisa diturunkan (tanggal, status, keterangan bayar, HPP)
 * tidak ditanyakan ke owner.
 */
class PosController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('order::pos', [
            'products' => CatalogItem::where('is_active', true)
                ->where('type', CatalogItemType::Product)
                ->orderBy('name')
                ->get(['id', 'name', 'price', 'unit_cost']),
            // Nama studio untuk pesan WA struk.
            'studio' => config('studio'),
            ...$this->todaySales(),
        ]);
    }

    /**
     * Transaksi POS hari ini (spek 2.5): 50 terbaru, urut id — bukan nomor:
     * `number` string ("ORD-10000" < "ORD-9999"). Order batal tetap tampil
     * (supaya "sudah tercatat?" tidak menyesatkan) tapi tidak dijumlah dan
     * tidak punya link struk.
     *
     * @return array{today_sales: array<int, array<string, mixed>>, today_total: int}
     */
    private function todaySales(): array
    {
        $sales = Order::with(['customer', 'items', 'payments'])
            ->where('business_line', BusinessLine::Retail)
            ->whereDate('service_date', today()->toDateString())
            ->latest('id')
            ->limit(50)
            ->get();

        return [
            'today_sales' => $sales->map(fn (Order $o) => [
                'id' => $o->id,
                'number' => $o->number,
                // created_at dalam zona waktu app (Asia/Jakarta).
                'time' => $o->created_at?->format('H:i'),
                'items_summary' => $o->itemsSummary(),
                'total' => $o->total(),
                // ponytail: POS = satu pembayaran; jadi daftar kalau split payment (4.4) ada.
                'method' => $o->payments->first()?->method->value,
                'cancelled' => $o->isCancelled(),
                'customer_name' => $o->customer?->name,
                'customer_phone' => $o->customer?->phone,
                'invoice_url' => $o->isCancelled() ? null : $o->invoiceUrl(),
                'print_url' => $o->isCancelled() ? null : $o->invoiceUrl(print: true),
            ])->values()->all(),
            'today_total' => (int) $sales->reject(fn (Order $o) => $o->isCancelled())->sum(fn (Order $o) => $o->total()),
        ];
    }

    /** Order + item + pelunasan dalam satu transaksi. */
    public function store(StorePosSaleRequest $request, RecordOrderEvent $events, FindOrCreateCustomer $findOrCreate): RedirectResponse
    {
        $discount = $request->discount();
        $total = $request->subtotal() - $discount;
        $name = $request->string('customer_name')->trim()->value();

        $order = DB::transaction(function () use ($request, $discount, $total, $name, $events, $findOrCreate) {
            // Di dalam transaksi: customer baru tidak boleh tertinggal kalau order gagal.
            // Nama kosong → walk-in tanpa customer (HP diabaikan: baris customer
            // tanpa nama tidak berguna di daftar blast dan menghitung customer palsu).
            $customer = $name === '' ? null : $findOrCreate->execute($name, $request->customerPhone());
            $order = Order::create([
                'number' => Order::nextNumber(),
                // Null = walk-in tanpa nama — bukan baris customer "Umum" (docs/database.md).
                'customer_id' => $customer?->id,
                'business_line' => BusinessLine::Retail,
                'service_date' => today()->toDateString(),
                // Barang dibawa pulang saat itu juga (business-flow 5.1).
                'work_status' => WorkStatus::Delivered,
                'discount' => $discount,
            ]);

            // POS selalu baris katalog — rule mewajibkan catalog_item_id.
            foreach ($request->lines() as $line) {
                $order->items()->create([
                    'catalog_item_id' => $line['item']?->id,
                    'name' => $line['name'],
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'unit_cost' => $line['unit_cost'],
                ]);
            }

            $payment = $order->payments()->create([
                'paid_on' => today()->toDateString(),
                'amount' => $total,
                'method' => $request->validated('method'),
                'note' => 'Pelunasan',
            ]);

            $events->execute($order, OrderEventType::Created, [
                'work_status' => ['from' => null, 'to' => WorkStatus::Delivered->value],
                'total' => ['from' => null, 'to' => $total],
            ]);
            $events->execute($order, OrderEventType::PaymentRecorded, Payment::eventChanges($payment, recorded: true));

            return $order;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$order->number} tersimpan · ".Money::format($total).' — masuk omzet hari ini.']);
        // Struk sekali tampil (flash, bukan props): refresh tidak memunculkannya
        // lagi. Struk = invoice retail yang lunas — link publik yang sama.
        Inertia::flash('receipt', [
            'order_id' => $order->id,
            'number' => $order->number,
            'total' => $total,
            'balance' => 0,
            'payment_status' => PaymentStatus::Paid->value,
            'invoice_url' => $order->invoiceUrl(),
            'print_url' => $order->invoiceUrl(print: true),
            'customer_phone' => $order->customer?->phone,
            'business_line' => BusinessLine::Retail->value,
        ]);

        return to_route('pos.index');
    }
}
