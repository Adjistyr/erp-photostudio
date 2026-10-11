<?php

namespace Modules\Asset\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Modules\Asset\Enums\AssetStatus;
use Modules\Finance\Models\Investment;
use Modules\Shared\Models\Concerns\RecordsCreator;

/**
 * @property int $id
 * @property string $code unik, huruf besar (spek 8.1)
 * @property string $name
 * @property int $asset_category_id
 * @property string|null $brand
 * @property string|null $model
 * @property string|null $serial_number teks bebas; unit > 1 dipisah koma
 * @property CarbonImmutable|null $warranty_until boleh lampau
 * @property string|null $location
 * @property string|null $notes
 * @property int $units
 * @property int $unit_price
 * @property CarbonImmutable $purchased_on
 * @property int $maintenance_percent
 * @property int $useful_life_months
 * @property int|null $maintenance_interval_months
 * @property AssetStatus $status
 * @property CarbonImmutable|null $disposed_on
 * @property string|null $disposal_reason
 * @property int|null $sale_price
 * @property int|null $investment_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Investment|null $investment
 * @property-read AssetCategory $category
 * @property-read Collection<int, AssetPhoto> $photos foto alat & nota (spek 8.2)
 * @property-read Collection<int, AssetCheckout> $checkouts peminjaman (spek 8.4)
 * @property-read Collection<int, AssetMaintenance> $maintenances
 */
#[Fillable([
    'code', 'name', 'asset_category_id', 'brand', 'model', 'serial_number', 'warranty_until', 'location', 'notes',
    'units', 'unit_price', 'purchased_on',
    'maintenance_percent', 'useful_life_months', 'maintenance_interval_months',
    'status', 'disposed_on', 'disposal_reason', 'sale_price', 'investment_id', 'created_by',
])]
class Asset extends Model
{
    use RecordsCreator;

    /** Alasan aset dilepas. Hanya "Dijual" yang punya hasil jual. */
    public const DISPOSAL_REASONS = ['Dijual', 'Rusak total', 'Hilang'];

    public const SOLD = 'Dijual';

    protected function casts(): array
    {
        return [
            'units' => 'integer',
            'unit_price' => 'integer',
            'purchased_on' => 'immutable_date',
            'maintenance_percent' => 'integer',
            'useful_life_months' => 'integer',
            'maintenance_interval_months' => 'integer',
            'status' => AssetStatus::class,
            'disposed_on' => 'immutable_date',
            'warranty_until' => 'immutable_date',
            'sale_price' => 'integer',
        ];
    }

    /**
     * Kategori dikelola owner (spek 8.1; dulu konstanta CATEGORIES di sini).
     *
     * @return BelongsTo<AssetCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(AssetCategory::class, 'asset_category_id');
    }

    /**
     * Foto alat & nota (spek 8.2), urut jenis lalu posisi — foto alat pertama = sampul.
     *
     * @return HasMany<AssetPhoto, $this>
     */
    public function photos(): HasMany
    {
        return $this->hasMany(AssetPhoto::class)->orderBy('position')->orderBy('id');
    }

    /**
     * Peminjaman alat ke event (spek 8.4), terbaru dulu.
     *
     * @return HasMany<AssetCheckout, $this>
     */
    public function checkouts(): HasMany
    {
        return $this->hasMany(AssetCheckout::class)->orderByDesc('checked_out_on')->orderByDesc('id');
    }

    /** Unit yang sedang dibawa keluar (belum kembali). */
    public function unitsOut(): int
    {
        return (int) $this->checkouts()->whereNull('returned_on')->sum('quantity');
    }

    /** "Canon EOS M50" — merek + model, null bila keduanya kosong. */
    public function brandModel(): ?string
    {
        return trim(($this->brand ?? '').' '.($this->model ?? '')) ?: null;
    }

    /** @return BelongsTo<Investment, $this> */
    public function investment(): BelongsTo
    {
        return $this->belongsTo(Investment::class);
    }

    /** @return HasMany<AssetMaintenance, $this> */
    public function maintenances(): HasMany
    {
        return $this->hasMany(AssetMaintenance::class);
    }

    public function purchaseTotal(): int
    {
        return $this->unit_price * $this->units;
    }

    public function isDisposed(): bool
    {
        return $this->disposed_on !== null;
    }
}
