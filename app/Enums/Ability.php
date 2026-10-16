<?php

namespace App\Enums;

/**
 * Daftar Gate (spek 5.1) — satu sumber untuk definisi Gate
 * (AppServiceProvider), middleware route (`can:<value>`), dan peta
 * `auth.can.<key()>` di shared props Inertia (HandleInertiaRequests).
 * Gate baru = tambah case di sini; otomatis terdefinisi dan terkirim ke klien.
 *
 * ponytail: dua peran hard-coded, semua Gate = "hanya owner"; tabel
 * permission kalau peran ketiga muncul.
 */
enum Ability: string
{
    /** Laporan, Modal & Bagi Hasil, ekspor berisi HPP/margin, dan props finansial (margin, HPP, omzet, nilai buku, dana). */
    case ViewFinance = 'view-finance';
    /** Tambah/ubah/nonaktifkan katalog + foto katalog. */
    case ManageCatalog = 'manage-catalog';
    /** Hapus catatan uang: pembayaran, retur, biaya job/operasional, servis aset, setoran/penarikan modal. */
    case DeleteMoney = 'delete-money';
    /** Tutup/buka buku. */
    case ClosePeriod = 'close-period';
    /** Settings → Pengguna. */
    case ManageUsers = 'manage-users';
    /** Tambah/ubah/lepas aset, kategori aset, foto & nota aset. */
    case ManageAssets = 'manage-assets';
    /** Ubah template pesan Komunikasi. */
    case ManageTemplates = 'manage-templates';
    /** Catat biaya operasional (kas usaha). */
    case RecordOperatingExpense = 'record-operating-expense';

    /** Kunci di `auth.can` (snake_case): `view-finance` → `view_finance`. */
    public function key(): string
    {
        return str_replace('-', '_', $this->value);
    }
}
