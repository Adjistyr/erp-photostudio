<?php

namespace Modules\Finance\Services;

final readonly class BreakEven
{
    public function __construct(
        public int $fixedCosts,
        public int $grossProfit,
        public int $shortfall,
        public float $ratio,
    ) {}
}
