<?php

namespace App\Http\Controllers;

use App\Enums\WorkStatus;
use App\Http\Requests\CancelOrderRequest;
use App\Http\Requests\OrderResultLinkRequest;
use App\Models\JobCost;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

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
        $orders = Order::with(['customer', 'items', 'payments', 'jobCosts'])
            ->orderByDesc('number')
            ->get();

        return Inertia::render('orders/index', [
            'orders' => $orders->map($this->orderProps(...))->values()->all(),
        ]);
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
            'business_line' => $o->business_line->value,
            'items_summary' => $o->itemsSummary(),
            'service_date' => $o->service_date->toDateString(),
            'service_time' => $o->service_time === null ? null : substr($o->service_time, 0, 5),
            'location' => $o->location,
            'notes' => $o->notes,
            'result_link' => $o->result_link,
            'total' => $total,
            'paid' => $o->totalPaid(),
            'balance' => $o->balance(),
            'direct_cost' => $direct,
            'margin' => $total - $direct,
            'work_status' => $o->work_status->value,
            'next_status' => $o->work_status->next()?->value,
            'payment_status' => $o->paymentStatus()->value,
            'paid_percent' => (int) round($o->paidRatio() * 100),
            'items' => $o->items->map(fn (OrderItem $i) => [
                'id' => $i->id, 'name' => $i->name, 'quantity' => $i->quantity, 'unit_price' => $i->unit_price,
            ])->values()->all(),
            'payments' => $o->payments->sortBy('paid_on')->map(fn (Payment $p) => [
                'id' => $p->id, 'paid_on' => $p->paid_on->toDateString(), 'amount' => $p->amount,
                'method' => $p->method->value, 'note' => $p->note,
            ])->values()->all(),
            'job_costs' => $o->jobCosts->sortBy('incurred_on')->map(fn (JobCost $j) => [
                'id' => $j->id, 'incurred_on' => $j->incurred_on->toDateString(), 'category' => $j->category,
                'description' => $j->description, 'amount' => $j->amount,
            ])->values()->all(),
        ];
    }
}
