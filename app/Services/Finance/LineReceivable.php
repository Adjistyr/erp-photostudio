<?php

namespace App\Services\Finance;

use App\Enums\BusinessLine;

final readonly class LineReceivable
{
    public function __construct(
        public BusinessLine $line,
        public int $amount,
        public float $share,
    ) {}
}
