<?php

namespace Modules\Finance\Services;

use Modules\Shared\Enums\BusinessLine;

final readonly class LineMargin
{
    public function __construct(
        public BusinessLine $line,
        public int $revenue,
        public int $directCost,
        public int $margin,
        public float $marginRatio,
        public float $share,
    ) {}
}
