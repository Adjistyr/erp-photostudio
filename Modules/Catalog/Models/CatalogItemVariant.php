<?php

namespace Modules\Catalog\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Varian produk (spek 7.3) — harga & HPP sendiri. Tidak dihapus, hanya
 * dinonaktifkan: baris order lama merujuknya untuk laporan per varian.
 *
 * @property int $id
 * @property int $catalog_item_id
 * @property string $name
 * @property int $price
 * @property int $unit_cost
 * @property int|null $catalog_item_photo_id foto dari galeri item; null = sampul item
 * @property bool $is_active
 * @property int $position
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read CatalogItem $item
 * @property-read CatalogItemPhoto|null $photo
 */
#[Fillable(['catalog_item_id', 'name', 'price', 'unit_cost', 'catalog_item_photo_id', 'is_active', 'position'])]
class CatalogItemVariant extends Model
{
    public const MAX_PER_ITEM = 30;

    protected function casts(): array
    {
        return [
            'price' => 'integer',
            'unit_cost' => 'integer',
            'is_active' => 'boolean',
            'position' => 'integer',
        ];
    }

    /** @return BelongsTo<CatalogItem, $this> */
    public function item(): BelongsTo
    {
        return $this->belongsTo(CatalogItem::class, 'catalog_item_id');
    }

    /** @return BelongsTo<CatalogItemPhoto, $this> */
    public function photo(): BelongsTo
    {
        return $this->belongsTo(CatalogItemPhoto::class, 'catalog_item_photo_id');
    }

    /** "Bingkai Kayu – A4" — nama baris order, struk, dan laporan. */
    public static function label(string $itemName, string $variantName): string
    {
        return "{$itemName} – {$variantName}";
    }

    /** @return array{id: int, name: string, price: int, unit_cost: int, catalog_item_photo_id: int|null, is_active: bool} */
    public function toProps(): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'price' => $this->price, 'unit_cost' => $this->unit_cost,
            'catalog_item_photo_id' => $this->catalog_item_photo_id, 'is_active' => $this->is_active,
        ];
    }
}
