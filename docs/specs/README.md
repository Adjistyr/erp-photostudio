# Spesifikasi per Item

Satu file = satu item = satu PR ke `develop`. Peta fase, urutan, dan keputusan sementara K1–K5 ada di `docs/rencana-pengembangan-operasional.md`; latar belakang tiap gap ada di `docs/research/analisis-modul-operasional.md`. Spek ditulis per **7 Oktober 2026** terhadap kode di `develop` saat itu — kalau kode sudah bergeser saat item dikerjakan, kode yang menang; perbarui speknya di PR yang sama.

## Cara pakai

1. Buka spek, baca **Aturan bisnis** dan **Tidak termasuk** dulu — itu batas PR.
2. Kerjakan berurutan: Perubahan data → Backend → Frontend → Test. Test ditulis bersamaan, bukan di akhir.
3. **Checklist selesai** di bawah tiap spek dipindah ke body PR dan dicentang.
4. Setelah merge, ubah Status di tabel bawah menjadi ✅ dan tulis nomor PR.

## Format spek (semua file sama)

| Bagian | Isi |
|---|---|
| Header | tabel Fase · Prioritas · Estimasi · Prasyarat · Keputusan terkait |
| Tujuan | satu-dua kalimat: masalah pengguna yang diselesaikan |
| Lingkup | Termasuk / Tidak termasuk (eksplisit, supaya PR tidak melebar) |
| Aturan bisnis | daftar bernomor; setiap aturan bisa dijadikan test |
| Perubahan data | migrasi (tabel, kolom, tipe, index, FK), perubahan model/enum |
| Backend | Route (method, path, name, handler) · Request (rules + pesan ID) · Controller/Action/Service (perilaku, transaksi, event) · Props Inertia (bentuk TS) |
| Frontend | file halaman/komponen, perilaku, keadaan kosong/error, teks UI |
| Test | Feature (PHPUnit) · Unit · Vitest — nama test konkret, minimal jalur utama + 3 kasus error/tepi |
| Dokumen yang diubah | file docs yang wajib ikut di PR |
| Checklist selesai | dicentang di PR |

## Daftar & status

| Item | File | Est. | Prasyarat | Status |
|---|---|---|---|---|
| 0.1 `created_by` | `0.1-created-by.md` | S | — | ✅ #30 |
| 0.2 Riwayat perubahan order | `0.2-order-events.md` | M | — | ✅ #31 |
| 1.1 Kategori jasa terstruktur | `1.1-kategori-jasa.md` | S | — | ✅ #32 |
| 1.2 Edit order | `1.2-edit-order.md` | L | 0.1, 0.2 | ✅ #37 |
| 1.3 Item custom | `1.3-item-custom.md` | M | 1.2 (form bersama) | ⬜ |
| 1.4 Status mundur | `1.4-status-mundur.md` | S | 0.2 | ⬜ |
| 2.1 Nomor HP di POS | `2.1-hp-di-pos.md` | S | — | ✅ #33 |
| 2.2 Struk setelah POS | `2.2-struk-pos.md` | M | 2.1 | ✅ #34 |
| 2.3 Bukti bayar setelah catat bayar | `2.3-bukti-bayar.md` | S | 2.2 (pola flash `receipt`) | ✅ #35 |
| 2.4 Tagih via WA | `2.4-tagih-via-wa.md` | S | 2.3 (props) | ✅ #36 |
| 2.5 Transaksi hari ini di POS | `2.5-transaksi-hari-ini.md` | S | 2.2 | ⬜ |
| 3.1 Pencarian + paginasi | `3.1-pencarian-paginasi.md` | M | — | ⬜ |
| 3.2 Filter piutang | `3.2-filter-piutang.md` | S | 3.1 (komponen toolbar) | ⬜ |
| 3.3 Kas harian per metode | `3.3-kas-harian.md` | M | — | ⬜ |
| 3.4 Customer baru dari form order | `3.4-customer-dari-form-order.md` | S | 1.2, 2.1 | ⬜ |
| 3.5 Jadwal besok + ingatkan | `3.5-jadwal-besok.md` | S | 2.4 (`personalise`) | ⬜ |
| 3.6 Katalog: margin % + cari | `3.6-katalog-margin-cari.md` | S | 3.1 (toolbar) | ⬜ |
| 4.1 Diskon persen | `4.1-diskon-persen.md` | S | — | ⬜ |
| 4.2 Retur / refund | `4.2-retur-refund.md` | M | 0.1, 0.2, 3.3 | ⬜ |
| 4.3 Hold keranjang | `4.3-hold-keranjang.md` | S | — | ⬜ |
| 4.4 Split payment | `4.4-split-payment.md` | M | 2.2 | ⬜ |
| 4.5 Ekspor CSV | `4.5-ekspor-csv.md` | S | 3.1, 3.3 | ⬜ |
| 4.6 Layar sempit | `4.6-layar-sempit.md` | M | 2.4 | ⬜ |
| 5.1 Peran & hak akses | `5.1-peran-hak-akses.md` | L | 0.1 | ⬜ |
| 5.2 Shift kasir | `5.2-shift-kasir.md` | L | 5.1, 3.3 | ⬜ |
| 6.1 Serial + garansi | `6.1-serial-garansi.md` | S | — | ⬜ |
| 6.2 Proyeksi penggantian | `6.2-proyeksi-penggantian.md` | M | — | ⬜ |
| 6.3 Bundel katalog | `6.3-bundel-katalog.md` | L | 1.1 | ⬜ |
| 6.4 Termin pembayaran | `6.4-termin-pembayaran.md` | L | 2.4 | ⬜ |
| 6.5 Riwayat harga | `6.5-riwayat-harga.md` | M | 0.1 | ⬜ |
| 6.6 Sumber lead | `6.6-sumber-lead.md` | S | 1.2 | ⬜ |
| 6.7 Lampiran bukti transfer | `6.7-lampiran-bukti-transfer.md` | M | hosting diputuskan | ⬜ |

Urutan pengerjaan yang disarankan: 0.1 → 0.2 → 1.1 → 2.1 → 2.2 → 2.3 → 2.4 → 1.2 → 1.3 → 1.4 → 2.5 → 3.1 → 3.3 → 3.2 → 3.4 → 3.5 → 3.6 → 4.1 → 4.2 → 4.5 → 4.4 → 4.3 → 4.6 → (saat admin ada) 5.1 → 5.2 → 6.x sesuai kebutuhan. Fase 2 ditaruh sebelum 1.2 karena kecil, tidak tergantung, dan langsung terasa oleh customer.
