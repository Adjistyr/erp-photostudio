# Handoff — posisi proyek & cara melanjutkan

Diperbarui **9 Oktober 2026**. Baca ini dulu di sesi baru; dokumen lain dirujuk dari sini. Perbarui bagian "Posisi" dan "Langkah berikutnya" setiap kali ada PR yang di-merge.

## 1. Peta dokumen

| Butuh | Baca |
|---|---|
| Setup lokal, perintah, konvensi kode, gotcha, "belum dikerjakan" | `docs/development.md` |
| Skema & glosarium tabel, prinsip "riwayat tidak diedit" | `docs/database.md` |
| Aturan bisnis (lini usaha, status, basis kas, bagi hasil, pertanyaan terbuka) | `docs/business-flow.md` |
| Kenapa fitur X kurang / gap vs POS lain | `docs/research/analisis-modul-operasional.md` |
| Urutan fase + keputusan sementara K1–K5 | `docs/rencana-pengembangan-operasional.md` |
| **Apa yang dikerjakan berikutnya, detail per PR** | `docs/specs/README.md` → file spek per item |
| Naskah demo ke client (belum diperbarui sejak prototype) | `docs/demo-client.md` |
| Desain visual | `docs/DESIGN.md` |

## 2. Stack & struktur (ringkas)

Laravel 13 · Inertia 3 · React 19 · TypeScript · Wayfinder · Fortify + passkeys · PostgreSQL · Tailwind 4 · shadcn base-maia / Base UI · PHPUnit · PHPStan level 7 · Pint · vite-plus (`npx vp check --fix`, `npm test` = Vitest).

Modular monolith: `Modules/{Shared,Catalog,Customer,Order,Expense,Asset,Finance}/{Controllers,Requests,Models,Enums,Services,Actions,Rules,Routes/web.php,Providers,Tests}` + `resources/js/modules/<domain>/{pages,components,types.ts,index.ts}`. Halaman Inertia `modul::halaman`. Migrasi/seeder tetap di `database/`. Batas pragmatis: modul boleh membaca model modul lain; frontend lintas modul lewat `index.ts`.

Perintah yang dipakai tiap PR:

```sh
DB_USERNAME=$(whoami) DB_PASSWORD= php artisan test
vendor/bin/pint --dirty && vendor/bin/phpstan --memory-limit=1G
npx vp check --fix && npm test
php artisan wayfinder:generate --with-form   # bila route berubah
```

Server lokal: `DB_USERNAME=$(whoami) DB_PASSWORD= php artisan serve --port=8000`. Data demo: `php artisan migrate:fresh --seed`. Login `agung@potraittime.test` atau `raka@potraittime.test`, sandi `password`. Data demo: Juli 2026 sudah tutup buku, Agustus–September belum.

## 3. Posisi per 9 Oktober 2026

- `develop` memuat PR #10–#28 (semua layar prototype `web/` dipindah ke Laravel, keputusan bisnis 6 Okt: margin order batal, tutup buku manual, koreksi = hapus) dan **PR #29–#52**: analisis + 32 spek, lalu **seluruh spek Fase 0–4 (22 item) selesai**.
- Test terakhir: **407 PHPUnit, 88 Vitest**, PHPStan level 7 bersih, `composer ci:check` hijau.
- CI GitHub Actions tidak berjalan sejak awal (akun terkunci billing — job gagal dalam 2–3 detik tanpa dijalankan). Gate yang dipakai: `composer ci:check` lokal sebelum merge.

### Daftar PR spek

