<?php

namespace App\Models;

use App\Enums\Fund;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Pemakaian pos dana di luar servis aset. Alokasi masuk TIDAK dicatat —
 * dihitung dari laporan (8.2).
 *
 * @property int $id
 * @property Fund $fund
 * @property CarbonImmutable $withdrawn_on
 * @property int $amount
 * @property string $note
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['fund', 'withdrawn_on', 'amount', 'note'])]
class FundWithdrawal extends Model
{
    protected function casts(): array
    {
        return [
            'fund' => Fund::class,
            'withdrawn_on' => 'immutable_date',
            'amount' => 'integer',
        ];
    }
}
