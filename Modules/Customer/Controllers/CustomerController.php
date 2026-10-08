<?php

namespace Modules\Customer\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Customer\Models\Customer;
use Modules\Customer\Requests\CustomerRequest;
use Modules\Finance\Services\CustomerSummary;
use Modules\Finance\Services\SalesReport;
use Modules\Order\Models\Order;
use Modules\Shared\Enums\BusinessLine;
use Modules\Shared\Http\ListQuery;

/**
 * Customer — pendataan untuk blast, bukan sales pipeline (business-flow 5.6).
 * Customer terkumpul dari order; tambah manual untuk lead yang masuk sebelum
 * transaksi. Tidak ada destroy: customer dirujuk order.
 */
class CustomerController extends Controller
{
    /**
     * Paginasi CUSTOMER dulu, baru ringkasan untuk 25 customer di halaman itu
     * (spek 3.1) — bukan menghitung ringkasan semua customer lalu memotong.
     * Urut nama: urutan nilai order butuh agregat di SQL untuk tiap halaman.
     */
    public function index(Request $request, SalesReport $sales): Response
    {
        $list = ListQuery::fromRequest($request, ['line' => BusinessLine::values()]);
        $page = Customer::with(['orders.items', 'orders.payments'])
            ->search($list)
            ->orderBy('name')
            ->orderBy('id')
            ->paginate(ListQuery::PER_PAGE)
            ->withQueryString();
        $summaries = $sales->customerSummaries($page->items());

        return Inertia::render('customer::index', [
            'customers' => [
                ...ListQuery::paginated($page, fn () => []),
                'data' => array_map($this->summaryProps(...), $summaries),
            ],
            'filters' => $list->toArray(),
            'sources' => Customer::SOURCES,
        ]);
    }

    public function store(CustomerRequest $request): RedirectResponse
    {
        $customer = Customer::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$customer->name} ditambahkan."]);

        return to_route('customers.index');
    }

    public function update(CustomerRequest $request, Customer $customer): RedirectResponse
    {
        $customer->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => "Data {$customer->name} diperbarui."]);

        return to_route('customers.index');
    }

    /**
     * Status bayar & persen DP dihitung di server (Order) — layar tidak
     * menurunkan ulang, supaya aturannya hanya ada di satu tempat.
     *
     * @return array<string, mixed>
     */
    private function summaryProps(CustomerSummary $s): array
    {
        $live = $s->orders->reject(fn (Order $o) => $o->isCancelled());

        return [
            'id' => $s->customer->id,
            'name' => $s->customer->name,
            'phone' => $s->customer->phone,
            'email' => $s->customer->email,
            'source' => $s->customer->source,
            'notes' => $s->customer->notes,
            'order_count' => $s->orderCount,
            'order_value' => $s->orderValue,
            'paid' => $s->paid,
            // Order Batal tidak ditagih lagi.
            'outstanding' => $live->sum(fn (Order $o) => max(0, $o->balance())),
            'lines' => array_map(fn ($l) => $l->value, $s->lines),
            'last_transaction' => $s->lastTransaction?->toDateString(),
            'orders' => $s->orders->map(fn (Order $o) => [
                'id' => $o->id,
                'number' => $o->number,
                'items_summary' => $o->itemsSummary(),
                'service_date' => $o->service_date->toDateString(),
                'service_time' => $o->service_time === null ? null : substr($o->service_time, 0, 5),
                'total' => $o->total(),
                'balance' => $o->balance(),
                'work_status' => $o->work_status->value,
                'payment_status' => $o->paymentStatus()->value,
                'paid_percent' => (int) round($o->paidRatio() * 100),
            ])->values()->all(),
        ];
    }
}
