<?php

namespace Modules\Finance\Services;

use Illuminate\Support\Collection;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Catalog\Models\CatalogItem;
use Modules\Catalog\Models\CatalogItemVariant;
use Modules\Customer\Models\Customer;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Modules\Order\Models\OrderItem;
use Modules\Shared\Enums\BusinessLine;

class SalesReport
{
    /**
     * Produk terlaris — hanya produk fisik (punya HPP katalog). Qty 0 TETAP
     * tampil: produk tak laku adalah kandidat pertama dihentikan.
     *
     * Omzet & HPP memakai harga katalog × qty, mengikuti prototype; order
     * dihitung kalau menerima pembayaran di bulan itu (basis kas).
     *
     * Produk bervarian (spek 7.3) dipecah per varian dengan harga varian —
     * varian aktif selalu tampil, varian nonaktif hanya bila terjual.
     *
     * @return list<ProductSales>
     */
    public function topProducts(string $month): array
    {
        $sold = OrderItem::query()
            ->whereNotNull('catalog_item_id')
            ->whereHas('order.payments', fn ($q) => $q->whereBetween('paid_on', [Periods::start($month), Periods::end($month)]))
            ->get()
            ->groupBy(fn (OrderItem $i) => $i->catalog_item_id.':'.($i->catalog_item_variant_id ?? 0))
            ->map(fn (Collection $items) => (int) $items->sum('quantity'));

        $rows = CatalogItem::where('type', CatalogItemType::Product)->with('variants')->orderBy('id')->get()
            ->flatMap(function (CatalogItem $item) use ($sold) {
                $rows = $item->variants
                    ->filter(fn (CatalogItemVariant $v) => $v->is_active || $sold->has("{$item->id}:{$v->id}"))
                    ->map(fn (CatalogItemVariant $v) => $this->productRow($item, (int) $sold->get("{$item->id}:{$v->id}", 0), $v->price, $v->unit_cost, $v))
                    ->values();
                // Produk tanpa varian, atau penjualan sebelum produk punya varian.
                $plain = (int) $sold->get("{$item->id}:0", 0);
                if ($item->variants->isEmpty() || $plain > 0) {
                    $rows->push($this->productRow($item, $plain, $item->price, $item->unit_cost ?? 0));
                }

                return $rows;
            })
            ->sortByDesc(fn (ProductSales $p) => $p->revenue)
            ->values()
            ->all();

        return array_values($rows);
    }

    private function productRow(CatalogItem $item, int $qty, int $price, int $unitCost, ?CatalogItemVariant $variant = null): ProductSales
    {
        $revenue = $qty * $price;
        $cost = $qty * $unitCost;

        return new ProductSales($item, $qty, $revenue, $cost, $revenue - $cost, $revenue === 0 ? 0.0 : ($revenue - $cost) / $revenue, $variant);
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
     * Item custom (tanpa katalog, harga nego — spek 1.3) dari order yang tidak
     * batal, dengan cakupan yang sama dengan topServices(). Tidak masuk
     * ranking per paket (tidak ada paketnya), tapi nilainya tidak boleh hilang
     * dari laporan. null = tidak ada.
     *
     * ponytail: array, bukan DTO — tiga angka satu baris; buat kelas kalau
     * mulai dipakai di layar lain.
     *
     * @return array{order_count: int, quantity: int, value: int}|null
     */
    public function customItems(): ?array
    {
        $items = OrderItem::query()
            ->whereNull('catalog_item_id')
            ->whereHas('order', fn ($q) => $q
                ->where('work_status', '!=', WorkStatus::Cancelled)
                ->where('business_line', '!=', BusinessLine::Retail))
            ->get();

        if ($items->isEmpty()) {
            return null;
        }

        return [
            'order_count' => $items->pluck('order_id')->unique()->count(),
            'quantity' => (int) $items->sum('quantity'),
            'value' => (int) $items->sum(fn (OrderItem $i) => $i->quantity * $i->unit_price),
        ];
    }

    /**
     * Ringkasan per customer. Order Batal dikeluarkan dari nilai & jumlah
     * order, tapi tetap di riwayat. Customer TANPA order tetap tampil — lead
     * yang kontaknya masuk sebelum transaksi.
     *
     * `$customers` = satu halaman daftar Customer (spek 3.1; urutan dipertahankan,
     * relasi `orders.items` & `orders.payments` harus sudah dimuat). null =
     * semua customer, diurutkan nilai order (Laporan Penjualan, Komunikasi).
     *
     * @param  iterable<Customer>|null  $customers
     * @return list<CustomerSummary>
     */
    public function customerSummaries(?iterable $customers = null): array
    {
        $sorted = $customers === null;
        $customers = $customers === null
            ? Customer::with(['orders.items', 'orders.payments'])->get()
            : collect($customers);

        $rows = $customers
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
            });
        if ($sorted) {
            $rows = $rows->sortByDesc(fn (CustomerSummary $s) => $s->orderValue);
        }

        return array_values($rows->values()->all());
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