| PR | Spek | PR | Spek |
|---|---|---|---|
| #30 | 0.1 `created_by` + nama pencatat | #42 | 3.3 Kas Harian per metode |
| #31 | 0.2 Riwayat order (`order_events`) | #43 | 3.2 Filter piutang (klien) |
| #32 | 1.1 Kategori jasa Studio/Event/Add-on | #44 | 3.4 Customer baru dari form order |
| #33 | 2.1 HP opsional di POS | #45 | 3.5 Jadwal besok + ingatkan via WA |
| #34 | 2.2 Struk setelah POS | #46 | 3.6 Margin rendah + cari Katalog/Aset |
| #35 | 2.3 Bukti bayar | #47 | 4.1 Diskon persen |
| #36 | 2.4 Tagih via WA + template Tagihan | #48 | 4.2 Retur (refund, basis kas) |
| #37 | 1.2 Ubah order studio/event | #49 | 4.5 Ekspor CSV |
| #38 | 1.3 Item custom | #50 | 4.4 Split payment POS |
| #39 | 1.4 Status kerja mundur | #51 | 4.3 Tahan keranjang |
| #40 | 2.5 Transaksi hari ini di POS | #52 | 4.6 Layar sempit POS & Pembayaran |
| #41 | 3.1 Cari + filter + paginasi server | #54 | 7.1 Galeri foto + profil publik katalog |
| | | #55 | 7.2 Tambah/Edit katalog jadi halaman |

### Penyimpangan dari spek (detail di body PR masing-masing)

Kode yang menang bila spek tidak cocok — speknya tidak ditulis ulang, alasannya ada di PR:

- **Test render komponen** (2.2–3.6): diganti test fungsi murni karena belum ada jsdom. Sejak #52, Vitest memuat `*.test.tsx` dan komponen murni bisa dirender statis dengan `react-dom/server` (contoh `receivable-card.test.tsx`) — pakai pola ini, jangan tambah jsdom tanpa alasan kuat.
- **#31** order tanpa event: "Belum ada riwayat" (tanpa tanggal deploy).
- **#34** judul invoice diturunkan dari `business_line`; test URL bertanda tangan di feature test.
- **#35** bukti bayar tidak menyebut jatuh tempo yang sudah lewat. **#36** pesan tagihan tetap menyebutnya (bermakna sebagai pengingat).
- **#36** `MessageTemplate::fill()`/`body()` menjadi `fillPlaceholders()`/`bodyFor()` — bentrok dengan `Model::fill()`.
- **#37** cek order bisa diedit di `authorize()` (tetap 422, key `order`); id baris dobel ditolak; `customer_id` ditambah ke props order.
- **#38** `customItems()` array bertipe, bukan DTO.
- **#41** pencarian HP hanya untuk ketikan berbentuk nomor (`ListQuery::phoneDigits()`), supaya "ORD-0012" tidak mencocokkan HP berisi 0012; daftar Customer urut nama, bukan nilai order.
- **#44** HP customer baru disimpan ternormalisasi `62…` (sama dengan 2.1).
- **#45** tidak menambah `MessageTemplate::personalise()`; reminder diisi di klien.
- **#48** event hapus refund memakai bentuk `{amount: {from, to: null}, deleted_refund_id}` supaya terbaca `describeEvent()`.
- **#49** ekspor melebihi batas → kembali dengan toast error, bukan halaman 422.
- **#51** keranjang tertahan menyimpan `payments[]` (setelah 4.4); ID tanpa `crypto.randomUUID()` (hanya ada di secure context).
- **#52** keranjang POS dirender sekali lewat `useMinWidth(1024)`, bukan render ganda dengan kelas CSS (id input dobel); `PosCart` tidak diekstrak.
- **#54** (spek 7.1, permintaan tambahan): badge "Profil" di kolom Status dan nama item boleh terlipat, supaya tabel Katalog tetap muat di 1280 px.

### Data uji lokal (bukan seed)

DB lokal berisi data hasil verifikasi manual: foto di "Cetak 10R + Bingkai" (bertanda Profil), item baru "Gantungan Kunci Foto Kayu" dan "Bingkai Kayu A4", ORD-0013 s.d. ORD-0017 (penjualan POS; ORD-0016 split Tunai 6.000 + QRIS 4.000), pembayaran tambahan di ORD-0012 (termasuk Rp 25.000 dari kartu Pembayaran 9 Okt), ORD-0005 dipindah ke besok dengan add-on, item custom "Drone" di ORD-0011, refund Rp 20.000 di ORD-0015. Peringatan "Piutang 11029%" di Dashboard berasal dari data ini. Reset: `php artisan migrate:fresh --seed` lalu hapus folder `storage/app/public/catalog` (file foto tidak ikut terhapus oleh reset DB).

