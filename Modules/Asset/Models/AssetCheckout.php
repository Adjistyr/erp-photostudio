<?php

namespace Modules\Asset\Models;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Modules\Order\Models\Order;
use Modules\Shared\Models\Concerns\RecordsCreator;

/**
 * Peminjaman alat (spek 8.4). Satu catatan = satu aset × jumlah unit; kembali
 * sekaligus (pengembalian sebagian = kembalikan lalu catat ulang sisanya).
 *
 * @property int $id
 * @property int $asset_id
 * @property int|null $order_id
 * @property int $quantity
 * @property string $holder
 * @property CarbonImmutable $checked_out_on
 * @property CarbonImmutable|null $due_back_on
 * @property CarbonImmutable|null $returned_on null = belum kembali
 * @property string|null $note
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Asset $asset
 * @property-read Order|null $order
 */
#[Fillable(['asset_id', 'order_id', 'quantity', 'holder', 'checked_out_on', 'due_back_on', 'returned_on', 'note', 'created_by'])]
class AssetCheckout extends Model
{
    use RecordsCreator;

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'checked_out_on' => 'immutable_date',
            'due_back_on' => 'immutable_date',
            'returned_on' => 'immutable_date',
        ];
    }

    /** @return BelongsTo<Asset, $this> */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    /** @return BelongsTo<Order, $this> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function isOut(): bool
    {
        return $this->returned_on === null;
    }

    /** Belum kembali dan rencana kembali sudah lewat (aturan 5). */
    public function isOverdue(CarbonInterface $today): bool
    {
        return $this->isOut() && $this->due_back_on !== null && $this->due_back_on->lt($today->copy()->startOfDay());
    }

    /** @return array<string, mixed> */
    public function toProps(CarbonInterface $today): array
    {
        return [
            'id' => $this->id,
            'asset_id' => $this->asset_id,
            'quantity' => $this->quantity,
            'holder' => $this->holder,
            'order' => $this->order === null ? null : [
                'id' => $this->order->id,
                'number' => $this->order->number,
                'customer_name' => $this->order->customer?->name,
            ],
            'checked_out_on' => $this->checked_out_on->toDateString(),
            'due_back_on' => $this->due_back_on?->toDateString(),
            'returned_on' => $this->returned_on?->toDateString(),
            'note' => $this->note,
            'overdue' => $this->isOverdue($today),
        ];
    }
}
