<?php

namespace App\Services\Finance;

final readonly class LoanRepayment
{
    public function __construct(
        public int $contributionId,
        public int $ownerId,
        public int $amount,
    ) {}
}