## 4. Langkah berikutnya

Fase 0–4 selesai. Sisa di `docs/specs/README.md`:

- **5.1 Peran & hak akses** — hanya setelah owner memastikan ada staf admin yang akan input.
- **5.2 Shift kasir tidak dikerjakan** — keputusan 9 Okt 2026: POS tidak memakai shift (tidak ada buka/tutup laci). Pencocokan laci tetap lewat Kas Harian (3.3) kolom Tunai.
- **7.1 Galeri foto katalog** (#54) dan **7.2 form katalog jadi halaman** (#55) selesai. Berikutnya yang diminta user: **varian produk** — bentuknya belum diputuskan (lihat pertanyaan terbuka di bawah). Endpoint publik untuk company profile belum dibuat — aturan field yang boleh keluar ada di speknya.
- **6.x** (serial + garansi, proyeksi penggantian, bundel, termin, riwayat harga, sumber lead, lampiran bukti transfer) — sesuai kebutuhan owner.

Per item: branch dari `develop` (`feat/<modul>-<item>`), kerjakan sesuai spek (test ditulis bersamaan), checklist spek dipindah ke body PR, PR ke `develop`, setelah merge ubah status di `docs/specs/README.md` → ✅ + nomor PR. Kalau spek tidak cocok dengan kode saat dikerjakan, kode yang menang — catat penyimpangannya di body PR.

Keputusan K1–K5 di `docs/rencana-pengembangan-operasional.md` adalah **rekomendasi dev yang berlaku sampai owner mengubah** — tidak perlu menunggu.

## 5. Terbuka di luar spek (butuh owner/client)

- Logo asli — `resources/js/components/app-logo-icon.tsx` masih ikon kamera.
- `.env` produksi: `APP_NAME`, `STUDIO_NAME/ADDRESS/PHONE/BANK_ACCOUNT` (dipakai invoice & template), `MAIL_*` (blast email masih `log`).
- Hapus folder `web/` (prototype) setelah client setuju.
- Go-live: hosting, backup, data awal (katalog, aset, **modal awal per owner**), CI (billing GitHub Actions terkunci).
- `docs/demo-client.md` masih naskah prototype.
- RBAC (spek 5.1) menunggu kepastian staf admin.
- Varian produk (permintaan user 9 Okt 2026) menunggu keputusan: apa yang berbeda per varian (harga/HPP/foto), produk saja atau juga jasa, satu daftar varian atau kombinasi dua dimensi, dan apakah laporan menghitung per varian.
- Temuan kecil yang belum diubah: order retail berstatus Diserahkan masih menawarkan "Kembalikan ke Selesai Dikerjakan" dan "Batalkan Order"; halaman Aset punya komponen ringkasan lokal sendiri (bukan `SummaryCard`); `DESIGN.stitch.md` belum menyebut pengecualian breakpoint POS/Pembayaran (khusus generator Stitch).
- `main` masih hanya berisi initial commit (13 Sep 2026); seluruh pekerjaan ada di `develop`. Rilis ke `main` menunggu keputusan go-live.

## 6. Cara kerja yang disepakati dengan user

- Bahasa Indonesia. "lanjut" / "ya" / "oke" = lanjutkan / setuju.
- Tidak perlu minta izin untuk perintah, commit, push feature branch, maupun membuat PR ke `develop`. **Jangan** push langsung ke `develop`/`main`, jangan amend/force push.
- Akses `.env` / `.env.example` diblokir — minta user menjalankan sendiri (`! <command>`).
- Dokumen ikut diperbarui di PR yang sama dengan kode.
- Gotcha alat: Playwright MCP setelah login → buka tab baru (`browser_tabs new`), bukan `browser_close`.
