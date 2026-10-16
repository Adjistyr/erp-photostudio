<?php

namespace Modules\Order\Actions;

use Modules\Order\Models\Order;

/**
 * Ganti seluruh termin order (spek 6.4). Termin = rencana tagihan, bukan
 * catatan uang: diganti utuh, tidak diedit per baris. Urutan array =
 * `sequence`. Dipanggil di dalam transaksi order.
 */
class ReplacePaymentSchedules
{
    /** @param list<array{due_on: string, amount: int, label: string|null}> $schedules kosong = tanpa termin */
    public function execute(Order $order, array $schedules): void
    {
        $order->schedules()->delete();
        foreach ($schedules as $i => $s) {
            $order->schedules()->create([...$s, 'sequence' => $i + 1]);
        }
        $order->unsetRelation('schedules');
    }
}
