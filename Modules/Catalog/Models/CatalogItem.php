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
 * @property-read Collection<int, CatalogItemVariant> $variants urut input (spek 7.3)
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
     * Varian produk (spek 7.3), urut input.
     *
     * @return HasMany<CatalogItemVariant, $this>
     */
    public function variants(): HasMany
    {
        return $this->hasMany(CatalogItemVariant::class)->orderBy('position')->orderBy('id');
    }

    /**
     * Produk bervarian: harga & HPP item disalin dari varian aktif termurah
     * (semua nonaktif → termurah) supaya daftar & urutan tetap masuk akal.
     * Penjualan SELALU memakai harga varian, bukan nilai ini (spek 7.3).
     */
    public function syncPriceFromVariants(): void
    {
        $variants = $this->variants()->get();
        if ($variants->isEmpty()) {
            return;
        }
        $active = $variants->where('is_active', true);
        /** @var CatalogItemVariant $cheapest */
        $cheapest = ($active->isNotEmpty() ? $active : $variants)->sortBy('price')->first();
        $this->update(['price' => $cheapest->price, 'unit_cost' => $cheapest->unit_cost]);
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
