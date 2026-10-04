<?php

namespace Modules\Finance\Services;

use Illuminate\Support\Collection;
use Modules\Expense\Models\OperatingExpense;

final readonly class ProfitAndLossStatement
{
    /**
     * @param  array<string, int>  $revenueByLine  key = BusinessLine value
     * @param  Collection<int, OperatingExpense>  $operatingExpenses
     */
    public function __construct(
        public string $month,
        public array $revenueByLine,
        public int $totalRevenue,
        public int $materialCost,
        public int $jobCost,
        public int $totalDirectCost,
        public int $grossProfit,
        public float $grossMargin,
        public Collection $operatingExpenses,
        public int $totalOperating,
        public int $maintenanceAllocation,
        public int $netProfit,
    ) {}
}
