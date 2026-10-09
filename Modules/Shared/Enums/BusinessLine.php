<?php

namespace Modules\Shared\Enums;

/** Lini usaha (business-flow bagian 1). Urutan case = urutan tampil laporan. */
enum BusinessLine: string
{
    case Retail = 'retail';
    case Studio = 'studio';
    case Event = 'event';

    /** Label tampilan — sama dengan LINE_LABEL di UI. */
    public function label(): string
    {
        return match ($this) {
            self::Retail => 'Retail',
            self::Studio => 'Studio',
            self::Event => 'Event',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
