<?php

namespace Modules\Order\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Modules\Order\Enums\OrderEventType;

/**
 * Satu baris riwayat order. Hanya `created_at` — event tidak pernah diubah.
 *
 * @property int $id
 * @property int $order_id
 * @property int|null $user_id
 * @property OrderEventType $type
 * @property array<string, array{from: mixed, to: mixed}>|null $changes
 * @property Carbon $created_at
 * @property-read Order $order
 * @property-read User|null $user
 */
#[Fillable(['order_id', 'user_id', 'type', 'changes'])]
class OrderEvent extends Model
{
    /** Eloquent hanya mengisi created_at; tidak ada kolom updated_at. */
    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'type' => OrderEventType::class,
            'changes' => 'array',
        ];
    }

    /** @return BelongsTo<Order, $this> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
