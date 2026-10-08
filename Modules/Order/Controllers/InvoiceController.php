<?php

namespace Modules\Order\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Customer\Models\MessageTemplate;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Modules\Order\Models\OrderItem;
use Modules\Order\Models\Payment;
use Modules\Shared\Enums\BusinessLine;
use Modules\Shared\Http\ListQuery;

/**
 * Invoice — DIGENERATE dari order, tidak diketik ulang (business-flow 5.5).
 * Tidak ada tombol "Buat Invoice": invoicenya ada begitu ordernya ada, dan
 * satu invoice dikirim berkali-kali seiring pembayaran bertambah.
 */
class InvoiceController extends Controller
{
    /** Pencarian + paginasi sama dengan Order & Booking (spek 3.1); order batal tetap disaring. */
    public function index(Request $request): Response
    {
        $list = ListQuery::fromRequest($request, [
            'line' => BusinessLine::values(),
            'pay' => ['unpaid', 'partial', 'paid'],
        ]);
        $orders = Order::with(['customer', 'items', 'payments'])
            ->where('work_status', '!=', WorkStatus::Cancelled)
            ->search($list)
            ->orderByDesc('id')
            ->paginate(ListQuery::PER_PAGE)
            ->withQueryString();

        return Inertia::render('order::invoices', [
            'invoices' => ListQuery::paginated($orders, $this->invoiceProps(...)),
            'filters' => $list->toArray(),
            'studio' => config('studio'),
            // Teks "Buka WhatsApp" untuk invoice belum lunas (K5).
            'billing_template' => MessageTemplate::bodyFor('billing'),
        ]);
    }

    /**
     * Halaman yang dibuka customer (route `signed`, tanpa login). Order batal
     * tidak punya invoice — link lama yang terlanjur dikirim berhenti berlaku.
     */
    public function show(Request $request, Order $order): Response
    {
        abort_if($order->isCancelled(), 404);

        return Inertia::render('order::invoice-public', [
            'invoice' => $this->invoiceProps($order->load(['customer', 'items', 'payments'])),
            'studio' => config('studio'),
            // Hanya dari `print_url` (ditandatangani dengan print=1) — lihat Order::invoiceUrl().
            'auto_print' => $request->boolean('print'),
        ]);
    }

    /** @return array<string, mixed> */
    private function invoiceProps(Order $o): array
    {
        return [
            'id' => $o->id,
            'number' => $o->invoiceNumber(),
            'order_number' => $o->number,
            'customer_name' => $o->customer?->name,
            'customer_phone' => $o->customer?->phone,
            'business_line' => $o->business_line->value,
            'items_summary' => $o->itemsSummary(),
            'service_date' => $o->service_date->toDateString(),
            'service_time' => $o->service_time === null ? null : substr($o->service_time, 0, 5),
            'location' => $o->location,
            'items' => $o->items->map(fn (OrderItem $i) => [
                'id' => $i->id, 'name' => $i->name, 'quantity' => $i->quantity, 'unit_price' => $i->unit_price,
                'is_custom' => $i->catalog_item_id === null,
            ])->values()->all(),
            'discount' => $o->discount,
            'total' => $o->total(),
            'payments' => $o->payments->sortBy('paid_on')->map(fn (Payment $p) => [
                'id' => $p->id, 'paid_on' => $p->paid_on->toDateString(), 'method' => $p->method->value,
                'note' => $p->note, 'amount' => $p->amount,
            ])->values()->all(),
            'paid' => $o->totalPaid(),
            'balance' => $o->balance(),
            'payment_status' => $o->paymentStatus()->value,
            'paid_percent' => (int) round($o->paidRatio() * 100),
            'public_url' => $o->invoiceUrl(),
            'print_url' => $o->invoiceUrl(print: true),
        ];
    }
}
