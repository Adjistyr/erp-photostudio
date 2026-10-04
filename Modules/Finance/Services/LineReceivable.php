<?php

namespace Modules\Finance\Services;

use Modules\Shared\Enums\BusinessLine;

final readonly class LineReceivable
{
    public function __construct(
        public BusinessLine $line,
        public int $amount,
        public float $share,
    ) {}
}
