<?php

namespace Modules\Customer\Support;

/**
 * Normalisasi nomor HP ke bentuk `62…` (spek 2.1) — setara `keNomorWa()` di
 * `resources/js/lib/format.ts`; kalau dua sisi berbeda, tautan wa.me dan
 * pencocokan customer akan menunjuk ke nomor yang berbeda.
 *
 * Bukan cast/mutator di model Customer: data lama `08…` tidak boleh ikut
 * berubah bentuk saat dibaca-tulis tanpa sengaja. Pemanggil yang menyimpan
 * nomor baru memanggil ini secara eksplisit.
 */
final class Phone
{
    /** "0812-3456" → "628123456"; "+62 812" → "62812"; "62812" tetap. Kosong → "". */
    public static function normalise(string $raw): string
    {
        $digits = preg_replace('/\D+/', '', $raw) ?? '';
        if ($digits === '' || str_starts_with($digits, '62')) {
            return $digits;
        }

        // `^0` diikat ke awal: nol di awal = prefiks trunk nasional; nol di
        // tengah ("08120812") tidak boleh tersentuh.
        return preg_replace('/^0/', '62', $digits) ?? $digits;
    }
}
