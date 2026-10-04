<?php

namespace Modules\Finance\Enums;

enum FundEntryType: string
{
    case OwnerLoan = 'owner_loan';
    case Withdrawal = 'withdrawal';
    case AssetSale = 'asset_sale';
    case Allocation = 'allocation';
    case LoanRepayment = 'loan_repayment';

    public function label(): string
    {
        return match ($this) {
            self::OwnerLoan => 'Pinjaman owner',
            self::Withdrawal => 'Pemakaian',
            self::AssetSale => 'Hasil jual aset',
            self::Allocation => 'Alokasi',
            self::LoanRepayment => 'Pengembalian pinjaman',
        };
    }
}
