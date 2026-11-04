<?php

namespace Tests\Feature;

use Database\Seeders\PresentationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Asset\Models\AssetCheckout;
use Modules\Finance\Enums\ContributionKind;
use Modules\Finance\Enums\Fund;
use Modules\Finance\Models\OwnerContribution;
use Modules\Finance\Services\FundEntry;
use Modules\Finance\Services\Funds;
use Modules\Finance\Services\Periods;
use Modules\Finance\Services\ProfitAndLoss;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Modules\Shared\Enums\BusinessLine;
use Tests\TestCase;

/**
 * Data presentasi client: tanggal relatif ke hari ini, jadi dicek
 * invarian bisnisnya (tutup buku, uang order, pos dana) — bukan angka.
 */
class PresentationSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-11-15 10:00:00');
        $this->seed(PresentationSeeder::class);
    }

    public function test_closes_books_through_two_months_ago_and_leaves_last_month_open()
    {
        $this->assertSame('2026-09', Periods::lastClosedMonth());
        $this->assertSame('2026-10', app(Periods::class)->nextToClose());
    }

    public function test_schedules_at_least_two_studio_sessions_today_and_tomorrow()
    {
        $sessions = fn (string $date) => Order::where('business_line', BusinessLine::Studio)
            ->whereDate('service_date', $date)
            ->where('work_status', '!=', WorkStatus::Cancelled)
            ->count();

        $this->assertGreaterThanOrEqual(2, $sessions('2026-11-15'));
        $this->assertGreaterThanOrEqual(2, $sessions('2026-11-16'));
    }

    public function test_no_order_is_overpaid_and_installments_add_up_to_the_order_total()
    {
        $orders = Order::with(['items', 'payments', 'schedules'])->get();

        $this->assertSame([], $orders->filter(fn (Order $o) => $o->balance() < 0)->pluck('number')->all());
        $broken = $orders->filter(fn (Order $o) => $o->schedules->isNotEmpty() && (
            (int) $o->schedules->sum('amount') !== $o->total()
            || $o->schedules->last()->due_on->gt($o->service_date)
        ));
        $this->assertSame([], $broken->pluck('number')->all());
    }

    public function test_fund_balances_never_go_negative()
    {
        $funds = app(Funds::class);

        foreach (Fund::cases() as $fund) {
            $negative = array_filter($funds->ledger($fund), fn (FundEntry $e) => $e->balance < 0);
            $this->assertSame([], $negative, "Saldo {$fund->value} sempat minus.");
        }
    }

    public function test_every_losing_month_is_covered_by_an_owner_loan_at_month_end()
    {
        $profitAndLoss = app(ProfitAndLoss::class);
        $losingMonths = array_values(array_filter(
            Periods::range('2026-05', '2026-10'),
            fn (string $month) => $profitAndLoss->forMonth($month)->netProfit < 0,
        ));

        // Pinjaman April = saldo awal (sebelum app), bukan hasil hitung seeder.
        $loanMonths = OwnerContribution::where('kind', ContributionKind::Loan)
            ->whereDate('contributed_on', '>=', '2026-05-01')
            ->orderBy('contributed_on')
            ->get()
            ->map(fn (OwnerContribution $c) => $c->contributed_on->format('Y-m'))
            ->all();
        $this->assertSame($losingMonths, $loanMonths);
    }

    public function test_leaves_exactly_one_past_due_gear_checkout_unreturned()
    {
        $overdue = AssetCheckout::whereNull('returned_on')->where('due_back_on', '<', '2026-11-15')->pluck('checked_out_on')->unique();

        $this->assertCount(1, $overdue);
    }

    public function test_running_again_on_a_seeded_database_adds_nothing()
    {
        $orders = Order::count();

        $this->seed(PresentationSeeder::class);

        $this->assertSame($orders, Order::count());
    }
}
