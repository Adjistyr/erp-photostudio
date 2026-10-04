<?php

namespace Modules\Order\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Modules\Order\Models\Order;
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

        // Kembali ke layar asal: dialog ini dipakai Detail Order DAN layar
        // Pembayaran — owner yang menagih dari daftar piutang tidak boleh
        // dilempar ke daftar order.
        return back();
    }
}
