<?php

namespace Modules\Order\Enums;

enum PaymentMethod: string
{
    case Cash = 'cash';
    case Transfer = 'transfer';
    case Qris = 'qris';

    /** Label tampilan — sama dengan teks di UI (dipakai ekspor CSV). */
    public function label(): string
    {
        return match ($this) {
            self::Cash => 'Tunai',
            self::Transfer => 'Transfer',
            self::Qris => 'QRIS',
        };
    }
}
