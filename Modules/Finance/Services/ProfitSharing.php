<?php

namespace Modules\Finance\Services;

use Modules\Finance\Enums\ContributionDestination;
use Modules\Finance\Enums\ContributionKind;
use Modules\Finance\Models\OpeningBalance;
use Modules\Finance\Models\Owner;
use Modules\Finance\Models\OwnerContribution;
use Modules\Finance\Models\ProfitShareRule;

/**
 * Bagi hasil — business-flow 8.5 & 8.6. Semua angka dihitung ulang dari
 * riwayat setiap kali dipanggil, tidak disimpan: tidak ada angka tersimpan
 * yang bisa basi saat biaya bulan lalu diinput telat.
 */
class ProfitSharing
{
    public function __construct(
        private readonly ProfitAndLoss $pnl,
        private readonly Periods $periods,
    ) {}

    /**
     * Bagi hasil satu bulan — murni, input tidak diubah.
     *
     * Rugi yang dibawa dan pinjaman owner ke kas sering UANG YANG SAMA (owner
     * meminjamkan justru karena rugi). Kalau dipotong terpisah, laba
     * terpotong dua kali. Karena itu potongannya satu:
     *
     *   potongan = min(laba, max(akumulasi rugi, sisa pinjaman))
     *
     * Potongan melunasi pinjaman urut tanggal setor; sisanya tetap di kas.
     * Owner terakhir menerima sisa pembulatan supaya total persis = laba.
     *
     * @param  list<OpenLoan>  $loans  urut tanggal setor
     * @param  list<array{owner_id: int, percent: int}>  $shares
     */
    public static function calculate(int $netProfit, int $accumulatedLoss, array $loans, int $reservePercent, array $shares): ProfitShareCalculation
    {
        if ($netProfit <= 0) {
            return new ProfitShareCalculation(
                deduction: 0,
                repayments: [],
                distributable: 0,
                reserve: 0,
                shares: array_map(fn (array $s) => new OwnerShare($s['owner_id'], $s['percent'], 0), $shares),
                accumulatedLoss: $accumulatedLoss - $netProfit,
                loans: $loans,
            );
        }

        $outstanding = array_sum(array_map(fn (OpenLoan $l) => $l->remaining, $loans));
        $deduction = min($netProfit, max($accumulatedLoss, $outstanding));

        $repayments = [];
        $remainingLoans = [];
        $toPay = $deduction;
        foreach ($loans as $loan) {
            $amount = min($loan->remaining, $toPay);
            if ($amount > 0) {
                $repayments[] = new LoanRepayment($loan->contributionId, $loan->ownerId, $amount);
                $toPay -= $amount;
                $loan = $loan->reduce($amount);
            }
            $remainingLoans[] = $loan;
        }

        $distributable = $netProfit - $deduction;
        $reserve = (int) round($distributable * $reservePercent / 100);

        return new ProfitShareCalculation(
            deduction: $deduction,
            repayments: $repayments,
            distributable: $distributable,
            reserve: $reserve,
            shares: self::splitByPercent($distributable - $reserve, $shares),
            accumulatedLoss: max(0, $accumulatedLoss - $deduction),
            loans: $remainingLoans,
        );
    }

    /**
     * @param  list<array{owner_id: int, percent: int}>  $shares
     * @return list<OwnerShare>
     */
    private static function splitByPercent(int $total, array $shares): array
    {
        $used = 0;
        $result = [];
        $last = count($shares) - 1;
        foreach ($shares as $i => $s) {
            $amount = $i === $last ? $total - $used : (int) round($total * $s['percent'] / 100);
            $used += $amount;
            $result[] = new OwnerShare($s['owner_id'], $s['percent'], $amount);
        }

        return $result;
    }

    /** Aturan yang berlaku di bulan itu = aturan terakhir yang mulai ≤ bulan. */
    public function ruleFor(string $month): ?ProfitShareRule
    {
        return ProfitShareRule::with('owners')
            ->where('effective_month', '<=', $month)
            ->orderByDesc('effective_month')
            ->first();
    }

