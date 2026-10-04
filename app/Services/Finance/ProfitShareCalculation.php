<?php

namespace App\Services\Finance;

final readonly class ProfitShareCalculation
{
    /**
     * @param  list<LoanRepayment>  $repayments
     * @param  list<OwnerShare>  $shares
     * @param  list<OpenLoan>  $loans  sisa pinjaman SETELAH bulan ini
     */
    public function __construct(
        public int $deduction,
        public array $repayments,
        public int $distributable,
        public int $reserve,
        public array $shares,
        public int $accumulatedLoss,
        public array $loans,
    ) {}
}
