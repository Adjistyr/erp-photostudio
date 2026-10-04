<?php

namespace Modules\Finance\Services;

use Illuminate\Support\Collection;
use Modules\Order\Models\Order;

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
