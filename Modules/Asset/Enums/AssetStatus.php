<?php

namespace Modules\Asset\Enums;

/** Aset rusak tetap dimiliki (tetap dialokasikan); dilepas = dijual/hilang. */
enum AssetStatus: string
{
    case Active = 'active';
    case Broken = 'broken';
    case Disposed = 'disposed';
}
