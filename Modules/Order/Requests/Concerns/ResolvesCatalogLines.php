<?php

namespace Modules\Order\Requests\Concerns;

use Illuminate\Validation\Validator;
use Modules\Catalog\Models\CatalogItem;
use Modules\Catalog\Models\CatalogItemVariant;

/**
 * Baris `items[]` → nama, harga, HPP siap simpan. Dipakai Form Order dan POS
 * supaya aturan ini tidak bisa berbeda di dua tempat:
 *
 * - Baris katalog (`catalog_item_id` terisi): harga, HPP, dan nama SELALU dari
 *   katalog di server — `name`/`unit_price` kiriman klien diabaikan, jadi
 *   harga katalog tidak bisa dimanipulasi dari browser.
 * - Baris custom (tanpa `catalog_item_id`, spek 1.3): nama + harga dari input
 *   karena tidak ada sumber lain; HPP null (biaya nyatanya = biaya job).
 *   POS tidak pernah sampai ke sini — rule-nya mewajibkan `catalog_item_id`.
 * - Varian (`catalog_item_variant_id`, spek 7.3, POS saja): nama "Produk – Varian",
 *   harga & HPP dari varian. Varian hanya dipakai bila milik item baris itu —
 *   kecocokan dan kewajibannya divalidasi StorePosSaleRequest.
 * - Paket jasa berkomponen (spek 6.3): HPP = `bundleCost()` dari katalog SAAT
 *   transaksi, `components` = snapshot komponen. Baris lain: `components` null.
 */
trait ResolvesCatalogLines
{
    /** @var list<array{item: CatalogItem|null, variant: CatalogItemVariant|null, name: string, unit_price: int, unit_cost: int|null, components: list<array{name: string, quantity: int, unit_cost: int|null}>|null, quantity: int}>|null */
    private ?array $lines = null;

    /**
     * Dipanggil setelah aturan `items.*` lolos.
     *
     * @return list<array{item: CatalogItem|null, variant: CatalogItemVariant|null, name: string, unit_price: int, unit_cost: int|null, components: list<array{name: string, quantity: int, unit_cost: int|null}>|null, quantity: int}>
     */
    public function lines(): array
    {
        if ($this->lines !== null) {
            return $this->lines;
        }

        /** @var list<array{catalog_item_id?: int|string|null, catalog_item_variant_id?: int|string|null, name?: string|null, unit_price?: int|string|null, quantity: int|string}> $items */
        $items = $this->input('items', []);
        $ids = array_filter(array_map(fn (array $i) => $i['catalog_item_id'] ?? null, $items), fn ($id) => $id !== null && $id !== '');
        // Komponen ikut dimuat — paket jasa berkomponen membawa HPP hasil hitung.
        $catalog = CatalogItem::with('components')->findMany(array_values($ids))->keyBy('id');
        $variantIds = array_filter(array_map(fn (array $i) => $i['catalog_item_variant_id'] ?? null, $items), fn ($id) => $id !== null && $id !== '');
        $variants = CatalogItemVariant::findMany(array_values($variantIds))->keyBy('id');

        return $this->lines = array_map(function (array $i) use ($catalog, $variants) {
            $id = $i['catalog_item_id'] ?? null;
            if ($id === null || $id === '') {
                return [
                    'item' => null,
                    'variant' => null,
                    'name' => trim((string) ($i['name'] ?? '')),
                    'unit_price' => (int) ($i['unit_price'] ?? 0),
                    'unit_cost' => null,
                    'components' => null,
                    'quantity' => (int) $i['quantity'],
                ];
            }
            $item = $catalog->get((int) $id) ?? throw new \LogicException('Item katalog hilang');
            $variant = $variants->get((int) ($i['catalog_item_variant_id'] ?? 0));
            if ($variant !== null && $variant->catalog_item_id !== $item->id) {
                $variant = null;
            }

            return [
                'item' => $item,
                'variant' => $variant,
                'name' => $variant ? CatalogItemVariant::label($item->name, $variant->name) : $item->name,
                'unit_price' => $variant->price ?? $item->price,
                'unit_cost' => $variant ? $variant->unit_cost : ($item->isBundle() ? $item->bundleCost() : $item->unit_cost),
                'components' => $variant ? null : $item->componentsSnapshot(),
                'quantity' => (int) $i['quantity'],
            ];
        }, $items);
    }

    /** Jumlah harga × qty (katalog dan custom), sebelum diskon. */
    public function subtotal(): int
    {
        return array_sum(array_map(fn (array $l) => $l['unit_price'] * $l['quantity'], $this->lines()));
    }

    /**
     * Produk bervarian wajib varian aktif miliknya; produk tanpa varian tidak
     * boleh membawa varian (spek 7.3). true = ada error. Dipakai POS dan Form
     * Order (spek 7.5); baris custom (tanpa katalog) dilewati. `$only` =
     * indeks baris yang dicek (Ubah Order: baris baru saja).
     *
     * @param  list<int>|null  $only
     */
    protected function rejectWrongVariants(Validator $validator, ?array $only = null): bool
    {
        /** @var list<array{catalog_item_id?: int|string|null, catalog_item_variant_id?: int|string|null}> $items */
        $items = $this->input('items', []);
        $ids = array_map(fn (array $i) => (int) ($i['catalog_item_id'] ?? 0), $items);
        $variantsByItem = CatalogItemVariant::whereIn('catalog_item_id', $ids)->get()->groupBy('catalog_item_id');

        foreach ($items as $n => $i) {
            if (($i['catalog_item_id'] ?? null) === null || $i['catalog_item_id'] === '' || ($only !== null && ! in_array($n, $only, true))) {
                continue;
            }
            $variants = $variantsByItem->get((int) $i['catalog_item_id']);
            $chosen = isset($i['catalog_item_variant_id']) && $i['catalog_item_variant_id'] !== '' ? (int) $i['catalog_item_variant_id'] : null;
            $key = "items.{$n}.catalog_item_variant_id";
            if ($variants === null) {
                if ($chosen !== null) {
                    $validator->errors()->add($key, 'Produk ini tidak punya varian.');
                }

                continue;
            }
            $variant = $chosen === null ? null : $variants->firstWhere('id', $chosen);
            if ($variant === null) {
                $validator->errors()->add($key, 'Pilih varian produk ini.');
            } elseif (! $variant->is_active) {
                $validator->errors()->add($key, "Varian {$variant->name} sudah tidak dijual.");
            }
        }

        return $validator->errors()->isNotEmpty();
    }
}
