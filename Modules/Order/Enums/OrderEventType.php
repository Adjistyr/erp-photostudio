<?php

namespace Modules\Order\Enums;

/**
 * Jenis event riwayat order. `updated`, `reverted`, `refunded` sudah
 * didefinisikan tapi baru dipancarkan oleh edit order, status mundur, dan
 * refund (spek 1.2, 1.4, 4.2).
 */
enum OrderEventType: string
{
    case Created = 'created';
    case Updated = 'updated';
    case Advanced = 'advanced';
    case Reverted = 'reverted';
    case Cancelled = 'cancelled';
    case PaymentRecorded = 'payment_recorded';
    case PaymentDeleted = 'payment_deleted';
    case ResultLink = 'result_link';
    case Refunded = 'refunded';

    public function label(): string
    {
        return match ($this) {
            self::Created => 'Dibuat',
            self::Updated => 'Diubah',
            self::Advanced => 'Status maju',
            self::Reverted => 'Status dikembalikan',
            self::Cancelled => 'Dibatalkan',
            self::PaymentRecorded => 'Pembayaran dicatat',
            self::PaymentDeleted => 'Pembayaran dihapus',
            self::ResultLink => 'Link hasil',
            self::Refunded => 'Pengembalian',
        };
    }
}
