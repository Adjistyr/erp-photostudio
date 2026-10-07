<?php

namespace Modules\Order\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Catalog\Models\CatalogItem;
use Modules\Customer\Models\Customer;
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
        ]);
    }

    /** Order + item + pelunasan dalam satu transaksi. */
    public function store(StorePosSaleRequest $request, RecordOrderEvent $events): RedirectResponse
    {
        $discount = $request->discount();
        $total = $request->subtotal() - $discount;
        $name = $request->string('customer_name')->trim()->value();

        $order = DB::transaction(function () use ($request, $discount, $total, $name, $events) {
            // Di dalam transaksi: customer baru tidak boleh tertinggal kalau order gagal.
            $customer = $this->customerFor($name, $request->customerPhone());
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

            foreach ($request->lines() as ['item' => $item, 'quantity' => $quantity]) {
                $order->items()->create([
                    'catalog_item_id' => $item->id,
                    'name' => $item->name,
                    'quantity' => $quantity,
                    'unit_price' => $item->price,
                    'unit_cost' => $item->unit_cost,
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

    /**
     * Nama kosong → walk-in tanpa customer (HP diabaikan: baris customer
     * tanpa nama tidak berguna di daftar blast dan menghitung customer palsu).
     * Nama diisi → cocokkan HP dulu (lebih unik), lalu nama tanpa beda huruf
     * besar, lalu buat baru. Customer yang cocok lewat nama dan belum punya
     * HP dilengkapi; yang sudah punya HP berbeda TIDAK ditimpa — dua orang
     * bernama sama lebih mungkin daripada satu orang ganti nomor.
     *
     * ponytail: cocok HP → nama; dua customer bernama sama tanpa HP → yang
     * tercatat lebih dulu. Tambah pilih-dari-daftar kalau mulai sering bentrok.
     */
    private function customerFor(string $name, ?string $phone): ?Customer
    {
        if ($name === '') {
            return null;
        }

        if ($phone !== null) {
            // Data lama bisa tersimpan `08…` — bandingkan bentuk ternormalisasi
            // kedua sisi di SQL (PostgreSQL), bukan memuat semua customer.
            $byPhone = Customer::whereNotNull('phone')
                ->whereRaw("regexp_replace(regexp_replace(phone, '\\D', '', 'g'), '^0', '62') = ?", [$phone])
                ->orderBy('id')->first();
            if ($byPhone !== null) {
                return $byPhone;
            }
        }

        $byName = Customer::whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->orderBy('id')->first();
        if ($byName !== null) {
            if ($phone !== null && ($byName->phone === null || $byName->phone === '')) {
                $byName->update(['phone' => $phone]);
            }

            return $byName;
        }

        return Customer::create(['name' => $name, 'phone' => $phone]);
    }
}
