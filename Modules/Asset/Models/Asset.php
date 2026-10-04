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

/**
 * @property int $id
 * @property string $name
 * @property string $category
 * @property string|null $model
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
 * @property-read Collection<int, AssetMaintenance> $maintenances
 */
#[Fillable([
    'name', 'category', 'model', 'units', 'unit_price', 'purchased_on',
    'maintenance_percent', 'useful_life_months', 'maintenance_interval_months',
    'status', 'disposed_on', 'disposal_reason', 'sale_price', 'investment_id',
])]
class Asset extends Model
{
    /**
     * Kategori + default umur ekonomis & interval perawatan (bulan). Owner
     * jarang tahu angkanya — default terisi saat kategori dipilih, dan tetap
     * bisa diubah. Interval null = tanpa jadwal berkala.
     *
     * @var list<array{name: string, useful_life_months: int, maintenance_interval_months: int|null}>
     */
    public const CATEGORIES = [
        ['name' => 'Kamera', 'useful_life_months' => 48, 'maintenance_interval_months' => 6],
        ['name' => 'Lensa', 'useful_life_months' => 48, 'maintenance_interval_months' => 12],
        ['name' => 'Lighting', 'useful_life_months' => 48, 'maintenance_interval_months' => 12],
        ['name' => 'Printer', 'useful_life_months' => 36, 'maintenance_interval_months' => 1],
        ['name' => 'Aksesori', 'useful_life_months' => 24, 'maintenance_interval_months' => null],
        ['name' => 'Komputer', 'useful_life_months' => 36, 'maintenance_interval_months' => 12],
        ['name' => 'Properti & furnitur', 'useful_life_months' => 36, 'maintenance_interval_months' => null],
    ];

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
            'sale_price' => 'integer',
        ];
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
