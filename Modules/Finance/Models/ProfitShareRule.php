<?php

namespace Modules\Finance\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/**
 * Aturan bagi hasil yang berlaku MULAI bulan tertentu (business-flow 8.6).
 * Tidak diedit — perubahan rasio = baris baru.
 *
 * @property int $id
 * @property string $effective_month "YYYY-MM"
 * @property int $reserve_percent
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, Owner> $owners pivot->percent
 */
#[Fillable(['effective_month', 'reserve_percent'])]
class ProfitShareRule extends Model
{
    protected function casts(): array
    {
        return ['reserve_percent' => 'integer'];
    }

    /** @return BelongsToMany<Owner, $this> */
    public function owners(): BelongsToMany
    {
        return $this->belongsToMany(Owner::class)->withPivot('percent')->orderBy('owners.id');
    }

    /**
     * Bagian tiap owner, urut id owner (urutan ini menentukan siapa yang
     * menerima sisa pembulatan — selalu owner terakhir).
     *
     * @return list<array{owner_id: int, percent: int}>
     */
    public function shares(): array
    {
        return array_values($this->owners
            ->map(fn (Owner $o) => ['owner_id' => $o->id, 'percent' => (int) $o->getRelationValue('pivot')->getAttribute('percent')])
            ->all());
    }
}
