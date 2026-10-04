<?php

namespace Modules\Expense\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Modules\Order\Models\Order;

/**
 * Biaya langsung satu order — fee crew, transport, sewa (business-flow 3).
 *
 * @property int $id
 * @property int $order_id
 * @property CarbonImmutable $incurred_on
 * @property string $category
 * @property string $description
 * @property int $amount
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Order $order
 */
#[Fillable(['order_id', 'incurred_on', 'category', 'description', 'amount'])]
class JobCost extends Model
{
    protected function casts(): array
    {
        return [
            'incurred_on' => 'immutable_date',
            'amount' => 'integer',
        ];
    }

    /** @return BelongsTo<Order, $this> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
