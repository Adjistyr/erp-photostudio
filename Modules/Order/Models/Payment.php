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
 * @property int $id
 * @property int $order_id
 * @property CarbonImmutable $paid_on
 * @property int $amount
 * @property PaymentMethod $method
 * @property string $note
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Order $order
 */
#[Fillable(['order_id', 'paid_on', 'amount', 'method', 'note', 'created_by'])]
class Payment extends Model
{
    use RecordsCreator;

    protected function casts(): array
    {
        return [
            'paid_on' => 'immutable_date',
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
