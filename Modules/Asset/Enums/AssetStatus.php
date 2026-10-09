<?php

namespace Modules\Asset\Enums;

/** Aset rusak tetap dimiliki (tetap dialokasikan); dilepas = dijual/hilang. */
enum AssetStatus: string
{
    case Active = 'active';
    case Broken = 'broken';
    case Disposed = 'disposed';

    /** Label tampilan — sama dengan teks di UI (dipakai ekspor CSV). */
    public function label(): string
    {
        return match ($this) {
            self::Active => 'Aktif',
            self::Broken => 'Rusak',
            self::Disposed => 'Dilepas',
        };
    }
}
