<?php

namespace App\Services\Finance;

use App\Models\Owner;

final readonly class CapitalRecovery
{
    public function __construct(
        public Owner $owner,
        public int $equity,
        public int $entitled,
        public float $ratio,
    ) {}
}
