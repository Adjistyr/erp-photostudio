<?php

namespace Modules\Order\Enums;

/** Diturunkan dari total pembayaran vs total order — tidak pernah disimpan. */
enum PaymentStatus: string
{
    case Unpaid = 'unpaid';
    case Partial = 'partial';
    case Paid = 'paid';

    /** Label tampilan — sama dengan teks di UI (dipakai ekspor CSV). */
    public function label(): string
    {
        return match ($this) {
            self::Unpaid => 'Belum Bayar',
            self::Partial => 'DP',
            self::Paid => 'Lunas',
        };
    }
}
