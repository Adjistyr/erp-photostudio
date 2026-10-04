<?php

namespace App\Enums;

/** Lini usaha (business-flow bagian 1). Urutan case = urutan tampil laporan. */
enum BusinessLine: string
{
    case Retail = 'retail';
    case Studio = 'studio';
    case Event = 'event';
}
