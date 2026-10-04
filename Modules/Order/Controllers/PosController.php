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
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
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
        ]);
    }

    /** Order + item + pelunasan dalam satu transaksi. */
    public function store(StorePosSaleRequest $request): RedirectResponse
    {
        $discount = $request->discount();
        $total = $request->subtotal() - $discount;
        $customer = $this->customerFor($request->string('customer_name')->trim()->value());

        $order = DB::transaction(function () use ($request, $discount, $total, $customer) {
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

            $order->payments()->create([
                'paid_on' => today()->toDateString(),
                'amount' => $total,
                'method' => $request->validated('method'),
                'note' => 'Pelunasan',
            ]);

            return $order;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$order->number} tersimpan · ".Money::format($total).' — masuk omzet hari ini.']);

        return to_route('pos.index');
    }

    /**
     * Nama diisi → pakai customer yang namanya sama (tanpa beda huruf besar),
     * atau buat baru. Kosong → walk-in tanpa customer.
     *
     * ponytail: cocok berdasarkan nama saja; dua customer bernama sama →
     * yang tercatat lebih dulu. Tambah pencarian/pilih customer kalau mulai
     * sering bentrok.
     */
    private function customerFor(string $name): ?Customer
    {
        if ($name === '') {
            return null;
        }

        return Customer::whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->orderBy('id')->first()
            ?? Customer::create(['name' => $name]);
    }
}
