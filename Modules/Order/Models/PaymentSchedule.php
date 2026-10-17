<?php

namespace Modules\Order\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Satu termin pembayaran order event (spek 6.4). Tanpa kolom status:
 * lunas/sebagian/belum diturunkan FIFO dari pembayaran — lihat
 * Order::scheduleStatuses().
 *
 * @property int $id
 * @property int $order_id
 * @property int $sequence
 * @property CarbonImmutable $due_on
 * @property int $amount
 * @property string|null $label
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Order $order
 */
#[Fillable(['order_id', 'sequence', 'due_on', 'amount', 'label'])]
class PaymentSchedule extends Model
{
    protected function casts(): array
    {
        return [
            'sequence' => 'integer',
            'due_on' => 'immutable_date',
            'amount' => 'integer',
        ];
    }

    /** @return BelongsTo<Order, $this> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
