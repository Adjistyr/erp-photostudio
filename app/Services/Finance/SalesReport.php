<?php

namespace App\Services\Finance;

use App\Enums\BusinessLine;
use App\Enums\CatalogItemType;
use App\Enums\WorkStatus;
use App\Models\CatalogItem;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Support\Collection;

class SalesReport
{
    /**
     * Produk terlaris — hanya produk fisik (punya HPP katalog). Qty 0 TETAP
     * tampil: produk tak laku adalah kandidat pertama dihentikan.
     *
     * Omzet & HPP memakai harga katalog × qty, mengikuti prototype; order
     * dihitung kalau menerima pembayaran di bulan itu (basis kas).
     *
     * @return list<ProductSales>
     */
    public function topProducts(string $month): array
    {
        $sold = OrderItem::query()
            ->whereNotNull('catalog_item_id')
            ->whereHas('order.payments', fn ($q) => $q->whereBetween('paid_on', [Periods::start($month), Periods::end($month)]))
            ->get()
            ->groupBy('catalog_item_id')
            ->map(fn (Collection $items) => (int) $items->sum('quantity'));

        $rows = CatalogItem::where('type', CatalogItemType::Product)->orderBy('id')->get()
            ->map(function (CatalogItem $item) use ($sold) {
                $qty = (int) $sold->get($item->id, 0);
                $revenue = $qty * $item->price;
                $cost = $qty * ($item->unit_cost ?? 0);

                return new ProductSales($item, $qty, $revenue, $cost, $revenue - $cost, $revenue === 0 ? 0.0 : ($revenue - $cost) / $revenue);
            })
            ->sortByDesc(fn (ProductSales $p) => $p->revenue)
            ->values()
            ->all();

        return array_values($rows);
    }

    /**
     * Jasa terlaris berdasarkan NILAI ORDER, bukan uang diterima — wedding
     * yang baru DP tetap dihitung penuh. Menjawab "paket mana yang laku".
     * Order Batal tidak dihitung.
     *
     * @return list<ServiceSales>
     */
    public function topServices(): array
    {
        $items = OrderItem::query()
            ->with('catalogItem')
            ->whereHas('catalogItem', fn ($q) => $q->where('type', CatalogItemType::Service))
            ->whereHas('order', fn ($q) => $q->where('work_status', '!=', WorkStatus::Cancelled))
            ->get();

        $rows = $items->groupBy('catalog_item_id')
            ->map(function (Collection $group) {
                /** @var OrderItem $first */
                $first = $group->first();

                return new ServiceSales(
                    $first->catalogItem ?? throw new \LogicException('Item jasa tanpa katalog'),
                    (int) $group->sum('quantity'),
                    (int) $group->sum(fn (OrderItem $i) => $i->quantity * $i->unit_price),
                );
            })
            ->sortByDesc(fn (ServiceSales $s) => $s->value)
            ->values()
            ->all();

        return array_values($rows);
    }

    /**
     * Ringkasan per customer. Order Batal dikeluarkan dari nilai & jumlah
     * order, tapi tetap di riwayat. Customer TANPA order tetap tampil — lead
     * yang kontaknya masuk sebelum transaksi.
     *
     * @return list<CustomerSummary>
     */
    public function customerSummaries(): array
    {
        $rows = Customer::with(['orders.items', 'orders.payments'])->get()
            ->map(function (Customer $c) {
                $all = $c->orders->sortByDesc('number')->values()->toBase();
                $live = $all->reject(fn (Order $o) => $o->isCancelled());
                $lines = $live->map(fn (Order $o) => $o->business_line)->unique(fn (BusinessLine $l) => $l->value)->values()->all();

                return new CustomerSummary(
                    customer: $c,
                    orders: $all,
                    orderCount: $live->count(),
                    orderValue: $live->sum(fn (Order $o) => $o->total()),
                    paid: $live->sum(fn (Order $o) => $o->totalPaid()),
                    lines: array_values($lines),
                    lastTransaction: $all->max(fn (Order $o) => $o->service_date),
                );
            })
            ->sortByDesc(fn (CustomerSummary $s) => $s->orderValue)
            ->values()
            ->all();

        return array_values($rows);
    }

    /**
     * Booking hari ini. Retail dikecualikan: walk-in lahir langsung berstatus
     * Diserahkan — KPI ini untuk pekerjaan yang menunggu owner.
     *
     * @return Collection<int, Order>
     */
    public function bookingsToday(): Collection
    {
        return Order::with(['items', 'payments', 'customer'])
            ->where('business_line', '!=', BusinessLine::Retail)
            ->where('work_status', '!=', WorkStatus::Cancelled)
            ->whereDate('service_date', today())
            ->orderBy('service_time')
            ->get()
            ->toBase();
    }
}
