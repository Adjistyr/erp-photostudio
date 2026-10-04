<?php

namespace App\Services\Finance;

use App\Enums\BusinessLine;
use App\Models\Customer;
use App\Models\Order;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

final readonly class CustomerSummary
{
    /**
     * @param  Collection<int, Order>  $orders  SEMUA order termasuk Batal (riwayat), terbaru dulu
     * @param  list<BusinessLine>  $lines
     */
    public function __construct(
        public Customer $customer,
        public Collection $orders,
        public int $orderCount,
        public int $orderValue,
        public int $paid,
        public array $lines,
        public ?CarbonImmutable $lastTransaction,
    ) {}
}
