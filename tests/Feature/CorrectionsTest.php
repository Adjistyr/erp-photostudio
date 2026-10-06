<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Asset\Models\Asset;
use Modules\Expense\Models\JobCost;
use Modules\Expense\Models\OperatingExpense;
use Modules\Finance\Actions\RecordInvestment;
use Modules\Finance\Enums\ContributionDestination;
use Modules\Finance\Enums\ContributionKind;
use Modules\Finance\Enums\Fund;
use Modules\Finance\Models\FundWithdrawal;
use Modules\Finance\Models\Owner;
use Modules\Finance\Models\OwnerContribution;
use Modules\Finance\Services\Funds;
use Modules\Order\Enums\PaymentStatus;
use Modules\Order\Models\Order;
use Tests\TestCase;

/**
 * Koreksi salah catat = HAPUS lalu catat ulang (keputusan owner 2026-10-06),
 * hanya di bulan yang belum tutup buku. "Hari ini" 26 Agu: Juli tertutup.
 */
class CorrectionsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');
        $this->actingAs(User::factory()->create());
    }

    private function order(string $number): Order
    {
        return Order::with(['items', 'payments'])->where('number', $number)->sole();
    }

    private function maintenanceBalance(): int
    {
        return app(Funds::class)->balance(Fund::Maintenance);
    }

    public function test_deleting_payment_recomputes_payment_status()
    {
        $order = $this->order('ORD-0012');
        $payment = $order->payments->sole();

        $this->from(route('orders.index'))
            ->delete(route('orders.payments.destroy', [$order, $payment]))
            ->assertRedirect(route('orders.index'))
            ->assertSessionHasNoErrors();

        $this->assertSame(PaymentStatus::Unpaid, $this->order('ORD-0012')->paymentStatus());
    }

    public function test_payment_of_another_order_is_not_found()
    {
        $other = $this->order('ORD-0011')->payments->first();

        $this->delete(route('orders.payments.destroy', [$this->order('ORD-0012'), $other]))->assertNotFound();
    }

    public function test_records_in_closed_month_cannot_be_deleted()
    {
        $order = $this->order('ORD-0005');
        $julyPayment = $order->payments()->create(['paid_on' => '2026-07-30', 'amount' => 10_000, 'method' => 'cash', 'note' => 'DP']);
        $julyExpense = OperatingExpense::create(['spent_on' => '2026-07-15', 'category' => 'Utilitas', 'description' => 'x', 'amount' => 1]);

        $this->delete(route('orders.payments.destroy', [$order, $julyPayment]))->assertSessionHasErrors('delete');
        $this->delete(route('expenses.operating.destroy', $julyExpense))->assertSessionHasErrors('delete');

        $this->assertModelExists($julyPayment);
        $this->assertModelExists($julyExpense);
    }

    public function test_delete_job_cost_and_operating_expense()
    {
        $job = JobCost::orderByDesc('incurred_on')->firstOrFail();
        $expense = OperatingExpense::where('spent_on', '2026-08-10')->sole();

        $this->delete(route('expenses.job-costs.destroy', $job))->assertSessionHasNoErrors();
        $this->delete(route('expenses.operating.destroy', $expense))->assertSessionHasNoErrors();

        $this->assertModelMissing($job);
        $this->assertModelMissing($expense);
    }

    public function test_deleting_service_returns_cost_to_maintenance_fund()
    {
        $lighting = Asset::where('name', 'Lighting studio')->sole();
        $service = $lighting->maintenances()->sole();
        $before = $this->maintenanceBalance();

        $this->delete(route('assets.maintenances.destroy', [$lighting, $service]))->assertSessionHasNoErrors();

        $this->assertSame($before + 150_000, $this->maintenanceBalance());
    }

    public function test_deleting_fund_withdrawal_restores_balance()
    {
        $before = $this->maintenanceBalance();
        $w = FundWithdrawal::create(['fund' => Fund::Maintenance, 'withdrawn_on' => '2026-08-20', 'amount' => 100_000, 'note' => 'Salah catat']);
        $this->assertSame($before - 100_000, $this->maintenanceBalance());

        $this->delete(route('capital.withdrawals.destroy', $w))->assertSessionHasNoErrors();

        $this->assertSame($before, $this->maintenanceBalance());
    }

    public function test_unrepaid_cash_loan_can_be_deleted()
    {
        // Pinjaman Agung 25 Agu — Agustus rugi, jadi belum ada yang dilunasi.
        $loan = OwnerContribution::where('kind', ContributionKind::Loan)->where('contributed_on', '2026-08-25')->sole();

        $this->delete(route('capital.contributions.destroy', $loan))->assertSessionHasNoErrors();

        $this->assertModelMissing($loan);
    }

    public function test_equity_tied_to_investment_cannot_be_deleted_separately()
    {
        $raka = Owner::where('name', 'Raka')->sole();
        $investment = app(RecordInvestment::class)->execute('Backdrop', 1_000_000, '2026-08-20', $raka);

        $this->delete(route('capital.contributions.destroy', $investment->owner_contribution_id))
            ->assertSessionHasErrors('delete');
    }

    public function test_fund_loan_cannot_be_deleted_once_its_money_is_spent()
    {
        $loan = OwnerContribution::create([
            'owner_id' => Owner::where('name', 'Raka')->sole()->id, 'contributed_on' => '2026-08-20', 'amount' => 500_000,
            'kind' => ContributionKind::Loan, 'destination' => ContributionDestination::MaintenanceFund, 'note' => 'Pinjaman',
        ]);
        // Saldo dipakai sampai tersisa < 500 rb — menghapus pinjaman membuat dana minus.
        FundWithdrawal::create(['fund' => Fund::Maintenance, 'withdrawn_on' => '2026-08-21', 'amount' => $this->maintenanceBalance() - 100_000, 'note' => 'Servis besar']);

        $this->delete(route('capital.contributions.destroy', $loan))->assertSessionHasErrors('delete');
        $this->assertModelExists($loan);
    }
}
