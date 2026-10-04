<?php

namespace App\Services\Finance;

final readonly class OwnerShare
{
    public function __construct(
        public int $ownerId,
        public int $percent,
        public int $amount,
    ) {}
}
