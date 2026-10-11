<?php

namespace Modules\Finance\Services;

use Carbon\CarbonImmutable;
use Modules\Asset\Models\Asset;

/** Aset yang habis umur ekonomis dalam horizon proyeksi (spek 6.2 / 8.3). */
final readonly class ReplacementDue
{
    /**
     * @param  int  $monthsUntil  selisih bulan kalender; negatif = sudah lewat
     * @param  int  $estimate  perkiraan dari harga beli (harga × unit)
     */
    public function __construct(
        public Asset $asset,
        public CarbonImmutable $dueOn,
        public int $monthsUntil,
        public int $estimate,
    ) {}
}
