<?php

namespace Modules\Finance\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Finance\Actions\RecordInvestment;
use Modules\Finance\Enums\ContributionKind;
use Modules\Finance\Enums\Fund;
use Modules\Finance\Models\FundWithdrawal;
use Modules\Finance\Models\Investment;
use Modules\Finance\Models\Owner;
use Modules\Finance\Models\OwnerContribution;
use Modules\Finance\Models\ProfitShareRule;
use Modules\Finance\Requests\StoreContributionRequest;
use Modules\Finance\Requests\StoreInvestmentRequest;
use Modules\Finance\Requests\StoreProfitShareRuleRequest;
use Modules\Finance\Requests\StoreWithdrawalRequest;
use Modules\Finance\Services\CapitalRecovery;
use Modules\Finance\Services\FundEntry;
use Modules\Finance\Services\Funds;
use Modules\Finance\Services\OwnerShare;
use Modules\Finance\Services\Periods;
use Modules\Finance\Services\ProfitShareMonth;
use Modules\Finance\Services\ProfitSharing;
use Modules\Shared\Support\Money;

/**
 * Modal & Bagi Hasil (business-flow bagian 8). Semua angka DITURUNKAN dari
 * riwayat (setoran, pemakaian, investasi, aturan) setiap kali dibuka — tidak
 * ada saldo tersimpan yang bisa basi saat biaya bulan lalu diinput telat.
 * Riwayat tidak diedit: koreksi = baris baru.
 */
class CapitalController extends Controller
{
    public function index(ProfitSharing $sharing, Funds $funds, Periods $periods): Response
    {
        $month = $periods->current();
        $history = $sharing->history($month);
        $last = $history === [] ? null : $history[array_key_last($history)];
        $loans = $funds->outstandingLoans();
        $current = $sharing->ruleFor($month);
        $latestRule = ProfitShareRule::max('effective_month');
        $base = is_string($latestRule) && $latestRule >= $month ? $latestRule : $month;

        return Inertia::render('finance::capital', [
            'month' => $month,
            'today' => today()->toDateString(),
            'funds' => [
                'maintenance' => $funds->balance(Fund::Maintenance),
                'reserve' => $funds->balance(Fund::Reserve),
            ],
            'outstanding_loans' => array_sum($loans),
            'history' => array_map(fn (ProfitShareMonth $m) => [
                'month' => $m->month,
                'net_profit' => $m->netProfit,
                'from_opening_balance' => $m->fromOpeningBalance,
                'final' => $m->final,
                'deduction' => $m->calculation->deduction,
                'distributable' => $m->calculation->distributable,
                'reserve' => $m->calculation->reserve,
                'shares' => array_map(fn (OwnerShare $o) => [
                    'owner_id' => $o->ownerId, 'percent' => $o->percent, 'amount' => $o->amount,
                ], $m->calculation->shares),
            ], $history),
            // Yang dibawa ke bulan depan: rugi & pinjaman ditutup dulu sebelum dibagi.
            'carry' => $last === null ? null : [
                'accumulated_loss' => $last->calculation->accumulatedLoss,
                'outstanding_loans' => $last->outstandingLoans,
                'next_month' => Periods::next($month),
            ],
            'capital_recovery' => array_map(fn (CapitalRecovery $c) => [
                'owner_name' => $c->owner->name,
                'equity' => $c->equity,
                'entitled' => $c->entitled,
                'ratio' => $c->ratio,
            ], $sharing->capitalRecovery()),
            'contributions' => OwnerContribution::with('owner')
                ->orderByDesc('contributed_on')->orderByDesc('id')->get()
                ->map(fn (OwnerContribution $c) => [
                    'id' => $c->id,
                    'contributed_on' => $c->contributed_on->toDateString(),
                    'owner_name' => $c->owner->name,
                    'kind' => $c->kind->value,
                    'destination' => $c->destination->value,
                    'note' => $c->note,
                    'amount' => $c->amount,
                    'remaining' => $c->kind === ContributionKind::Loan ? ($loans[$c->id] ?? 0) : null,
                ])->values()->all(),
            'ledgers' => [
                'maintenance' => $this->ledger($funds, Fund::Maintenance),
                'reserve' => $this->ledger($funds, Fund::Reserve),
            ],
            'investments' => Investment::with('contribution.owner')
                ->orderByDesc('invested_on')->orderByDesc('id')->get()
                ->map(fn (Investment $i) => [
                    'id' => $i->id,
                    'invested_on' => $i->invested_on->toDateString(),
                    'description' => $i->description,
                    'amount' => $i->amount,
                    'funded_by' => $i->contribution !== null ? "Modal {$i->contribution->owner->name}" : 'Kas usaha',
                ])->values()->all(),
            'rules' => ProfitShareRule::with('owners')->orderByDesc('effective_month')->get()
                ->map(fn (ProfitShareRule $r) => [
                    'id' => $r->id,
                    'effective_month' => $r->effective_month,
                    'reserve_percent' => $r->reserve_percent,
                    'shares' => $r->owners->map(fn (Owner $o) => [
                        'owner_id' => $o->id,
                        'percent' => (int) $o->getRelationValue('pivot')->getAttribute('percent'),
                    ])->values()->all(),
                    'status' => $current?->id === $r->id ? 'current' : ($r->effective_month > $month ? 'scheduled' : 'history'),
                ])->values()->all(),
            // Default dialog Ubah Rasio: bulan sesudah aturan terakhir/bulan
            // berjalan — rasio biasanya disepakati untuk periode berikutnya.
            'next_rule_month' => Periods::next($base),
            'owners' => Owner::orderBy('id')->get(['id', 'name']),
        ]);
    }

