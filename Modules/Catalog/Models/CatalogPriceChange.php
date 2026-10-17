<?php

namespace Modules\Catalog\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Satu baris riwayat harga katalog (spek 6.5). Dibuat observer CatalogItem
 * saat item dibuat dan setiap `price`/`unit_cost` berubah. Append-only:
 * tidak ada jalur edit/hapus di app.
 *
 * @property int $id
 * @property int $catalog_item_id
 * @property int $price
 * @property int|null $unit_cost
 * @property int|null $changed_by null = tanpa sesi (seeder, tinker, backfill)
 * @property Carbon|null $created_at mulai berlaku
 * @property-read User|null $creator
 */
#[Fillable(['catalog_item_id', 'price', 'unit_cost', 'changed_by'])]
class CatalogPriceChange extends Model
{
    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return ['price' => 'integer', 'unit_cost' => 'integer'];
    }

    /**
     * Pola pencatat 0.1 (RecordsCreator) dengan kolom `changed_by`.
     *
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }

    /** @return array{price: int, unit_cost: int|null, changed_by_name: string|null, at: string} */
    public function toProps(): array
    {
        return [
            'price' => $this->price,
            'unit_cost' => $this->unit_cost,
            'changed_by_name' => $this->creator?->name,
            'at' => $this->created_at?->toIso8601String() ?? '',
        ];
    }
}
