<?php

namespace Modules\Asset\Enums;

/** Dua galeri per aset (spek 8.2). */
enum AssetPhotoKind: string
{
    /** Foto alat — kondisi saat beli/rusak/dijual; pertama = sampul. */
    case Item = 'item';
    /** Nota & kartu garansi — boleh PDF. */
    case Receipt = 'receipt';

    public function max(): int
    {
        return match ($this) {
            self::Item => 8,
            self::Receipt => 4,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Item => 'foto alat',
            self::Receipt => 'nota & garansi',
        };
    }
}
