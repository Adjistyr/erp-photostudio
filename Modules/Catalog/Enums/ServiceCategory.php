<?php

namespace Modules\Catalog\Enums;

/**
 * Kategori JASA — menentukan di form order mana paket muncul (spek 1.1).
 * Produk tetap kategori bebas.
 *
 * Nilai memakai teks kapital persis seperti data yang sudah tersimpan dan
 * dibaca form Buat Order — kolom `category` dipakai bersama produk, jadi
 * tidak diubah ke snake_case: migrasinya cukup normalisasi, bukan pemetaan.
 */
enum ServiceCategory: string
{
    case Studio = 'Studio';
    case Event = 'Event';
    case AddOn = 'Add-on';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return match ($this) {
            self::Studio => 'Studio — muncul di order sesi studio',
            self::Event => 'Event — muncul di order event',
            self::AddOn => 'Add-on — muncul di keduanya',
        };
    }
}
