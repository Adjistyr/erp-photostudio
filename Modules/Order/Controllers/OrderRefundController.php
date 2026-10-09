<?php

namespace Modules\Order\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Modules\Finance\Rules\OpenPeriod;
use Modules\Order\Actions\RecordOrderEvent;
use Modules\Order\Enums\OrderEventType;
use Modules\Order\Models\Order;
use Modules\Order\Models\Refund;
use Modules\Order\Requests\StoreRefundRequest;
use Modules\Shared\Support\Money;

/**
 * Pengembalian uang ke customer (spek 4.2, K3) — pola sama dengan
 * OrderPaymentController: catat, atau hapus bila salah catat (bulan masih
 * terbuka). Status bayar & sisa tagihan tidak berubah (bruto); yang berubah
 * omzet bulan pengembalian dan margin order.
 */
class OrderRefundController extends Controller
{
    /**
     * `Order $order` dideklarasikan supaya route model binding terjadi —
     * StoreRefundRequest membaca model itu saat validasi.
     */
    public function store(StoreRefundRequest $request, Order $order, RecordOrderEvent $events): RedirectResponse
    {
        $order = $request->order();
        /** @var array{refunded_on: string, amount: int|string, method: string, reason: string} $data */
        $data = $request->validated();

        DB::transaction(function () use ($order, $data, $events) {
            $refund = $order->refunds()->create($data);
            $events->execute($order, OrderEventType::Refunded, [
                'amount' => ['from' => null, 'to' => $refund->amount],
                'method' => ['from' => null, 'to' => $refund->method->value],
                'reason' => ['from' => null, 'to' => $refund->reason],
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengembalian '.Money::format((int) $data['amount'])." untuk {$order->number} tercatat."]);

        return back();
    }

    /** Hapus pengembalian salah catat — hanya bila bulannya belum tutup buku. */
    public function destroy(Order $order, Refund $refund, RecordOrderEvent $events): RedirectResponse
    {
        OpenPeriod::ensureOpen($refund->refunded_on);
        DB::transaction(function () use ($order, $refund, $events) {
            $events->execute($order, OrderEventType::Refunded, [
                'amount' => ['from' => $refund->amount, 'to' => null],
                'deleted_refund_id' => ['from' => $refund->id, 'to' => null],
            ]);
            $refund->delete();
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengembalian '.Money::format($refund->amount)." untuk {$order->number} dihapus."]);

        return back();
    }
}
