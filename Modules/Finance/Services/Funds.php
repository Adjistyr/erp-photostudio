<?php

namespace Modules\Finance\Services;

use Carbon\CarbonImmutable;
use Modules\Asset\Models\Asset;
use Modules\Asset\Models\AssetMaintenance as MaintenanceRecord;
use Modules\Finance\Enums\ContributionKind;
use Modules\Finance\Enums\Fund;
use Modules\Finance\Enums\FundEntryType;
use Modules\Finance\Models\FundWithdrawal;
use Modules\Finance\Models\Owner;
use Modules\Finance\Models\OwnerContribution;
use Modules\Shared\Support\Money;

/**
 * Pos dana maintenance & cadangan (business-flow 8.2).
 *
 * - Alokasi masuk di akhir bulan dan hanya untuk bulan yang sudah TUTUP —
 *   laba bulan berjalan masih berubah, jadi cadangannya belum pasti.
 * - Pinjaman owner ke pos dana dikembalikan dari alokasi pos itu sendiri,
 *   bukan dari laba: kalau dari laba, rumus potongan 8.5 menampung dua jenis
 *   utang dan bisa memotong dua kali.
 * - Pemakaian dana TIDAK masuk laba rugi — uangnya sudah dikurangi saat
 *   disisihkan.
 */
class Funds
{
    private const ORDER_LOAN = 0;

    private const ORDER_MOVEMENT = 1;

    private const ORDER_ALLOCATION = 2;

    public function __construct(
        private readonly ProfitSharing $sharing,
        private readonly AssetMaintenance $assets,
        private readonly Periods $periods,
    ) {}

    /** @return list<FundEntry> */
    public function ledger(Fund $fund): array
    {
        return $this->run($fund)['entries'];
    }

    public function balance(Fund $fund): int
    {
        $entries = $this->ledger($fund);

        return $entries === [] ? 0 : $entries[array_key_last($entries)]->balance;
    }

    /**
     * Saldo pos dana tidak boleh minus. Kekurangannya ditutup setoran owner
     * dulu — kalau dibiarkan minus, dana diam-diam meminjam dari kas dan
     * tidak ada yang mencatat siapa yang harus mengganti.
     */
    public function validateWithdrawal(Fund $fund, int $amount): ?string
    {
        if ($amount <= 0) {
            return 'Nominal harus lebih dari 0.';
        }
        $balance = $this->balance($fund);
        if ($amount > $balance) {
            return 'Saldo '.mb_strtolower($fund->label()).' tinggal '.Money::format($balance).'. Catat setoran owner ke pos ini dulu untuk menutup kekurangannya.';
        }

        return null;
    }

    /**
     * Nominal 0 sah — perawatan yang dikerjakan sendiri. Di atas 0, biaya
     * keluar dari dana maintenance dan tunduk pada aturan saldo.
     */
    public function validateMaintenanceCost(int $cost): ?string
    {
        if ($cost < 0) {
            return 'Biaya servis tidak boleh negatif.';
        }

        return $cost === 0 ? null : $this->validateWithdrawal(Fund::Maintenance, $cost);
    }

    /**
     * Sisa pinjaman per setoran, per hari ini — pinjaman ke kas (dari bagi
     * hasil) dan ke pos dana. Setoran modal tidak punya sisa.
     *
     * @return array<int, int> owner_contribution_id => sisa
     */
    public function outstandingLoans(): array
    {
        $result = [];
        $history = $this->sharing->history($this->periods->current());
        if ($history !== []) {
            foreach ($history[array_key_last($history)]->calculation->loans as $loan) {
                $result[$loan->contributionId] = $loan->remaining;
            }
        }
        foreach (Fund::cases() as $fund) {
            foreach ($this->run($fund)['loans'] as $loan) {
                $result[$loan->contributionId] = $loan->remaining;
            }
        }

        return $result;
    }

