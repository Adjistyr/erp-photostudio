<?php

namespace Modules\Catalog\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\Pivot;
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
 * @property-read Collection<int, CatalogPriceChange> $priceChanges terbaru dulu (spek 6.5)
 * @property-read Collection<int, CatalogItem> $components produk dalam paket jasa (spek 6.3), pivot `quantity`
 * @property-read Pivot $pivot baris `catalog_bundle_items` saat dimuat lewat `components`
 */
#[Fillable(['name', 'type', 'price', 'unit_cost', 'category', 'is_active', 'description', 'is_public'])]
class CatalogItem extends Model
{
    /**
     * Riwayat harga (spek 6.5) dicatat di model, bukan controller, supaya
     * seeder/impor ikut tercatat. Harga varian tidak punya riwayat sendiri;
     * perubahannya tercatat lewat harga item yang disalin dari varian aktif
     * termurah (syncPriceFromVariants → update).
     */
    protected static function booted(): void
    {
        static::created(fn (self $item) => $item->recordPriceChange());
        static::updated(function (self $item): void {
            if ($item->wasChanged(['price', 'unit_cost'])) {
                $item->recordPriceChange();
            }
        });
    }

    private function recordPriceChange(): void
    {
        $this->priceChanges()->create([
            'price' => $this->price,
            'unit_cost' => $this->unit_cost,
            'changed_by' => auth()->id(),
        ]);
    }

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
     * Riwayat harga & HPP, terbaru dulu (id sebagai pemecah seri detik sama).
     *
     * @return HasMany<CatalogPriceChange, $this>
     */
    public function priceChanges(): HasMany
    {
        return $this->hasMany(CatalogPriceChange::class)->latest()->latest('id');
    }

    /**
     * Komponen paket jasa (spek 6.3) — produk saja, tanpa bersarang. Pivot
     * `quantity` = jumlah per 1 paket. Komponen nonaktif TETAP ikut: nonaktif
     * hanya menyembunyikan dari pilihan, bukan mengeluarkan dari paket.
     *
     * @return BelongsToMany<CatalogItem, $this>
     */
    public function components(): BelongsToMany
    {
        return $this->belongsToMany(CatalogItem::class, 'catalog_bundle_items', 'bundle_id', 'component_id')
            ->withPivot('quantity')
            ->orderBy('catalog_items.name');
    }

    /**
     * Paket yang memakai produk ini sebagai komponen.
     *
     * @return BelongsToMany<CatalogItem, $this>
     */
    public function bundles(): BelongsToMany
    {
        return $this->belongsToMany(CatalogItem::class, 'catalog_bundle_items', 'component_id', 'bundle_id');
    }

    public function isBundle(): bool
    {
        return $this->type === CatalogItemType::Service && $this->components->isNotEmpty();
    }

    /**
     * HPP bahan satu paket = Σ HPP komponen × qty, dihitung dari katalog SAAT
     * dipanggil (tidak disimpan di katalog). null = bukan paket berkomponen.
     * Produk bervarian memakai HPP item (disalin dari varian aktif termurah).
     */
    public function bundleCost(): ?int
    {
        if (! $this->isBundle()) {
            return null;
        }

        return (int) $this->components->sum(fn (CatalogItem $c) => ($c->unit_cost ?? 0) * $c->pivotQuantity());
    }

    /**
     * Snapshot komponen untuk `order_items.components` — invoice & detail order
     * tidak bergantung pada katalog yang berubah. null = bukan paket.
     *
     * @return list<array{name: string, quantity: int, unit_cost: int|null}>|null
     */
    public function componentsSnapshot(): ?array
    {
        if (! $this->isBundle()) {
            return null;
        }

        return array_values($this->components->map(fn (CatalogItem $c) => [
            'name' => $c->name, 'quantity' => $c->pivotQuantity(), 'unit_cost' => $c->unit_cost,
        ])->all());
    }

    /** Qty pivot komponen (dimuat lewat `components`). */
    public function pivotQuantity(): int
    {
        return (int) $this->pivot->getAttribute('quantity');
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
