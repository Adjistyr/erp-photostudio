<?php

namespace Modules\Order\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Modules\Catalog\Models\CatalogItem;
use Modules\Catalog\Models\CatalogItemVariant;

/**
 * @property int $id
 * @property int $order_id
 * @property int|null $catalog_item_id
 * @property int|null $catalog_item_variant_id varian produk saat dijual (spek 7.3)
 * @property string $name
 * @property int $quantity
 * @property int $unit_price harga satuan SAAT transaksi
 * @property int|null $unit_cost HPP satuan saat transaksi; null untuk jasa
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Order $order
 * @property-read CatalogItem|null $catalogItem
 * @property-read CatalogItemVariant|null $variant
 */
#[Fillable(['order_id', 'catalog_item_id', 'catalog_item_variant_id', 'name', 'quantity', 'unit_price', 'unit_cost'])]
class OrderItem extends Model
{
    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_price' => 'integer',
            'unit_cost' => 'integer',
        ];
    }

    /** @return BelongsTo<Order, $this> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /** @return BelongsTo<CatalogItem, $this> */
    public function catalogItem(): BelongsTo
    {
        return $this->belongsTo(CatalogItem::class);
    }

    /** @return BelongsTo<CatalogItemVariant, $this> */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(CatalogItemVariant::class, 'catalog_item_variant_id');
    }
}
