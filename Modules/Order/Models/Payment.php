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

    /**
     * Isi `changes` event riwayat untuk pembayaran dicatat/dihapus — bentuk
     * yang sama dari tiga pemanggil (Buat Order, POS, Catat Bayar).
     *
     * @return array<string, array{from: mixed, to: mixed}>
     */
    public static function eventChanges(self $payment, bool $recorded): array
    {
        $values = ['amount' => $payment->amount, 'method' => $payment->method->value, 'paid_on' => $payment->paid_on->toDateString()];

        return array_map(fn ($v) => $recorded ? ['from' => null, 'to' => $v] : ['from' => $v, 'to' => null], $values);
    }

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
