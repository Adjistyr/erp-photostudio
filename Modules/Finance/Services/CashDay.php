<?php

namespace Modules\Finance\Services;

/** Penerimaan satu tanggal bayar, per metode (Kas Harian). */
final readonly class CashDay
{
    /**
     * @param  array<string, int>  $byMethod  metode (PaymentMethod value) → rupiah
     */
    public function __construct(
        public string $date,
        public array $byMethod,
        public int $total,
        public int $count,
    ) {}
}
