<?php

namespace Modules\Finance\Services;

/** Penerimaan satu tanggal bayar, per metode (Kas Harian). */
final readonly class CashDay
{
    /**
     * @param  array<string, int>  $byMethod  metode → rupiah BERSIH (masuk − pengembalian)
     * @param  array<string, int>  $refunds  metode → rupiah yang dikembalikan (spek 4.2)
     */
    public function __construct(
        public string $date,
        public array $byMethod,
        public int $total,
        public int $count,
        public array $refunds = [],
    ) {}
}
