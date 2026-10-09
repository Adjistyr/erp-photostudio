<?php

namespace Modules\Catalog\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Catalog\Enums\ServiceCategory;
use Modules\Catalog\Models\CatalogItem;
use Modules\Catalog\Models\CatalogItemPhoto;
use Modules\Catalog\Models\CatalogItemVariant;
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
                ->with(['photos', 'variants'])
                ->orderBy('type')
                ->orderBy('id')
                ->get()
                ->map(fn (CatalogItem $i) => $this->itemProps($i))
                ->values()->all(),
            // Ambang penanda margin rendah (merah) di kolom Margin % produk.
            'low_margin_ratio' => (float) config('studio.low_margin_ratio'),
        ]);
    }

    /**
     * Tambah & Edit = satu halaman penuh (spek 7.2), bukan dialog — ruang
     * untuk galeri foto dan varian produk nanti.
     */
    public function create(): Response
    {
        return Inertia::render('catalog::form', ['item' => null, ...$this->formProps()]);
    }

    public function edit(CatalogItem $catalogItem): Response
    {
        $catalogItem->load(['photos', 'variants']);

        return Inertia::render('catalog::form', ['item' => $this->itemProps($catalogItem), ...$this->formProps()]);
    }

    public function store(CatalogItemRequest $request): RedirectResponse
    {
        $item = DB::transaction(function () use ($request) {
            $item = CatalogItem::create($request->catalogData());
            $this->saveVariants($item, $request);

            return $item;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$item->name} ditambahkan ke katalog. Tambahkan foto di bawah."]);

        // Ke halaman Edit item ini — foto baru bisa diunggah setelah item
        // punya id (spek 7.1/7.2).
        return to_route('catalog.edit', $item);
    }

    public function update(CatalogItemRequest $request, CatalogItem $catalogItem): RedirectResponse
    {
        DB::transaction(function () use ($request, $catalogItem) {
            $catalogItem->update($request->catalogData());
            $this->saveVariants($catalogItem, $request);
        });

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

    /**
     * Varian (spek 7.3): yang ber-id diperbarui, yang baru dibuat. Varian lama
     * yang tidak dikirim dibiarkan — varian tidak dihapus (dirujuk order).
     */
    private function saveVariants(CatalogItem $item, CatalogItemRequest $request): void
    {
        $rows = $request->variantsData();
        if ($rows === []) {
            return;
        }
        $offset = (int) $item->variants()->max('position');
        foreach ($rows as $i => $row) {
            $attributes = ['name' => $row['name'], 'price' => $row['price'], 'unit_cost' => $row['unit_cost'],
                'catalog_item_photo_id' => $row['catalog_item_photo_id'], 'is_active' => $row['is_active']];
            if ($row['id'] !== null) {
                // Rule exists sudah memastikan varian milik item ini.
                $item->variants()->whereKey($row['id'])->update([...$attributes, 'position' => $i + 1]);
            } else {
                $item->variants()->create([...$attributes, 'position' => $offset + $i + 1]);
            }
        }
        $item->syncPriceFromVariants();
    }

    /**
     * Bentuk satu item untuk daftar dan halaman form — satu sumber.
     *
     * @return array<string, mixed>
     */
    private function itemProps(CatalogItem $i): array
    {
        return [
            'id' => $i->id, 'name' => $i->name, 'type' => $i->type->value, 'price' => $i->price,
            'unit_cost' => $i->unit_cost, 'category' => $i->category, 'is_active' => $i->is_active,
            // Jasa data lama yang kategorinya tersesat — tidak muncul di Buat Order.
            'unknown_category' => ! $i->hasKnownServiceCategory(),
            // Profil publik + galeri (spek 7.1), sampul dulu.
            'description' => $i->description, 'is_public' => $i->is_public,
            'photos' => $i->photos->map(fn (CatalogItemPhoto $p) => $p->toProps())->values()->all(),
            // Varian produk (spek 7.3), aktif maupun nonaktif.
            'variants' => $i->variants->map(fn (CatalogItemVariant $v) => $v->toProps())->values()->all(),
        ];
    }

    /** @return array{service_categories: list<array{value: string, label: string}>, low_margin_ratio: float} */
    private function formProps(): array
    {
        return [
            'service_categories' => array_map(fn (ServiceCategory $c) => ['value' => $c->value, 'label' => $c->label()], ServiceCategory::cases()),
            'low_margin_ratio' => (float) config('studio.low_margin_ratio'),
        ];
    }
}