    public function storeContribution(StoreContributionRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $kind = ContributionKind::from($data['kind']);
        $owner = Owner::findOrFail($request->integer('owner_id'));
        OwnerContribution::create([
            'owner_id' => $owner->id,
            'contributed_on' => $data['contributed_on'],
            'amount' => $data['amount'],
            'kind' => $kind,
            'destination' => $request->destination(),
            'note' => trim((string) ($data['note'] ?? '')) ?: ($kind === ContributionKind::Equity ? 'Setoran modal' : 'Pinjaman owner'),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Setoran {$owner->name} ".Money::format($data['amount']).' tercatat — tidak masuk omzet.']);

        return to_route('capital.index');
    }

    public function storeWithdrawal(StoreWithdrawalRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $fund = Fund::from($data['fund']);
        FundWithdrawal::create([
            'fund' => $fund,
            'withdrawn_on' => $data['withdrawn_on'],
            'amount' => $data['amount'],
            'note' => trim($data['note']),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$fund->label()} ".Money::format($data['amount']).' dipakai — tidak masuk Laba Rugi.']);

        return to_route('capital.index');
    }

    public function storeInvestment(StoreInvestmentRequest $request, RecordInvestment $recordInvestment): RedirectResponse
    {
        $data = $request->validated();
        $owner = isset($data['paid_by']) ? Owner::findOrFail($request->integer('paid_by')) : null;
        DB::transaction(fn () => $recordInvestment->execute(trim($data['description']), $data['amount'], $data['invested_on'], $owner));

        $message = $owner === null
            ? Money::format($data['amount']).' dari kas usaha tercatat sebagai investasi.'
            : Money::format($data['amount'])." tercatat sebagai investasi dan modal {$owner->name}.";
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return to_route('capital.index');
    }

    public function storeRule(StoreProfitShareRuleRequest $request): RedirectResponse
    {
        $month = (string) $request->validated('effective_month');
        DB::transaction(function () use ($request, $month) {
            $rule = ProfitShareRule::create([
                'effective_month' => $month,
                'reserve_percent' => (int) $request->validated('reserve_percent'),
            ]);
            $rule->owners()->attach(array_map(fn (int $p) => ['percent' => $p], $request->shares()));
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Rasio baru berlaku mulai '.Periods::label($month).'. Bulan sebelumnya tetap memakai rasio lama.']);

        return to_route('capital.index');
    }

    /** @return list<array{date: string, type: string, description: string, in: int, out: int, balance: int}> */
    private function ledger(Funds $funds, Fund $fund): array
    {
        return array_map(fn (FundEntry $e) => [
            'date' => $e->date->toDateString(),
            'type' => $e->type->label(),
            'description' => $e->description,
            'in' => $e->in,
            'out' => $e->out,
            'balance' => $e->balance,
        ], $funds->ledger($fund));
    }
}
