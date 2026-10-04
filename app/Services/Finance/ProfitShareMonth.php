<?php

namespace App\Services\Finance;

final readonly class ProfitShareMonth
{
    public function __construct(
        public string $month,
        public int $netProfit,
        /** Bulan sebelum app dipakai — labanya dari sheet, bukan dari order. */
        public bool $fromOpeningBalance,
        /** Bulan sudah lewat. Bulan berjalan masih berubah tiap ada transaksi. */
        public bool $final,
        public int $accumulatedLossBefore,
        public int $outstandingLoansBefore,
        public int $outstandingLoans,
        public ProfitShareCalculation $calculation,
    ) {}

    public function shareOf(int $ownerId): int
    {
        foreach ($this->calculation->shares as $share) {
            if ($share->ownerId === $ownerId) {
                return $share->amount;
            }
        }

        return 0;
    }
}
