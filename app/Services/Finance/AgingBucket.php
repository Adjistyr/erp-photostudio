<?php

namespace App\Services\Finance;

use App\Models\Order;
use Illuminate\Support\Collection;

final readonly class AgingBucket
{
    /** @param  Collection<int, Order>  $orders */
    public function __construct(
        public string $label,
        public Collection $orders,
        public int $amount,
        public float $share,
    ) {}
}
