<?php

namespace Modules\Catalog\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Catalog\Enums\ServiceCategory;
use Modules\Catalog\Models\CatalogItem;
use Modules\Catalog\Models\CatalogItemPhoto;
use Modules\Catalog\Models\CatalogItemVariant;
use Modules\Catalog\Models\CatalogPriceChange;
use Modules\Catalog\Requests\CatalogItemRequest;
use Modules\Catalog\Requests\UpdateBundleComponentsRequest;
use Modules\Shared\Support\Finance;

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
                ->with(['photos', 'variants', 'components'])
                ->orderBy('type')
                ->orderBy('id')
                ->get()
                ->map(fn (CatalogItem $i) => $this->itemProps($i))
                ->values()->all(),
            // Ambang penanda margin rendah (merah) di kolom Margin % produk — hanya owner (spek 5.1).
            ...Finance::only(fn () => ['low_margin_ratio' => (float) config('studio.low_margin_ratio')]),
        ]);
    }

    /**
     * Tambah & Edit = satu halaman penuh (spek 7.2), bukan dialog — ruang
     * untuk galeri foto dan varian produk nanti.
     */
    public function create(): Response
    {
        return Inertia::render('catalog::form', ['item' => null, 'price_changes' => [], ...$this->formProps()]);
    }

    public function edit(CatalogItem $catalogItem): Response
    {
        $catalogItem->load(['photos', 'variants', 'components']);

        return Inertia::render('catalog::form', [
            'item' => $this->itemProps($catalogItem),
            // Riwayat harga (spek 6.5), terbaru dulu.
            // ponytail: 20 cukup; paginasi bila item punya > 20 perubahan
            'price_changes' => $catalogItem->priceChanges()->with('creator')->limit(20)->get()
                ->map(fn (CatalogPriceChange $c) => $c->toProps())->values()->all(),
            ...$this->formProps($catalogItem),
        ]);
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
     * Komponen paket jasa (spek 6.3) — seluruh daftar diganti; yang tidak
     * dikirim benar-benar dihapus dari paket. Order lama tidak berubah: HPP &
     * komponen sudah disalin ke baris order saat transaksi.
     */
    public function updateComponents(UpdateBundleComponentsRequest $request, CatalogItem $catalogItem): RedirectResponse
    {
        $catalogItem->components()->sync($request->syncData());

        Inertia::flash('toast', ['type' => 'success', 'message' => "Komponen {$catalogItem->name} diperbarui. Berlaku untuk order berikutnya."]);

        return back();
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
     * Bentuk satu item untuk daftar dan halaman form — satu sumber. HPP
     * (`unit_cost`, juga per varian) hanya untuk owner (spek 5.1).
     *
     * @return array<string, mixed>
     */
    private function itemProps(CatalogItem $i): array
    {
        return Finance::except([
            'id' => $i->id, 'name' => $i->name, 'type' => $i->type->value, 'price' => $i->price,
            'unit_cost' => $i->unit_cost, 'category' => $i->category, 'is_active' => $i->is_active,
            // Jasa data lama yang kategorinya tersesat — tidak muncul di Buat Order.
            'unknown_category' => ! $i->hasKnownServiceCategory(),
            // Profil publik + galeri (spek 7.1), sampul dulu.
            'description' => $i->description, 'is_public' => $i->is_public,
            'photos' => $i->photos->map(fn (CatalogItemPhoto $p) => $p->toProps())->values()->all(),
            // Varian produk (spek 7.3), aktif maupun nonaktif.
            'variants' => $i->variants->map(fn (CatalogItemVariant $v) => Finance::except($v->toProps(), ['unit_cost']))->values()->all(),
            // Komponen paket jasa (spek 6.3) + HPP bahan paket SAAT INI (dihitung, tidak disimpan).
            'components' => $i->components->map(fn (CatalogItem $c) => Finance::except([
                'id' => $c->id, 'name' => $c->name, 'quantity' => $c->pivotQuantity(),
                'unit_cost' => $c->unit_cost, 'is_active' => $c->is_active,
            ], ['unit_cost']))->values()->all(),
            'bundle_cost' => $i->bundleCost(),
        ], ['unit_cost', 'bundle_cost']);
    }

    /**
     * `component_options` = produk yang bisa jadi komponen paket: produk aktif +
     * komponen item ini yang sudah nonaktif (supaya namanya tetap terbaca).
     *
     * @return array{service_categories: list<array{value: string, label: string}>, low_margin_ratio: float, component_options: list<array{id: int, name: string, unit_cost: int|null, is_active: bool}>}
     */
    private function formProps(?CatalogItem $item = null): array
    {
        $kept = $item?->components->pluck('id')->all() ?? [];

        return [
            'service_categories' => array_map(fn (ServiceCategory $c) => ['value' => $c->value, 'label' => $c->label()], ServiceCategory::cases()),
            'low_margin_ratio' => (float) config('studio.low_margin_ratio'),
            'component_options' => array_values(CatalogItem::query()
                ->where('type', CatalogItemType::Product)
                ->where(fn ($q) => $q->where('is_active', true)->orWhereIn('id', $kept))
                ->orderBy('name')
                ->get()
                ->map(fn (CatalogItem $c) => ['id' => $c->id, 'name' => $c->name, 'unit_cost' => $c->unit_cost, 'is_active' => $c->is_active])
                ->all()),
        ];
    }
}
