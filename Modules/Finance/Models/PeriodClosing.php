<?php

namespace Modules\Finance\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Satu kali tutup buku. Aktif = belum dibuka kembali.
 *
 * @property int $id
 * @property string $month "YYYY-MM"
 * @property Carbon $closed_at
 * @property int|null $closed_by
 * @property Carbon|null $reopened_at
 * @property int|null $reopened_by
 * @property-read User|null $closer
 */
#[Fillable(['month', 'closed_at', 'closed_by', 'reopened_at', 'reopened_by'])]
class PeriodClosing extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        return ['closed_at' => 'datetime', 'reopened_at' => 'datetime'];
    }

    /** @param  Builder<self>  $query */
    public function scopeActive(Builder $query): void
    {
        $query->whereNull('reopened_at');
    }

    /** @return BelongsTo<User, $this> */
    public function closer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }
}
