<?php

namespace App\Services\Finance;

use App\Enums\FundEntryType;
use Carbon\CarbonImmutable;

final readonly class FundEntry
{
    public function __construct(
        public CarbonImmutable $date,
        public FundEntryType $type,
        public string $description,
        public int $in,
        public int $out,
        public int $balance,
    ) {}
}
