<?php

namespace App\Enums;

/**
 * Tujuan setoran menentukan dari mana pinjaman dikembalikan: ke kas dari
 * laba sebelum dibagi, ke pos dana dari alokasi pos itu sendiri.
 */
enum ContributionDestination: string
{
    case Cash = 'cash';
    case MaintenanceFund = 'maintenance_fund';
    case ReserveFund = 'reserve_fund';
    case Investment = 'investment';

    public function fund(): ?Fund
    {
        return match ($this) {
            self::MaintenanceFund => Fund::Maintenance,
            self::ReserveFund => Fund::Reserve,
            default => null,
        };
    }
}
