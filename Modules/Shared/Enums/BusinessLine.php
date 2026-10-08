<?php

namespace Modules\Shared\Enums;

/** Lini usaha (business-flow bagian 1). Urutan case = urutan tampil laporan. */
enum BusinessLine: string
{
    case Retail = 'retail';
    case Studio = 'studio';
    case Event = 'event';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
