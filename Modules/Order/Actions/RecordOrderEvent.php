<?php

namespace Modules\Order\Actions;

use Modules\Order\Enums\OrderEventType;
use Modules\Order\Models\Order;
use Modules\Order\Models\OrderEvent;

/**
 * Satu pintu pencatatan riwayat order. Pemanggil WAJIB memanggilnya di
 * dalam transaksi yang sama dengan perubahannya — tidak ada perubahan tanpa
 * event, tidak ada event tanpa perubahan (docs/specs/0.2).
 */
class RecordOrderEvent
{
    /** @param array<string, array{from: mixed, to: mixed}> $changes hanya field yang berubah */
    public function execute(Order $order, OrderEventType|string $type, array $changes = []): OrderEvent
    {
        return $order->events()->create([
            'user_id' => auth()->user()?->id,
            'type' => is_string($type) ? OrderEventType::from($type) : $type,
            'changes' => $changes === [] ? null : $changes,
        ]);
    }
}
