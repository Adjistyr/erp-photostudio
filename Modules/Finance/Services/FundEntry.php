<?php

namespace Modules\Finance\Services;

use Carbon\CarbonImmutable;
use Modules\Finance\Enums\FundEntryType;

final readonly class FundEntry
{
    public function __construct(
        public CarbonImmutable $date,
        public FundEntryType $type,
        public string $description,
        public int $in,
        public int $out,
        public int $balance,
        /** Id pemakaian dana manual — supaya barisnya bisa dihapus dari layar. */
        public ?int $withdrawalId = null,
        /** Pencatat pemakaian dana manual; null untuk baris yang dihitung. */
        public ?string $createdByName = null,
    ) {}
}
