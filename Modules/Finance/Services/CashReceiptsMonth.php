<?php

namespace Modules\Finance\Services;

final readonly class CashReceiptsMonth
{
    /**
     * @param  list<CashDay>  $days  hanya hari yang punya pembayaran
     * @param  array<string, int>  $totals  metode → rupiah sebulan
     */
    public function __construct(
        public string $month,
        public array $days,
        public array $totals,
        public int $total,
        public int $count,
    ) {}
}
