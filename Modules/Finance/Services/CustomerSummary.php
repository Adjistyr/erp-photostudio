<?php

namespace Modules\Finance\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Modules\Customer\Models\Customer;
use Modules\Order\Models\Order;
use Modules\Shared\Enums\BusinessLine;

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
