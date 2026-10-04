<?php

namespace Tests\Feature\Finance;

use App\Enums\AssetStatus;
use App\Enums\ContributionDestination;
use App\Enums\ContributionKind;
use App\Enums\Fund;
use App\Enums\FundEntryType;
use App\Models\Asset;
use App\Models\FundWithdrawal;
use App\Models\Owner;
use App\Models\OwnerContribution;
use App\Services\Finance\Funds;

/** Porting web/app/lib/bagi-hasil.test.ts & aset.test.ts (pos dana). */
class FundsTest extends DemoDataTestCase
{
    private function funds(): Funds
    {
        return app(Funds::class);
    }

    public function test_balances_only_count_closed_months()
    {
        // Juli: maintenance 790.450, cadangan 10% laba Juli 141.270. Agustus
        // belum tutup — alokasinya belum masuk. Servis lighting 150.000.
        $this->assertSame(640_450, $this->funds()->balance(Fund::Maintenance));
        $this->assertSame(141_270, $this->funds()->balance(Fund::Reserve));
    }

    public function test_maintenance_ledger_running_balance()
    {
        $rows = array_map(
            fn ($e) => [$e->date->toDateString(), $e->type, $e->in, $e->out, $e->balance],
            $this->funds()->ledger(Fund::Maintenance),
        );

        $this->assertSame([
            ['2026-07-31', FundEntryType::Allocation, 790_450, 0, 790_450],
            ['2026-08-10', FundEntryType::Withdrawal, 0, 150_000, 640_450],
        ], $rows);
    }

    public function test_withdrawal_above_balance_is_rejected()
    {
        $this->assertNull($this->funds()->validateWithdrawal(Fund::Reserve, 141_270));
        $this->assertStringContainsString('setoran owner', $this->funds()->validateWithdrawal(Fund::Reserve, 141_271) ?? '');
        $this->assertStringContainsString('lebih dari 0', $this->funds()->validateWithdrawal(Fund::Reserve, 0) ?? '');
    }

    public function test_maintenance_cost_paid_from_maintenance_fund()
    {
        $this->assertNull($this->funds()->validateMaintenanceCost(0));
        $this->assertNull($this->funds()->validateMaintenanceCost(640_450));
        $this->assertStringContainsString('setoran owner', $this->funds()->validateMaintenanceCost(640_451) ?? '');
        $this->assertStringContainsString('negatif', $this->funds()->validateMaintenanceCost(-1) ?? '');
    }

    public function test_loan_into_fund_is_repaid_from_next_allocation()
    {
        // Cadangan kosong di awal Juli, beli mendesak 300 rb ditalangi Raka.
        $loan = OwnerContribution::create([
            'owner_id' => Owner::where('name', 'Raka')->value('id'), 'contributed_on' => '2026-07-20',
            'amount' => 300_000, 'kind' => ContributionKind::Loan,
            'destination' => ContributionDestination::ReserveFund, 'note' => 'Talangan',
        ]);
        FundWithdrawal::create(['fund' => Fund::Reserve, 'withdrawn_on' => '2026-07-20', 'amount' => 300_000, 'note' => 'Ganti baterai kamera']);

        $rows = array_map(fn ($e) => [$e->type, $e->in, $e->out, $e->balance], $this->funds()->ledger(Fund::Reserve));
        $this->assertSame([
            [FundEntryType::OwnerLoan, 300_000, 0, 300_000],
            [FundEntryType::Withdrawal, 0, 300_000, 0],
            [FundEntryType::Allocation, 141_270, 0, 141_270],
            // Alokasi Juli 141.270 < pinjaman 300.000 — seluruhnya untuk Raka.
            [FundEntryType::LoanRepayment, 0, 141_270, 0],
        ], $rows);
        $this->assertSame(158_730, $this->funds()->outstandingLoans()[$loan->id]);
    }

    public function test_outstanding_loans_per_contribution_equity_has_none()
    {
        $loans = $this->funds()->outstandingLoans();
        $cashLoan = OwnerContribution::where('kind', ContributionKind::Loan)->firstOrFail();
        $equity = OwnerContribution::where('kind', ContributionKind::Equity)->firstOrFail();

        $this->assertSame(2_000_000, $loans[$cashLoan->id]);
        $this->assertArrayNotHasKey($equity->id, $loans);
    }

    public function test_asset_sale_proceeds_go_to_maintenance_fund()
    {
        $before = $this->funds()->balance(Fund::Maintenance);
        Asset::where('name', 'Lighting studio')->update([
            'status' => AssetStatus::Disposed, 'disposed_on' => '2026-08-20',
            'disposal_reason' => 'Dijual', 'sale_price' => 1_500_000,
        ]);

        $sale = collect($this->funds()->ledger(Fund::Maintenance))->first(fn ($e) => $e->type === FundEntryType::AssetSale);
        $this->assertNotNull($sale);
        $this->assertSame('2026-08-20', $sale->date->toDateString());
        $this->assertSame(1_500_000, $sale->in);
        $this->assertSame($before + 1_500_000, $this->funds()->balance(Fund::Maintenance));
    }
}
