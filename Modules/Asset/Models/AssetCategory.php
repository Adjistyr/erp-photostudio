<?php

namespace Modules\Asset\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Kategori aset dikelola owner (spek 8.1). Umur ekonomis & interval
 * perawatan di sini hanya DEFAULT untuk aset baru — owner jarang tahu
 * angkanya; mengubahnya tidak menyentuh aset yang sudah ada.
 *
 * @property int $id
 * @property string $name
 * @property string $code_prefix huruf besar, mis. KAM → KAM-001
 * @property int $useful_life_months
 * @property int|null $maintenance_interval_months null = tanpa jadwal berkala
 * @property int $position
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'code_prefix', 'useful_life_months', 'maintenance_interval_months', 'position'])]
class AssetCategory extends Model
{
    protected function casts(): array
    {
        return [
            'useful_life_months' => 'integer',
            'maintenance_interval_months' => 'integer',
            'position' => 'integer',
        ];
    }

    /** @return HasMany<Asset, $this> */
    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class);
    }

    /**
     * Kode berikutnya untuk prefiks ini: nomor terbesar yang cocok
     * `PREFIKS-angka` + 1, tiga digit. Kode manual dengan pola lain tidak
     * memengaruhi urutan.
     */
    public function nextCode(): string
    {
        $prefix = $this->code_prefix.'-';
        $max = Asset::where('code', 'like', $prefix.'%')->pluck('code')
            ->map(fn (string $code) => preg_match('/^'.preg_quote($prefix, '/').'(\d+)$/', $code, $m) ? (int) $m[1] : 0)
            ->max() ?? 0;

        return $prefix.str_pad((string) ($max + 1), 3, '0', STR_PAD_LEFT);
    }

    /** @return array{id: int, name: string, code_prefix: string, useful_life_months: int, maintenance_interval_months: int|null, next_code: string} */
    public function toProps(): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'code_prefix' => $this->code_prefix,
            'useful_life_months' => $this->useful_life_months,
            'maintenance_interval_months' => $this->maintenance_interval_months,
            'next_code' => $this->nextCode(),
        ];
    }
}
