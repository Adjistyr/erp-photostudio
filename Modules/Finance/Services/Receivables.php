<?php

namespace Modules\Finance\Services;

use Illuminate\Support\Collection;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Modules\Shared\Enums\BusinessLine;

/**
 * Piutang — layar yang paling sering dibuka owner (business-flow 5.4).
 *
 * ponytail: memuat semua order lalu menyaring di PHP, persis prototype.
 * Pada < 10 transaksi/hari ini ringan bertahun-tahun; pindah ke agregasi SQL
 * kalau order aktif mencapai ribuan.
 */
class Receivables
{
    /**
     * Order yang uangnya masih menggantung, sisa terbesar dulu. Batal tidak
     * ditagih lagi.
     *
     * @return Collection<int, Order>
     */
    public function open(): Collection
    {
        return Order::with(['items', 'payments', 'customer'])
            ->where('work_status', '!=', WorkStatus::Cancelled)
            ->get()
            ->filter(fn (Order $o) => $o->balance() > 0)
            ->sortByDesc(fn (Order $o) => $o->balance())
            ->values()
            ->toBase();
    }

    public function total(): int
    {
        return $this->open()->sum(fn (Order $o) => $o->balance());
    }

    /**
     * Jatuh tempo tepat hari ini dihitung BELUM lewat — supaya kartu "Lewat
     * Jatuh Tempo" sama persis dengan kelompok umur "1–30 hari".
     *
     * @return Collection<int, Order>
     */
    public function overdue(): Collection
    {
        $today = today();

        return $this->open()->filter(fn (Order $o) => $o->daysUntilDue($today) < 0)->values();
    }

    /** @return list<AgingBucket> */
    public function aging(): array
    {
        $open = $this->open();
        $total = $open->sum(fn (Order $o) => $o->balance());
        $today = today();
        $buckets = [
            'Belum jatuh tempo' => fn (int $d) => $d >= 0,
            '1–30 hari' => fn (int $d) => $d < 0 && $d >= -30,
            '31–60 hari' => fn (int $d) => $d < -30 && $d >= -60,
            '> 60 hari' => fn (int $d) => $d < -60,
        ];

        $result = [];
        foreach ($buckets as $label => $matches) {
            $orders = $open->filter(fn (Order $o) => $matches($o->daysUntilDue($today)))->values();
            $amount = $orders->sum(fn (Order $o) => $o->balance());
            $result[] = new AgingBucket($label, $orders, $amount, $total === 0 ? 0.0 : $amount / $total);
        }

        return $result;
    }

    /**
     * "Risiko kita menumpuk di lini mana."
     *
     * @return list<LineReceivable>
     */
    public function byLine(): array
    {
        $open = $this->open();
        $total = $open->sum(fn (Order $o) => $o->balance());

        return array_map(function (BusinessLine $line) use ($open, $total) {
            $amount = $open->filter(fn (Order $o) => $o->business_line === $line)->sum(fn (Order $o) => $o->balance());

            return new LineReceivable($line, $amount, $total === 0 ? 0.0 : $amount / $total);
        }, BusinessLine::cases());
    }
}