    /** @return array{entries: list<FundEntry>, loans: list<OpenLoan>} */
    private function run(Fund $fund): array
    {
        $events = [];

        $loans = OwnerContribution::query()
            ->where('kind', ContributionKind::Loan)
            ->where('destination', $fund->contributionDestination())
            ->orderBy('id')
            ->get();
        foreach ($loans as $c) {
            $events[] = ['date' => $c->contributed_on, 'order' => self::ORDER_LOAN, 'contribution' => $c];
        }

        if ($fund === Fund::Maintenance) {
            // Hasil jual aset masuk dana maintenance (untuk membeli pengganti),
            // bukan omzet — bukan penjualan.
            foreach (Asset::whereNotNull('disposed_on')->where('sale_price', '>', 0)->orderBy('id')->get() as $asset) {
                $events[] = ['date' => $asset->disposed_on, 'order' => self::ORDER_MOVEMENT, 'movement' => [FundEntryType::AssetSale, $asset->name.' — '.$asset->disposal_reason, (int) $asset->sale_price, 0]];
            }
            // Perawatan Rp 0 (dikerjakan sendiri) tidak menggerakkan dana.
            foreach (MaintenanceRecord::with('asset')->where('cost', '>', 0)->orderBy('id')->get() as $m) {
                $events[] = ['date' => $m->performed_on, 'order' => self::ORDER_MOVEMENT, 'movement' => [FundEntryType::Withdrawal, $m->asset->name.' — '.$m->description, 0, $m->cost]];
            }
        }

        foreach (FundWithdrawal::where('fund', $fund)->orderBy('id')->get() as $w) {
            $events[] = ['date' => $w->withdrawn_on, 'order' => self::ORDER_MOVEMENT, 'movement' => [FundEntryType::Withdrawal, $w->note, 0, $w->amount, $w->id]];
        }

        foreach ($this->sharing->history($this->periods->current()) as $month) {
            if (! $month->final) {
                continue;
            }
            $amount = $fund === Fund::Maintenance
                ? $this->assets->allocationForMonth($month->month)
                : $month->calculation->reserve;
            $events[] = ['date' => Periods::end($month->month), 'order' => self::ORDER_ALLOCATION, 'allocation' => [$month->month, $amount]];
        }

        // usort stabil sejak PHP 8 — urutan sisipan dipertahankan untuk
        // tanggal & urutan yang sama.
        usort($events, fn (array $a, array $b) => [$a['date']->toDateString(), $a['order']] <=> [$b['date']->toDateString(), $b['order']]);

        $entries = [];
        /** @var list<OpenLoan> $debts */
        $debts = [];
        $balance = 0;
        $add = function (CarbonImmutable $date, FundEntryType $type, string $desc, int $in, int $out, ?int $withdrawalId = null) use (&$entries, &$balance) {
            $balance += $in - $out;
            $entries[] = new FundEntry($date, $type, $desc, $in, $out, $balance, $withdrawalId);
        };

        foreach ($events as $e) {
            if (isset($e['contribution'])) {
                /** @var OwnerContribution $c */
                $c = $e['contribution'];
                $debts[] = new OpenLoan($c->id, $c->owner_id, $c->amount);
                $add($e['date'], FundEntryType::OwnerLoan, $c->owner->name.' — '.$c->note, $c->amount, 0);
            } elseif (isset($e['movement'])) {
                [$type, $desc, $in, $out] = $e['movement'];
                $add($e['date'], $type, $desc, $in, $out, $e['movement'][4] ?? null);
            } else {
                [$month, $amount] = $e['allocation'];
                // Bulan rugi tidak punya alokasi cadangan — baris Rp 0 cuma noise.
                if ($amount <= 0) {
                    continue;
                }
                $add($e['date'], FundEntryType::Allocation, 'Alokasi '.Periods::label($month), $amount, 0);
                $available = $amount;
                foreach ($debts as $i => $debt) {
                    $pay = min($debt->remaining, $available);
                    if ($pay <= 0) {
                        continue;
                    }
                    $debts[$i] = $debt->reduce($pay);
                    $available -= $pay;
                    $add($e['date'], FundEntryType::LoanRepayment, 'Ke '.$this->ownerName($debt->ownerId), 0, $pay);
                }
            }
        }

        return ['entries' => $entries, 'loans' => $debts];
    }

    private function ownerName(int $ownerId): string
    {
        return Owner::find($ownerId)->name ?? (string) $ownerId;
    }
}
