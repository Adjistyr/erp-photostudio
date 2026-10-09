<?php

namespace Modules\Order\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Modules\Order\Enums\PaymentMethod;
use Modules\Shared\Models\Concerns\RecordsCreator;

/**
 * Pengembalian uang (retur cetak salah, DP order batal yang owner putuskan
 * dikembalikan). Nominal, bukan per item.
 *
 * ponytail: refund nominal, bukan per item — HPP barang yang diretur tetap
 * terhitung (cetakan salah memang jadi limbah). Retur per item kalau stok
 * mulai dilacak.
 *
 * @property int $id
 * @property int $order_id
 * @property CarbonImmutable $refunded_on
 * @property int $amount
 * @property PaymentMethod $method
 * @property string $reason
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Order $order
 */
#[Fillable(['order_id', 'refunded_on', 'amount', 'method', 'reason', 'created_by'])]
class Refund extends Model
{
    use RecordsCreator;

    protected function casts(): array
    {
        return [
            'refunded_on' => 'immutable_date',
            'amount' => 'integer',
            'method' => PaymentMethod::class,
        ];
    }

    /** @return BelongsTo<Order, $this> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
