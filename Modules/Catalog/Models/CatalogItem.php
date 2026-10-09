<?php

namespace Modules\Catalog\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Catalog\Enums\ServiceCategory;

/**
 * @property int $id
 * @property string $name
 * @property CatalogItemType $type
 * @property int $price
 * @property int|null $unit_cost HPP bahan per unit; null untuk jasa
 * @property string $category
 * @property bool $is_active
 * @property string|null $description profil publik (spek 7.1)
 * @property bool $is_public "Tampil di company profile" — tidak memengaruhi POS/form order
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, CatalogItemPhoto> $photos sampul dulu
 */
#[Fillable(['name', 'type', 'price', 'unit_cost', 'category', 'is_active', 'description', 'is_public'])]
class CatalogItem extends Model
{
    protected function casts(): array
    {
        return [
            'type' => CatalogItemType::class,
            'price' => 'integer',
            'unit_cost' => 'integer',
            'is_active' => 'boolean',
            'is_public' => 'boolean',
        ];
    }

    /**
     * Galeri foto (spek 7.1), sampul dulu.
     *
     * @return HasMany<CatalogItemPhoto, $this>
     */
    public function photos(): HasMany
    {
        return $this->hasMany(CatalogItemPhoto::class)->orderBy('position')->orderBy('id');
    }

    /**
     * Jasa berkategori di luar ServiceCategory (data lama) tidak pernah muncul
     * di Buat Order — Katalog menandainya supaya owner memperbaiki (K2).
     */
    public function hasKnownServiceCategory(): bool
    {
        return $this->type !== CatalogItemType::Service
            || ServiceCategory::tryFrom($this->category) !== null;
    }
}
