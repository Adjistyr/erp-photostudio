<?php

namespace Modules\Finance\Services;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Modules\Expense\Models\JobCost;
use Modules\Expense\Models\OperatingExpense;
use Modules\Order\Models\Order;
use Modules\Order\Models\Payment;
use Modules\Order\Models\Refund;
use Modules\Shared\Enums\BusinessLine;

/**
 * Laba rugi basis KAS (business-flow bagian 7): omzet = uang yang benar-benar
 * diterima pada periode, bukan nilai order yang selesai dikerjakan.
 * Mengubah basis ini mengubah seluruh angka historis.
 */
class ProfitAndLoss
{
    public function __construct(private readonly AssetMaintenance $assets) {}

    /**
     * Uang masuk bulan ini dikurangi pengembalian bulan ini (spek 4.2) —
     * refund mengurangi omzet bulan REFUND, bukan bulan pembayaran asli,
     * supaya bulan yang sudah tutup buku tidak berubah.
     */
    public function revenue(string $month, ?BusinessLine $line = null): int
    {
        $range = [Periods::start($month), Periods::end($month)];
        $byLine = fn ($q) => $q->whereHas('order', fn ($o) => $o->where('business_line', $line));

        $in = (int) Payment::query()->whereBetween('paid_on', $range)->when($line, $byLine)->sum('amount');
        $out = (int) Refund::query()->whereBetween('refunded_on', $range)->when($line, $byLine)->sum('amount');

        return $in - $out;
    }

    public function jobCosts(string $month, ?BusinessLine $line = null): int
    {
        return (int) JobCost::query()
            ->whereBetween('incurred_on', [Periods::start($month), Periods::end($month)])
            ->when($line, fn ($q) => $q->whereHas('order', fn ($o) => $o->where('business_line', $line)))
            ->sum('amount');
    }

    /**
     * HPP bahan diakui saat uang diterima, mengikuti basis kas — kalau tidak,
     * laba kotor retail bisa negatif di bulan barang terjual tapi belum
     * dibayar. Bagian HPP yang diakui sebanding uang yang masuk bulan ini:
     * DP 30% di Agustus → 30% HPP di Agustus, sisanya di bulan pelunasan.
     * Sebelumnya HPP penuh masuk di SETIAP bulan order menerima pembayaran,
     * jadi order dengan DP dan pelunasan beda bulan terhitung dua kali.
     *
     * Retail (dibayar sekali, lunas) tetap 100% di bulan bayar. Refund tidak
     * mengurangi HPP — barang sudah terpakai (spek 4.2).
     */
    public function materialCosts(string $month, ?BusinessLine $line = null): int
    {
        $start = Periods::start($month);
        $end = Periods::end($month);

        /** @var Collection<int, Order> $orders */
        $orders = Order::query()
            ->with(['items', 'payments'])
            ->whereHas('payments', fn ($q) => $q->whereBetween('paid_on', [$start, $end]))
            ->when($line, fn ($q) => $q->where('business_line', $line))
            ->get();

        return $orders->sum(fn (Order $o) => $this->recognisedMaterialCost($o, $start, $end));
    }

    /**
     * HPP yang diakui s/d akhir bulan dikurangi yang diakui s/d awal bulan,
     * masing-masing `round(HPP × dibayar kumulatif / total)`. Bentuk kumulatif
     * (bukan `round(HPP × bayar bulan ini / total)`) supaya pembulatan per
     * bulan tidak menggeser jumlahnya: lintas bulan selalu tepat HPP penuh
     * begitu lunas. Rasio dijepit ke 1 — bayar lebih tidak menambah HPP.
     */
    private function recognisedMaterialCost(Order $order, CarbonImmutable $start, CarbonImmutable $end): int
    {
        $material = $order->materialCost();
        $total = $order->total();
        if ($material === 0 || $total <= 0) {
            return $material;
        }

        $share = function (int $paid) use ($material, $total): int {
            return (int) round($material * min(1, $paid / $total));
        };
        $before = (int) $order->payments->filter(fn (Payment $p) => $p->paid_on->lt($start))->sum('amount');
        $upToEnd = (int) $order->payments->filter(fn (Payment $p) => $p->paid_on->lte($end))->sum('amount');

        return $share($upToEnd) - $share($before);
    }

    /** @return Collection<int, OperatingExpense> */
    public function operatingExpenses(string $month): Collection
    {
        return OperatingExpense::query()
            ->whereBetween('spent_on', [Periods::start($month), Periods::end($month)])
            ->orderBy('spent_on')
            ->orderBy('id')
            ->get();
    }

    public function forMonth(string $month): ProfitAndLossStatement
    {
        $revenueByLine = [];
        foreach (BusinessLine::cases() as $line) {
            $revenueByLine[$line->value] = $this->revenue($month, $line);
        }
        $totalRevenue = $this->revenue($month);
        $material = $this->materialCosts($month);
        $job = $this->jobCosts($month);
        $direct = $material + $job;
        $gross = $totalRevenue - $direct;
        $operating = $this->operatingExpenses($month);
        $totalOperating = (int) $operating->sum('amount');
        // Tetap diambil saat rugi — alat tetap aus walaupun omzet sepi.
        $maintenance = $this->assets->allocationForMonth($month);

        return new ProfitAndLossStatement(
            month: $month,
            revenueByLine: $revenueByLine,
            totalRevenue: $totalRevenue,
            materialCost: $material,
            jobCost: $job,
            totalDirectCost: $direct,
            grossProfit: $gross,
            grossMargin: $totalRevenue === 0 ? 0.0 : $gross / $totalRevenue,
            operatingExpenses: $operating,
            totalOperating: $totalOperating,
            maintenanceAllocation: $maintenance,
            netProfit: $gross - $totalOperating - $maintenance,
        );
    }

    /**
     * Margin per lini — output paling berharga (business-flow bagian 7): lini
     * dengan omzet terbesar sering justru marginnya paling tipis.
     *
     * @return list<LineMargin>
     */
    public function marginByLine(string $month): array
    {
        $total = $this->revenue($month);

        return array_map(function (BusinessLine $line) use ($month, $total) {
            $revenue = $this->revenue($month, $line);
            $cost = $this->materialCosts($month, $line) + $this->jobCosts($month, $line);
            $margin = $revenue - $cost;

            return new LineMargin(
                line: $line,
                revenue: $revenue,
                directCost: $cost,
                margin: $margin,
                marginRatio: $revenue === 0 ? 0.0 : $margin / $revenue,
                share: $total === 0 ? 0.0 : $revenue / $total,
            );
        }, BusinessLine::cases());
    }

    /**
     * Dibandingkan dengan LABA KOTOR, bukan omzet seperti "HPP per hari" di
     * sheet client: omzet event yang habis untuk fee crew akan terlihat
     * menutup biaya tetap padahal tidak.
     */
    public function breakEven(string $month): BreakEven
    {
        $s = $this->forMonth($month);
        $fixed = $s->totalOperating + $s->maintenanceAllocation;

        return new BreakEven(
            fixedCosts: $fixed,
            grossProfit: $s->grossProfit,
            shortfall: max(0, $fixed - $s->grossProfit),
            ratio: $fixed === 0 ? 1.0 : $s->grossProfit / $fixed,
        );
    }
}
