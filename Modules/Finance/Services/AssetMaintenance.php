<?php

namespace Modules\Finance\Services;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Modules\Asset\Models\Asset;

/**
 * Alokasi dana maintenance, nilai buku, dan jadwal perawatan (8.9).
 *
 * Menggantikan nominal maintenance yang diketik tangan: di sheet client
 * nominal ketik tangan itulah yang salah Rp 97.350 karena unit lupa dikali.
 */
class AssetMaintenance
{
    /** Batas "segera" — cukup waktu untuk menjadwalkan teknisi. */
    public const WARNING_DAYS = 14;

    public function __construct(private readonly Periods $periods) {}

    /**
     * Dimiliki di AKHIR bulan: sudah dibeli dan belum dilepas per akhir
     * bulan. Alokasi dihitung saat tutup buku — aset yang dijual tanggal 20
     * tidak butuh dana servis lagi.
     */
    public function ownedAtMonthEnd(Asset $asset, string $month): bool
    {
        $end = Periods::end($month);

        return $asset->purchased_on->lte($end)
            && ($asset->disposed_on === null || $asset->disposed_on->gt($end));
    }

    /**
     * Dibulatkan per aset, bukan di total: angka per baris di layar harus
     * berjumlah persis sama dengan alokasi di Laba Rugi.
     */
    public function allocationFor(Asset $asset, string $month): int
    {
        if (! $this->ownedAtMonthEnd($asset, $month)) {
            return 0;
        }

        return (int) round($asset->unit_price * $asset->units * $asset->maintenance_percent / 100);
    }

    /**
     * Σ harga × unit × % aset yang dimiliki di akhir bulan. Aset baru tidak
     * mengubah bulan lalu karena tanggal belinya sesudah bulan itu.
     */
    public function allocationForMonth(string $month): int
    {
        return Asset::all()->sum(fn (Asset $a) => $this->allocationFor($a, $month));
    }

    /**
     * Nilai buku garis lurus — INFORMASI saja, tidak masuk Laba Rugi. Biaya
     * aus sudah diwakili alokasi maintenance; memasukkan penyusutan juga
     * berarti membebankan keausan yang sama dua kali. Bulan beli dihitung
     * penuh.
     */
    public function bookValue(Asset $asset, ?string $month = null): int
    {
        $month ??= $this->periods->current();
        if (! $this->ownedAtMonthEnd($asset, $month)) {
            return 0;
        }

        $used = Periods::monthsBetween($asset->purchased_on->format('Y-m'), $month) + 1;
        $remaining = max(0, 1 - $used / $asset->useful_life_months);

        return (int) round($asset->purchaseTotal() * $remaining);
    }

    /**
     * Perawatan berikutnya = servis terakhir (jenis apa pun) + interval, atau
     * tanggal beli + interval. Perbaikan ikut mereset: alat yang baru dibongkar
     * teknisi tidak perlu dirawat lagi bulan depannya.
     *
     * addMonthsNoOverflow: 31 Jan + 1 bulan = 28/29 Feb, bukan 3 Mar.
     */
    public function nextMaintenance(Asset $asset): ?CarbonImmutable
    {
        if ($asset->maintenance_interval_months === null) {
            return null;
        }

        $last = $asset->maintenances()->max('performed_on');
        $base = is_string($last) ? CarbonImmutable::parse($last) : $asset->purchased_on;

        return $base->addMonthsNoOverflow($asset->maintenance_interval_months);
    }

    /**
     * Lewat jadwal atau ≤ 14 hari lagi, paling mendesak dulu. Aset dilepas
     * tidak ikut.
     *
     * @return list<DueMaintenance>
     */
    public function dueSoon(): array
    {
        $today = today()->toImmutable();
        $due = [];
        /** @var Collection<int, Asset> $assets */
        $assets = Asset::whereNull('disposed_on')->orderBy('id')->get();
        foreach ($assets as $asset) {
            $date = $this->nextMaintenance($asset);
            if ($date === null) {
                continue;
            }
            $days = (int) $today->diffInDays($date, false);
            if ($days <= self::WARNING_DAYS) {
                $due[] = new DueMaintenance($asset, $date, $days);
            }
        }
        usort($due, fn (DueMaintenance $a, DueMaintenance $b) => $a->daysUntil <=> $b->daysUntil);

        return $due;
    }

    /** Alokasi untuk aset ini yang sudah masuk dana (bulan yang sudah tutup). */
    public function accumulated(Asset $asset): int
    {
        return array_sum(array_map(
            fn (string $m) => $this->allocationFor($asset, $m),
            $this->periods->closedMonths(),
        ));
    }
}
