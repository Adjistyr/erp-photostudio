<?php

namespace Modules\Finance\Services;

use Carbon\CarbonImmutable;
use Modules\Asset\Models\Asset;

final readonly class DueMaintenance
{
    /** @param  int  $daysUntil  negatif = sudah lewat */
    public function __construct(
        public Asset $asset,
        public CarbonImmutable $date,
        public int $daysUntil,
    ) {}
}
