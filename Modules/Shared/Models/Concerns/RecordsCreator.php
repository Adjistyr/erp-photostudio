<?php

namespace Modules\Shared\Models\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Mengisi `created_by` dari user yang login saat baris dibuat.
 *
 * Dipilih trait + event `creating`, bukan mengisi di tiap controller: ada
 * sembilan titik tulis dan jalur baru (impor, action) otomatis ikut. Tanpa
 * sesi (seeder, tinker) nilainya null — bukan error. Nilai yang sudah diisi
 * pemanggil tidak ditimpa.
 *
 * @property int|null $created_by
 * @property-read User|null $creator
 *
 * @mixin Model
 */
trait RecordsCreator
{
    public static function bootRecordsCreator(): void
    {
        static::creating(function (self $model): void {
            $model->created_by ??= auth()->user()?->id;
        });
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
