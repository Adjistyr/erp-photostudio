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
use Modules\Order\Models\Payment;
use Modules\Order\Requests\StorePaymentRequest;
use Modules\Shared\Support\Money;

class OrderPaymentController extends Controller
{
    /**
     * Keterangan diturunkan, bukan diketik: pelunasan kalau menutup sisa
     * tagihan, DP kalau pembayaran pertama, sisanya termin.
     *
     * `Order $order` wajib dideklarasikan walau tidak dipakai langsung: route
     * model binding hanya terjadi untuk parameter bertipe di signature, dan
     * StorePaymentRequest membaca model itu saat validasi.
     */
    public function store(StorePaymentRequest $request, Order $order, RecordOrderEvent $events): RedirectResponse
    {
        $order = $request->order();
        $amount = (int) $request->validated('amount');
        $note = match (true) {
            $amount >= $order->balance() => 'Pelunasan',
            $order->payments->isEmpty() => 'DP',
            default => 'Termin',
        };

        $payment = DB::transaction(function () use ($order, $request, $amount, $note, $events) {
            $payment = $order->payments()->create([
                'paid_on' => $request->validated('paid_on'),
                'amount' => $amount,
                'method' => $request->validated('method'),
                'note' => $note,
            ]);
            $events->execute($order, OrderEventType::PaymentRecorded, Payment::eventChanges($payment, recorded: true));

            return $payment;
        });
        // Saldo & status di bukti bayar harus SETELAH pembayaran ini.
        $order->payments->push($payment);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$note} ".Money::format($amount)." untuk {$order->number} tercatat."]);
        // Bukti untuk customer = link invoice yang sama (sudah memuat pembayaran
        // ini), ditawarkan di ReceiptSheet layar asal. Tiga field terakhir hanya
        // ada di jalur pembayaran — POS tidak mengirimnya.
        Inertia::flash('receipt', [
            'order_id' => $order->id,
            'number' => $order->number,
            'total' => $order->total(),
            'balance' => $order->balance(),
            'payment_status' => $order->paymentStatus()->value,
            'invoice_url' => $order->invoiceUrl(),
            'print_url' => $order->invoiceUrl(print: true),
            'customer_phone' => $order->customer?->phone,
            'business_line' => $order->business_line->value,
            'paid_amount' => $amount,
            'paid_on' => $request->validated('paid_on'),
            'due_on' => $order->service_date->toDateString(),
        ]);

        // Kembali ke layar asal: dialog ini dipakai Detail Order DAN layar
        // Pembayaran — owner yang menagih dari daftar piutang tidak boleh
        // dilempar ke daftar order.
        return back();
    }

    /**
     * Hapus pembayaran salah catat (keputusan owner 2026-10-06): hapus lalu
     * catat ulang, bukan edit. Status bayar ikut turun sendiri — turunan.
     */
    public function destroy(Order $order, Payment $payment, RecordOrderEvent $events): RedirectResponse
    {
        OpenPeriod::ensureOpen($payment->paid_on);
        DB::transaction(function () use ($order, $payment, $events) {
            $events->execute($order, OrderEventType::PaymentDeleted, Payment::eventChanges($payment, recorded: false));
            $payment->delete();
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "Pembayaran {$payment->note} ".Money::format($payment->amount)." untuk {$order->number} dihapus."]);

        return back();
    }
}