    /**
     * Riwayat bagi hasil dari aturan pertama sampai $untilMonth.
     *
     * @return list<ProfitShareMonth>
     */
    public function history(string $untilMonth): array
    {
        $first = $this->periods->firstMonth();
        if ($first === null) {
            return [];
        }

        $cashLoans = OwnerContribution::query()
            ->where('kind', ContributionKind::Loan)
            ->where('destination', ContributionDestination::Cash)
            ->orderBy('contributed_on')
            ->orderBy('id')
            ->get();
        $openings = OpeningBalance::pluck('net_profit', 'month');
        $closed = $this->periods->closedMonths();

        $history = [];
        $loss = 0;
        /** @var list<OpenLoan> $loans */
        $loans = [];
        foreach (Periods::range($first, $untilMonth) as $month) {
            // Pinjaman yang disetor sampai akhir bulan ini ikut dihitung bulan ini.
            foreach ($cashLoans as $c) {
                if ($c->contributed_on->format('Y-m') === $month) {
                    $loans[] = new OpenLoan($c->id, $c->owner_id, $c->amount);
                }
            }

            $rule = $this->ruleFor($month);
            if ($rule === null) {
                continue; // tidak mungkin: bulan ≥ aturan pertama
            }

            $fromOpening = $openings->has($month);
            $net = $fromOpening ? (int) $openings->get($month) : $this->pnl->forMonth($month)->netProfit;
            $lossBefore = $loss;
            $loansBefore = $this->sumLoans($loans);

            $calc = self::calculate($net, $loss, $loans, $rule->reserve_percent, $rule->shares());
            $loss = $calc->accumulatedLoss;
            $loans = $calc->loans;

            $history[] = new ProfitShareMonth(
                month: $month,
                netProfit: $net,
                fromOpeningBalance: $fromOpening,
                // Final = sudah tutup buku, bukan sekadar lewat kalender.
                final: in_array($month, $closed, true),
                accumulatedLossBefore: $lossBefore,
                outstandingLoansBefore: $loansBefore,
                outstandingLoans: $this->sumLoans($loans),
                calculation: $calc,
            );
        }

        return $history;
    }

    public function forMonth(string $month): ?ProfitShareMonth
    {
        foreach ($this->history($month) as $m) {
            if ($m->month === $month) {
                return $m;
            }
        }

        return null;
    }

    /** @param  list<OpenLoan>  $loans */
    private function sumLoans(array $loans): int
    {
        return array_sum(array_map(fn (OpenLoan $l) => $l->remaining, $loans));
    }

    /**
     * Aturan baru hanya boleh berlaku mulai bulan berjalan atau sesudahnya,
     * dan sesudah aturan terakhir. Berlaku mundur = mengubah bagi hasil bulan
     * yang sudah dihitung — tepat yang mau dicegah (8.6).
     *
     * @param  array<int, int>  $sharesByOwner  owner_id => persen
     */
    public function validateRule(string $effectiveMonth, int $reservePercent, array $sharesByOwner): ?string
    {
        if (! preg_match('/^\d{4}-\d{2}$/', $effectiveMonth)) {
            return 'Pilih bulan mulai berlaku.';
        }
        if ($effectiveMonth < $this->periods->current()) {
            return Periods::label($effectiveMonth).' sudah tutup — aturan tidak boleh berlaku mundur ke bulan yang bagi hasilnya sudah dihitung.';
        }
        $latest = ProfitShareRule::max('effective_month');
        if (is_string($latest) && $effectiveMonth <= $latest) {
            return 'Sudah ada aturan yang berlaku mulai '.Periods::label($latest).'. Pilih bulan sesudahnya.';
        }
        foreach ($sharesByOwner as $percent) {
            if ($percent < 0 || $percent > 100) {
                return 'Persen tiap owner harus bilangan bulat 0–100.';
            }
        }
        $total = array_sum($sharesByOwner);
        if ($total !== 100) {
            return "Total bagian owner {$total}%, harus 100%.";
        }
        if ($reservePercent < 0 || $reservePercent > 100) {
            return 'Persen dana cadangan harus bilangan bulat 0–100.';
        }

        return null;
    }

    /**
     * Hak bagi hasil dibanding modal yang disetor (8.7) — HAK dari bulan yang
     * sudah tutup, bukan uang yang dicairkan. Owner tanpa setoran modal tidak
     * ikut. Kosong = modal awal belum diisi; layar menyembunyikan widget,
     * bukan menampilkan 0%.
     *
     * @return list<CapitalRecovery>
     */
    public function capitalRecovery(): array
    {
        $closed = array_filter($this->history($this->periods->current()), fn (ProfitShareMonth $m) => $m->final);
        $result = [];
        foreach (Owner::orderBy('id')->get() as $owner) {
            $equity = (int) OwnerContribution::where('owner_id', $owner->id)->where('kind', ContributionKind::Equity)->sum('amount');
            if ($equity <= 0) {
                continue;
            }
            $entitled = array_sum(array_map(fn (ProfitShareMonth $m) => $m->shareOf($owner->id), $closed));
            $result[] = new CapitalRecovery($owner, $equity, $entitled, $entitled / $equity);
        }

        return $result;
    }
}
