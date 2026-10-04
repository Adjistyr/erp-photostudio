<?php

namespace App\Services\Finance;

use App\Enums\BusinessLine;
use App\Models\JobCost;
use App\Models\OperatingExpense;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Collection;

/**
 * Laba rugi basis KAS (business-flow bagian 7): omzet = uang yang benar-benar
 * diterima pada periode, bukan nilai order yang selesai dikerjakan.
 * Mengubah basis ini mengubah seluruh angka historis.
 */
class ProfitAndLoss
{
    public function __construct(private readonly AssetMaintenance $assets) {}

    public function revenue(string $month, ?BusinessLine $line = null): int
    {
        return (int) Payment::query()
            ->whereBetween('paid_on', [Periods::start($month), Periods::end($month)])
            ->when($line, fn ($q) => $q->whereHas('order', fn ($o) => $o->where('business_line', $line)))
            ->sum('amount');
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
     * dibayar. Order yang menerima pembayaran di bulan ini dihitung HPP-nya.
     */
    public function materialCosts(string $month, ?BusinessLine $line = null): int
    {
        /** @var Collection<int, Order> $orders */
        $orders = Order::query()
            ->with('items')
            ->whereHas('payments', fn ($q) => $q->whereBetween('paid_on', [Periods::start($month), Periods::end($month)]))
            ->when($line, fn ($q) => $q->where('business_line', $line))
            ->get();

        return $orders->sum(fn (Order $o) => $o->materialCost());
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
