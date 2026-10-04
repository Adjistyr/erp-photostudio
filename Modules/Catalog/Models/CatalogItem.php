<?php

namespace Modules\Catalog\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Modules\Catalog\Enums\CatalogItemType;

/**
 * @property int $id
 * @property string $name
 * @property CatalogItemType $type
 * @property int $price
 * @property int|null $unit_cost HPP bahan per unit; null untuk jasa
 * @property string $category
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'type', 'price', 'unit_cost', 'category', 'is_active'])]
class CatalogItem extends Model
{
    protected function casts(): array
    {
        return [
            'type' => CatalogItemType::class,
            'price' => 'integer',
            'unit_cost' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}
