<?php

namespace Modules\Finance\Services;

/** Pinjaman owner yang belum lunas. Immutable — pelunasan menghasilkan objek baru. */
final readonly class OpenLoan
{
    public function __construct(
        public int $contributionId,
        public int $ownerId,
        public int $remaining,
    ) {}

    public function reduce(int $amount): self
    {
        return new self($this->contributionId, $this->ownerId, $this->remaining - $amount);
    }
}
