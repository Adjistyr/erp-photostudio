<?php

namespace Modules\Finance\Services;

use Modules\Finance\Models\Owner;

final readonly class CapitalRecovery
{
    public function __construct(
        public Owner $owner,
        public int $equity,
        public int $entitled,
        public float $ratio,
    ) {}
}
