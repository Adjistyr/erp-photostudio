<?php

namespace Modules\Customer\Actions;

use Modules\Customer\Models\Customer;
use Modules\Customer\Support\Phone;

/**
 * Satu aturan dedup customer untuk POS (spek 2.1) dan form order (spek 3.4).
 * Cocokkan HP dulu (lebih unik), lalu nama tanpa beda huruf besar, lalu buat
 * baru. Customer yang cocok lewat nama dan belum punya HP dilengkapi; yang
 * sudah punya HP berbeda TIDAK ditimpa — dua orang bernama sama lebih mungkin
 * daripada satu orang ganti nomor. Nama lama dipertahankan saat HP cocok
 * (yang mengetik mungkin salah eja).
 *
 * Pemanggil membungkusnya dalam transaksi bersama order — customer baru tidak
 * boleh tertinggal kalau order gagal.
 *
 * ponytail: cocok HP → nama; dua customer bernama sama tanpa HP → yang
 * tercatat lebih dulu. Tambah pilih-dari-daftar kalau mulai sering bentrok.
 */
class FindOrCreateCustomer
{
    /** @param  string|null  $phone  ketikan mentah; disimpan dalam bentuk `62…` */
    public function execute(string $name, ?string $phone): Customer
    {
        $name = trim($name);
        $phone = $phone === null ? '' : Phone::normalise($phone);
        $phone = $phone === '' ? null : $phone;

        if ($phone !== null) {
            // Data lama bisa tersimpan `08…` — bandingkan bentuk ternormalisasi
            // kedua sisi di SQL (PostgreSQL), bukan memuat semua customer.
            $byPhone = Customer::whereNotNull('phone')
                ->whereRaw(Phone::SQL_NORMALISED_PHONE.' = ?', [$phone])
                ->orderBy('id')->first();
            if ($byPhone !== null) {
                return $byPhone;
            }
        }

        $byName = Customer::whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->orderBy('id')->first();
        if ($byName !== null) {
            if ($phone !== null && ($byName->phone === null || $byName->phone === '')) {
                $byName->update(['phone' => $phone]);
            }

            return $byName;
        }

        return Customer::create(['name' => $name, 'phone' => $phone]);
    }
}
