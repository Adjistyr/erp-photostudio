<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePaymentRequest;
use App\Models\Order;
use App\Services\Finance\Money;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

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
    public function store(StorePaymentRequest $request, Order $order): RedirectResponse
    {
        $order = $request->order();
        $amount = (int) $request->validated('amount');
        $note = match (true) {
            $amount >= $order->balance() => 'Pelunasan',
            $order->payments->isEmpty() => 'DP',
            default => 'Termin',
        };

        $order->payments()->create([
            'paid_on' => $request->validated('paid_on'),
            'amount' => $amount,
            'method' => $request->validated('method'),
            'note' => $note,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$note} ".Money::format($amount)." untuk {$order->number} tercatat."]);

        return to_route('orders.index');
    }
}
