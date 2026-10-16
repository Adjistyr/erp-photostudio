<?php

namespace Modules\Order\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Modules\Order\Enums\PaymentMethod;
use Modules\Shared\Models\Concerns\RecordsCreator;
use Throwable;

/**
 * @property int $id
 * @property int $order_id
 * @property CarbonImmutable $paid_on
 * @property int $amount
 * @property PaymentMethod $method
 * @property string $note
 * @property string|null $proof_path bukti transfer/QRIS di disk privat (spek 6.7)
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Order $order
 */
#[Fillable(['order_id', 'paid_on', 'amount', 'method', 'note', 'proof_path', 'created_by'])]
class Payment extends Model
{
    use RecordsCreator;

    /**
     * Privat, pola yang sama dengan nota aset (spek 8.2) — dibuka hanya lewat
     * route bertanda tangan `payments.proof`, tidak pernah URL publik.
     */
    public const PROOF_DISK = 'local';

    /** Lama URL bukti berlaku; halaman dimuat ulang = URL baru. */
    public const PROOF_URL_TTL_MINUTES = 10;

    protected static function booted(): void
    {
        // Koreksi (hapus & catat ulang) ikut membuang file. Setelah commit:
        // rollback tidak boleh meninggalkan baris tanpa file. Gagal hapus file
        // hanya dicatat — pembayaran tetap terhapus.
        static::deleted(function (self $payment) {
            $path = $payment->proof_path;
            if ($path === null) {
                return;
            }
            DB::afterCommit(function () use ($path, $payment) {
                try {
                    $deleted = Storage::disk(self::PROOF_DISK)->delete($path);
                } catch (Throwable $e) {
                    Log::warning('Gagal menghapus bukti pembayaran', ['payment_id' => $payment->id, 'path' => $path, 'error' => $e->getMessage()]);

                    return;
                }
                if (! $deleted) {
                    Log::warning('Gagal menghapus bukti pembayaran', ['payment_id' => $payment->id, 'path' => $path]);
                }
            });
        });
    }

    public function hasProof(): bool
    {
        return $this->proof_path !== null;
    }

    /** URL bertanda tangan sementara (tetap butuh login); null bila tanpa bukti. */
    public function proofUrl(): ?string
    {
        if (! $this->hasProof()) {
            return null;
        }

        return URL::temporarySignedRoute('payments.proof', now()->addMinutes(self::PROOF_URL_TTL_MINUTES), ['payment' => $this->id]);
    }

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
