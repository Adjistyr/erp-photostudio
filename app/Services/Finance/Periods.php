<?php

namespace App\Services\Finance;

use App\Models\ProfitShareRule;
use Carbon\CarbonImmutable;

/**
 * Bulan sebagai string "YYYY-MM" — sama dengan prototype. Perbandingan
 * string "2026-07" < "2026-08" aman karena formatnya lebar tetap.
 */
class Periods
{
    public function current(): string
    {
        return today()->format('Y-m');
    }

    public static function next(string $month): string
    {
        return self::start($month)->addMonthNoOverflow()->format('Y-m');
    }

    public static function previous(string $month): string
    {
        return self::start($month)->subMonthNoOverflow()->format('Y-m');
    }

    public static function start(string $month): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat('!Y-m', $month) ?: throw new \InvalidArgumentException("Bulan tidak valid: {$month}");
    }

    /**
     * "2026-07" → "Juli 2026" — untuk pesan validasi & laporan. Nama bulan
     * ditulis sendiri, bukan lewat locale Carbon: hasilnya tidak ikut berubah
     * kalau locale aplikasi diganti.
     */
    public static function label(string $month): string
    {
        $names = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        $date = self::start($month);

        return $names[$date->month - 1].' '.$date->year;
    }

    public static function end(string $month): CarbonImmutable
    {
        return self::start($month)->endOfMonth()->startOfDay();
    }

    public static function monthsBetween(string $from, string $to): int
    {
        return (int) self::start($from)->diffInMonths(self::start($to));
    }

    /** @return list<string> inklusif kedua ujung; kosong kalau $from > $to */
    public static function range(string $from, string $to): array
    {
        $months = [];
        for ($m = $from; $m <= $to; $m = self::next($m)) {
            $months[] = $m;
        }

        return $months;
    }

    /** Bulan aturan bagi hasil pertama — awal riwayat bagi hasil & pos dana. */
    public function firstMonth(): ?string
    {
        $first = ProfitShareRule::min('effective_month');

        return is_string($first) ? $first : null;
    }

    /**
     * Bulan yang sudah TUTUP: dari aturan pertama sampai bulan lalu. Bulan
     * berjalan belum final — labanya masih berubah tiap ada transaksi.
     *
     * @return list<string>
     */
    public function closedMonths(): array
    {
        $first = $this->firstMonth();

        return $first === null ? [] : self::range($first, self::previous($this->current()));
    }
}
