<?php

namespace Modules\Finance\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Ringkasan bulan SEBELUM app dipakai, dari sheet client (business-flow
 * 8.8). Satu-satunya angka laba yang ditulis tangan — bulan sesudah go-live
 * diturunkan dari order.
 *
 * @property int $id
 * @property string $month "YYYY-MM"
 * @property int $revenue
 * @property int $net_profit
 * @property string $source
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['month', 'revenue', 'net_profit', 'source'])]
class OpeningBalance extends Model
{
    protected function casts(): array
    {
        return ['revenue' => 'integer', 'net_profit' => 'integer'];
    }
}
