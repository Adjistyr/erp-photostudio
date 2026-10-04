<?php

namespace Modules\Order\Requests\Concerns;

use Modules\Catalog\Models\CatalogItem;

/**
 * Baris `items[]` (id katalog + qty) → model katalog. Harga, HPP, dan nama
 * TIDAK diterima dari klien — selalu dibaca dari katalog di server. Dipakai
 * Form Order dan POS supaya aturan itu tidak bisa berbeda di dua tempat.
 */
trait ResolvesCatalogLines
{
    /** @var list<array{item: CatalogItem, quantity: int}>|null */
    private ?array $lines = null;

    /**
     * Dipanggil setelah aturan `items.*` lolos.
     *
     * @return list<array{item: CatalogItem, quantity: int}>
     */
    public function lines(): array
    {
        if ($this->lines !== null) {
            return $this->lines;
        }

        /** @var list<array{catalog_item_id: int|string, quantity: int|string}> $items */
        $items = $this->input('items', []);
        $catalog = CatalogItem::findMany(array_column($items, 'catalog_item_id'))->keyBy('id');

        return $this->lines = array_map(fn (array $i) => [
            'item' => $catalog->get((int) $i['catalog_item_id']) ?? throw new \LogicException('Item katalog hilang'),
            'quantity' => (int) $i['quantity'],
        ], $items);
    }

    /** Jumlah harga katalog × qty, sebelum diskon. */
    public function subtotal(): int
    {
        return array_sum(array_map(fn (array $l) => $l['item']->price * $l['quantity'], $this->lines()));
    }
}
