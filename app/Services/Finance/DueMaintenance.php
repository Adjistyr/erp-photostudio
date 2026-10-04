<?php

namespace App\Services\Finance;

use App\Models\Asset;
use Carbon\CarbonImmutable;

final readonly class DueMaintenance
{
    /** @param  int  $daysUntil  negatif = sudah lewat */
    public function __construct(
        public Asset $asset,
        public CarbonImmutable $date,
        public int $daysUntil,
    ) {}
}
