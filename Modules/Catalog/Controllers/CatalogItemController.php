<?php

namespace Modules\Catalog\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Catalog\Enums\ServiceCategory;
use Modules\Catalog\Models\CatalogItem;
use Modules\Catalog\Models\CatalogItemPhoto;
use Modules\Catalog\Requests\CatalogItemRequest;

/**
 * Katalog — modul fondasi: POS, form order, dan laporan HPP bergantung ke
 * sini (business-flow bagian 6).
 *
 * Tidak ada destroy: item yang pernah terjual hanya dinonaktifkan. Menghapus
 * memutus referensi item order lama dan laporan historis kehilangan nama
 * produknya. Nonaktif menyembunyikannya dari POS & form order.
 */
class CatalogItemController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('catalog::index', [
            // 'product' < 'service' — produk tampil lebih dulu, lalu urut input.
            'items' => CatalogItem::query()
                ->with('photos')
                ->orderBy('type')
                ->orderBy('id')
                ->get()
                ->map(fn (CatalogItem $i) => [
                    'id' => $i->id, 'name' => $i->name, 'type' => $i->type->value, 'price' => $i->price,
                    'unit_cost' => $i->unit_cost, 'category' => $i->category, 'is_active' => $i->is_active,
                    // Jasa data lama yang kategorinya tersesat — tidak muncul di Buat Order.
                    'unknown_category' => ! $i->hasKnownServiceCategory(),
                    // Profil publik + galeri (spek 7.1), sampul dulu.
                    'description' => $i->description, 'is_public' => $i->is_public,
                    'photos' => $i->photos->map(fn (CatalogItemPhoto $p) => $p->toProps())->values()->all(),
                ])->values()->all(),
            // Ambang penanda margin rendah (merah) di kolom Margin % produk.
            'low_margin_ratio' => (float) config('studio.low_margin_ratio'),
            'service_categories' => array_map(fn (ServiceCategory $c) => ['value' => $c->value, 'label' => $c->label()], ServiceCategory::cases()),
        ]);
    }

    public function store(CatalogItemRequest $request): RedirectResponse
    {
        $item = CatalogItem::create($request->catalogData());

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$item->name} ditambahkan ke katalog."]);
        // Dialog langsung pindah ke mode Edit item ini — foto baru bisa
        // ditambahkan setelah item punya id (spek 7.1).
        Inertia::flash('catalog_created', $item->id);

        return to_route('catalog.index');
    }

    public function update(CatalogItemRequest $request, CatalogItem $catalogItem): RedirectResponse
    {
        $catalogItem->update($request->catalogData());

        // Order lama tidak ikut berubah — item order menyimpan harga saat transaksi.
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$catalogItem->name} diperbarui. Harga baru berlaku untuk transaksi berikutnya."]);

        return to_route('catalog.index');
    }

    public function toggleActive(CatalogItem $catalogItem): RedirectResponse
    {
        $catalogItem->update(['is_active' => ! $catalogItem->is_active]);

        $message = $catalogItem->is_active
            ? "{$catalogItem->name} bisa dijual lagi."
            : "{$catalogItem->name} tidak lagi muncul di POS dan form order.";
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return to_route('catalog.index');
    }
}
