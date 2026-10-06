<?php

namespace Modules\Finance\Rules;

use Carbon\CarbonInterface;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\ValidationException;
use Modules\Finance\Services\Periods;

/**
 * Tanggal transaksi tidak boleh jatuh di bulan yang sudah TUTUP BUKU —
 * mencatat atau mengoreksi di sana mengubah bagi hasil yang sudah final.
 * Dipasang di setiap tanggal yang memengaruhi uang (pembayaran, biaya, aset,
 * servis, setoran, pemakaian dana, investasi).
 */
class OpenPeriod implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        // Format tanggal divalidasi aturan lain; di sini hanya bulannya.
        if (! is_string($value) || preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
            return;
        }
        $month = substr($value, 0, 7);
        if (Periods::isClosed($month)) {
            $fail(self::message($month));
        }
    }

    public static function message(string $month): string
    {
        return Periods::label($month).' sudah tutup buku — buka kembali di Modal & Bagi Hasil kalau perlu koreksi.';
    }

    /**
     * Untuk aksi HAPUS: catatan bertanggal di bulan tertutup tidak boleh
     * dihapus — sama dengan aturan saat mencatat. Error di kunci `delete`.
     */
    public static function ensureOpen(CarbonInterface $date): void
    {
        $month = $date->format('Y-m');
        if (Periods::isClosed($month)) {
            throw ValidationException::withMessages(['delete' => self::message($month)]);
        }
    }
}
