<?php

namespace Modules\Finance\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Finance\Enums\ContributionDestination;
use Modules\Finance\Enums\ContributionKind;
use Modules\Finance\Enums\Fund;
use Modules\Finance\Models\Investment;
use Modules\Finance\Models\Owner;
use Modules\Finance\Models\OwnerContribution;
use Modules\Finance\Models\ProfitShareRule;
use Modules\Finance\Services\Funds;
use Tests\TestCase;

/** Modal & Bagi Hasil (business-flow 8) — setoran, pos dana, investasi, rasio. */
class CapitalPageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');
        $this->actingAs(User::factory()->create());
    }

    private function owner(string $name): Owner
    {
        return Owner::where('name', $name)->sole();
    }

    private function balance(Fund $fund): int
    {
        return app(Funds::class)->balance($fund);
    }

    public function test_guest_is_redirected_to_login()
    {
        auth()->logout();

        $this->get(route('capital.index'))->assertRedirect(route('login'));
    }

    public function test_index_matches_finance_services()
    {
        $loans = array_sum(app(Funds::class)->outstandingLoans());

        $this->get(route('capital.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('finance::capital')
                ->where('funds.maintenance', $this->balance(Fund::Maintenance))
                ->where('funds.reserve', $this->balance(Fund::Reserve))
                ->where('outstanding_loans', $loans)
                // Juli dari saldo awal sheet, Agustus berjalan.
                ->has('history', 2)
                ->where('history.0.month', '2026-07')
                ->where('history.0.from_opening_balance', true)
                ->where('history.1.final', false)
                ->has('capital_recovery', 1)
                ->where('capital_recovery.0.owner_name', 'Agung')
                ->where('capital_recovery.0.equity', 15_809_000)
                ->has('contributions', OwnerContribution::count())
                ->has('investments', 1)
                ->where('investments.0.funded_by', 'Modal Agung')
                ->has('rules', 1)
                ->where('rules.0.status', 'current')
                ->where('next_rule_month', '2026-09')
                ->has('ledgers.maintenance')
                ->has('owners', 2)
            );
    }

    public function test_loan_into_maintenance_fund_raises_balance()
    {
        $before = $this->balance(Fund::Maintenance);

        $this->post(route('capital.contributions.store'), [
            'owner_id' => $this->owner('Raka')->id, 'kind' => 'loan', 'destination' => 'maintenance_fund',
            'amount' => 500_000, 'contributed_on' => '2026-08-26', 'note' => '',
        ])->assertRedirect(route('capital.index'))->assertSessionHasNoErrors();

        $this->assertSame($before + 500_000, $this->balance(Fund::Maintenance));
        $this->assertSame('Pinjaman owner', OwnerContribution::orderByDesc('id')->firstOrFail()->note);
    }

    public function test_equity_through_this_dialog_always_goes_to_cash()
    {
        // Modal untuk renovasi/alat lewat Catat Investasi supaya investasinya ikut tercatat.
        $this->post(route('capital.contributions.store'), [
            'owner_id' => $this->owner('Raka')->id, 'kind' => 'equity', 'destination' => 'reserve_fund',
            'amount' => 1_000_000, 'contributed_on' => '2026-08-26',
        ])->assertSessionHasNoErrors();

        $c = OwnerContribution::orderByDesc('id')->firstOrFail();
        $this->assertSame(ContributionDestination::Cash, $c->destination);
        $this->assertSame('Setoran modal', $c->note);
    }

    public function test_contribution_validation()
    {
        $this->post(route('capital.contributions.store'), [
            'owner_id' => 999, 'kind' => 'hibah', 'destination' => 'investment', 'amount' => 0, 'contributed_on' => '2026-08-27',
        ])->assertSessionHasErrors(['owner_id', 'kind', 'amount', 'contributed_on']);

        $this->post(route('capital.contributions.store'), [
            'owner_id' => $this->owner('Raka')->id, 'kind' => 'loan', 'destination' => 'investment', 'amount' => 1, 'contributed_on' => '2026-08-26',
        ])->assertSessionHasErrors('destination');
    }

    public function test_withdrawal_within_balance_and_rejected_above_it()
    {
        $before = $this->balance(Fund::Reserve);

        $this->post(route('capital.withdrawals.store'), [
            'fund' => 'reserve', 'amount' => $before + 1, 'withdrawn_on' => '2026-08-26', 'note' => 'Beli backdrop',
        ])->assertSessionHasErrors('amount');

        if ($before > 0) {
            $this->post(route('capital.withdrawals.store'), [
                'fund' => 'reserve', 'amount' => $before, 'withdrawn_on' => '2026-08-26', 'note' => 'Beli backdrop',
            ])->assertSessionHasNoErrors();
            $this->assertSame(0, $this->balance(Fund::Reserve));
        }

        $this->post(route('capital.withdrawals.store'), [
            'fund' => 'tabungan', 'amount' => 0, 'withdrawn_on' => '', 'note' => '',
        ])->assertSessionHasErrors(['fund', 'amount', 'withdrawn_on', 'note']);
    }

    public function test_investment_from_cash_and_from_owner()
    {
        $contributions = OwnerContribution::count();

        $this->post(route('capital.investments.store'), [
            'description' => 'Renovasi ruang studio', 'amount' => 4_000_000, 'invested_on' => '2026-08-20', 'paid_by' => null,
        ])->assertRedirect(route('capital.index'))->assertSessionHasNoErrors();
        $this->assertNull(Investment::orderByDesc('id')->firstOrFail()->owner_contribution_id);
        $this->assertSame($contributions, OwnerContribution::count());

        $this->post(route('capital.investments.store'), [
            'description' => 'Backdrop permanen', 'amount' => 2_000_000, 'invested_on' => '2026-08-20', 'paid_by' => $this->owner('Raka')->id,
        ])->assertSessionHasNoErrors();
        $c = Investment::orderByDesc('id')->firstOrFail()->contribution;
        $this->assertSame([ContributionKind::Equity, ContributionDestination::Investment, 2_000_000], [$c?->kind, $c?->destination, $c?->amount]);
    }

    public function test_new_rule_from_next_month()
    {
        $this->post(route('capital.rules.store'), [
            'effective_month' => '2026-09', 'reserve_percent' => 15,
            'shares' => [$this->owner('Agung')->id => 50, $this->owner('Raka')->id => 50],
        ])->assertRedirect(route('capital.index'))->assertSessionHasNoErrors();

        $rule = ProfitShareRule::where('effective_month', '2026-09')->sole();
        $this->assertSame(15, $rule->reserve_percent);
        $this->assertSame([50, 50], $rule->owners->pluck('pivot.percent')->map(fn ($p) => (int) $p)->all());
    }

    public function test_rule_validation_backdated_or_not_100_percent()
    {
        $agung = $this->owner('Agung')->id;
        $raka = $this->owner('Raka')->id;

        $this->post(route('capital.rules.store'), ['effective_month' => '2026-07', 'reserve_percent' => 10, 'shares' => [$agung => 70, $raka => 30]])
            ->assertSessionHasErrors('effective_month');
        $this->post(route('capital.rules.store'), ['effective_month' => '2026-09', 'reserve_percent' => 10, 'shares' => [$agung => 70, $raka => 40]])
            ->assertSessionHasErrors('effective_month');
        $this->post(route('capital.rules.store'), ['effective_month' => '2026-09', 'reserve_percent' => 101, 'shares' => [999 => 100]])
            ->assertSessionHasErrors(['reserve_percent', 'shares']);

        $this->assertSame(1, ProfitShareRule::count());
    }
}
