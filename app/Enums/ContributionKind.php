<?php

namespace App\Enums;

/**
 * Setoran owner (business-flow 8.3). Pinjaman dikembalikan sebelum laba
 * dibagi; modal tidak dikembalikan langsung — kembalinya lewat bagi hasil.
 */
enum ContributionKind: string
{
    case Loan = 'loan';
    case Equity = 'equity';
}
