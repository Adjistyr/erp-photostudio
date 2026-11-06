# Handoff — posisi proyek & cara melanjutkan

Diperbarui **4 November 2026**. Baca ini dulu di sesi baru; dokumen lain dirujuk dari sini. Perbarui bagian "Posisi" dan "Langkah berikutnya" setiap kali ada PR yang di-merge.

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
| Desain visual (sistem ala master-outlet sejak #64, "Konvensi halaman") | `docs/DESIGN.md` |

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

Server lokal: `DB_USERNAME=$(whoami) DB_PASSWORD= php artisan serve --port=8000`. Data demo: `php artisan migrate:fresh --seed`. Login `agung@potraittime.test` atau `raka@potraittime.test` (owner), `admin@potraittime.test` (admin, dari `DemoSeeder`), sandi `password`. Data demo: Juli 2026 sudah tutup buku, Agustus–September belum. Data presentasi client (6 bulan, tanggal relatif ke hari ini): `php artisan migrate:fresh --seed --seeder=PresentationSeeder` — rincian di `docs/database.md` bagian 4.

## 3. Posisi per 4 November 2026

- `develop` memuat PR #10–#28 (semua layar prototype `web/` dipindah ke Laravel, keputusan bisnis 6 Okt: margin order batal, tutup buku manual, koreksi = hapus) dan **PR #29–#63**: analisis + 32 spek, **seluruh spek Fase 0–4 (22 item)**, 5.2 dibatalkan (#53, POS tanpa shift), **Fase 7** permintaan tambahan katalog/order (#54–#56, #62, #63), dan **Fase 8** modul Aset jadi register alat (#57–#60).
- **PR #64** (branch `feat/sisa-spek-design-system`, satu commit per item): spek tersisa **5.1, 6.3, 6.4, 6.5, 6.6, 6.7** + **sistem desain ala master-outlet** (token, komponen `ui/*`, shell rail, `PageHeader`/`Panel`/`Notice` di semua halaman, slot `PageActions` dicabut). Setelah #64 tidak ada spek terbuka.
- **Setelah presentasi client (3 Nov 2026)** — masukan client, satu PR per item:
  - **#65** POS pilih/buat customer seperti form order + `PresentationSeeder` + `laravel/boost` & `.ai/rules`.
  - **#66** `MoneyInput`: isian uang tampil `Rp 1.500.000` saat diketik (17 input), state tetap digit.
  - **#67** DP & Catat Pembayaran: Rp atau **% dari total order**, dijepit ke sisa tagihan (persen hanya di klien).
  - **#68** HPP produk & varian: Rp atau % dari harga jual (disimpan Rp). `AmountPercentField` → `components/`, helper persen → `lib/percent.ts`.
  - **#69** fix Laba Rugi: HPP bahan diakui **sebanding uang diterima** per bulan (sebelumnya terhitung penuh di tiap bulan order menerima pembayaran → dobel untuk DP + pelunasan beda bulan).
  - **#70** estimasi biaya job jasa (`estimated_cost`, Rp atau %) → estimasi margin di detail order sampai biaya job dicatat; **tidak** masuk Laba Rugi (keputusan owner).
  - **#71** slot logo brand di invoice & struk (`STUDIO_LOGO`), ikon sementara sampai file logo dikirim.
  - **#76–#78** sisa audit: filter dalam Panel, placeholder "mis.", kalender mobile (titik + Agenda) + Buat Booking, kartu KPI 2 kolom di mobile, termin per kartu di mobile, **halaman error berbahasa Indonesia** (`pages/error.tsx` via `Inertia::handleExceptionsUsing()`: 403/404 selalu, 500/503 hanya di luar local/testing).
  - **#73 / #74** audit UI/UX (desktop 1440 + mobile 390, owner & admin): semua P1 (invoice publik mobile, HPP varian mobile, tabel Jadwal besok, dialog tinggi di HP) + P2 pilihan user (tabel melewati panel, petunjuk geser tab `useScrollHint`, picker bukti transfer, `FormActionBar` Simpan di form panjang, label "Catat Bayar").
- Test terakhir: **596 PHPUnit, 147 Vitest**, PHPStan level 7 bersih, Pint, `vp check`, `types:check`, `npm run build` hijau.
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
| | | #56 | 7.3 Varian produk |
| | | #57 | 8.1 Register aset |
| | | #58 | 8.2 Foto alat & nota |
| | | #59 | 8.3 Ringkasan per kategori + proyeksi penggantian |
| | | #60 | 8.4 Peminjaman alat ke event |
| | | #62 | 7.4 Detail order jadi halaman + edit retail |
| | | #63 | 7.5 Item produk di order studio/event |
| | | #64 | 5.1, 6.3–6.7 + sistem desain master-outlet |

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
- **#56** (spek 7.3): `PosCart` tetap tidak diekstrak; modul Katalog kini punya `index.ts` sebagai pintu impor lintas modul (`variantLabel`, `priceRange`).
- **Fase 8** (spek 8.1–8.4): spek 6.1 dilebur ke 8.1, 6.2 dikerjakan di 8.3; tahap 3 dipecah jadi 8.3 dan 8.4. Kolom Kategori di daftar aset pindah ke baris kecil di bawah nama (ruang untuk thumbnail). Peminjaman: asumsi dicatat dari halaman aset, pengembalian per catatan.
- **#64** (detail di spek masing-masing, bagian penyimpangan):
  - 5.1: admin tidak boleh mengubah identitas aset (aturan 3 dibaca sebagai daftar lengkap); route yang lahir setelah spek ikut digerbang; owner tidak bisa menghapus akunnya sendiri. Mekanisme: `App\Enums\Ability` + `Finance::except()` + `useCan()` (`docs/development.md` → Peran).
  - 6.3: komponen = produk (bukan varian); bagian "Komponen paket" di halaman Edit, bukan dialog; HPP komponen disembunyikan dari admin.
  - 6.4: `{termin}` diisi di klien (pola 2.4); template default tidak diubah; tanggal termin naik ketat.
  - 6.5: riwayat di halaman Edit (bukan tab dialog); varian tidak punya riwayat sendiri; item lama di-backfill satu baris "Sistem".
  - 6.6: laporan sumber hanya studio + event; sumber kosong saat buat = ikut customer.
  - 6.7: unggah hanya di Catat Pembayaran (belum di DP Buat Order & POS); disk privat `local`.
  - Desain: Inter + angka tabular global (mono hanya ID/kode); header tidak sticky; tanpa pencarian global (tidak ada endpoint).

### Data uji lokal (bukan seed)

DB lokal berisi data hasil verifikasi manual: ORD-0019 (studio + produk bervarian & Keychain), catatan di ORD-0010, aset "Drone DJI" (DRN-001) + kategori Drone + 2 foto & 2 nota (file di `storage/app/private/assets/`), riwayat peminjaman Lighting (Raka, ORD-0005) & Trigger (Dimas), merek/lokasi/garansi di "Printer foto", servis Head cleaning 11 Okt, foto di "Cetak 10R + Bingkai" (bertanda Profil), item baru "Gantungan Kunci Foto Kayu" dan "Bingkai Kayu A4", varian Kayu/Hitam di "Cetak 10R + Bingkai" dengan penjualan ORD-0018, ORD-0013 s.d. ORD-0017 (penjualan POS; ORD-0016 split Tunai 6.000 + QRIS 4.000), pembayaran tambahan di ORD-0012 (termasuk Rp 25.000 dari kartu Pembayaran 9 Okt), ORD-0005 dipindah ke besok dengan add-on, item custom "Drone" di ORD-0011, refund Rp 20.000 di ORD-0015. Peringatan "Piutang 11029%" di Dashboard berasal dari data ini. Reset: `php artisan migrate:fresh --seed` lalu hapus folder `storage/app/public/catalog` dan `storage/app/private/assets` (file foto tidak ikut terhapus oleh reset DB).

Verifikasi 4 Nov 2026 (DB presentasi): ORD-0457 (POS, customer baru "Uji Picker POS"), ORD-0458 (POS diskon 1.000 + split Tunai 24.000/QRIS 10.000), ORD-0459 (studio Paket Studio 1 Jam, customer Dewi Budiyanto), pembayaran 200.000 di ORD-0427, dua baris riwayat harga "Magnet Kulkas Foto" (HPP 4.500 lalu kembali 4.000).

## 4. Langkah berikutnya

Semua spek di `docs/specs/README.md` selesai per #64 (5.2 dibatalkan). Sisa temuan audit UI/UX (4 Nov 2026) — belum dipilih user, kerjakan bila diminta:

- P2: isian tanggal bawaan browser tampil `04/11/2026`, bukan R5 — perlu date picker (dependency baru `react-day-picker`, butuh persetujuan); filter tanggal Order belum berlabel Dari/Sampai. Nama `erp-Potraittime` di sidebar & judul tab termasuk invoice customer — butuh nama brand asli → `APP_NAME`.
- P3 yang belum: scroll ganda tabel ber-`max-h` (mungkin disengaja untuk header sticky — konfirmasi dulu); heading galeri foto (sengaja tidak diubah, lihat #76).

Kandidat lanjutan, kerjakan bila diminta:

- % di termin event (`schedule-editor`) — pola sama dengan DP (#67).
- Kolom estimasi biaya job di daftar & ekspor order; riwayat harga (6.5) belum mencatat perubahan estimasi (#70).

- Endpoint publik company profile (produk terpisah) — aturan field yang boleh keluar ada di spek 7.1; varian di company profile diputuskan saat itu.
- Unggah bukti transfer di DP Buat Order & pembayaran POS (pola sama dengan 6.7).
- Komponen paket per varian (`component_variant_id` nullable, catatan di spek 6.3).
- Aset: mencatat banyak alat sekaligus dari halaman order; data crew menggantikan teks pemegang.
- Uji manual login admin di layar harian (sudah dicek: dashboard, POS, order, katalog, aset, biaya, komunikasi, settings; laporan & modal 403).

Per item: branch dari `develop` (`feat/<modul>-<item>`), test ditulis bersamaan, PR ke `develop`. Kalau spek tidak cocok dengan kode saat dikerjakan, kode yang menang — catat penyimpangannya di body PR.

Keputusan K1–K5 di `docs/rencana-pengembangan-operasional.md` adalah **rekomendasi dev yang berlaku sampai owner mengubah** — tidak perlu menunggu.

## 5. Terbuka di luar spek (butuh owner/client)

- **Logo asli (menunggu file dari client).** Cara mengganti setelah file diterima:
  1. **Invoice & struk:** taruh file di `public/brand/logo.png` (PNG/SVG latar transparan, tinggi ≥ 120 px; tampil setinggi 48 px, 40 px saat cetak) — langsung terpakai tanpa build. Nama/lokasi lain: `STUDIO_LOGO=brand/nama-file.svg` di `.env`. Struk thermal mencetak hitam-putih, jadi pastikan logo tetap terbaca dalam grayscale.
  2. **Sidebar & halaman login:** ganti isi `resources/js/components/app-logo-icon.tsx` (masih ikon kamera), lalu `npm run build`.
  3. **Favicon:** `public/favicon.ico`, `public/favicon.svg`, `public/apple-touch-icon.png` masih **logo Laravel bawaan starter kit** — ganti dengan versi logo brand.
- `.env` produksi: `APP_NAME`, `STUDIO_NAME/ADDRESS/PHONE/BANK_ACCOUNT` (dipakai invoice & template), `MAIL_*` (blast email masih `log`).
- Hapus folder `web/` (prototype) setelah client setuju.
- Go-live: hosting, backup, data awal (katalog, aset, **modal awal per owner**), CI (billing GitHub Actions terkunci).
- `docs/demo-client.md` masih naskah prototype.
- Peran staf admin (5.1) aktif: akun admin dibuat owner di Settings → Pengguna atau `php artisan app:buat-pengguna`.
- Temuan kecil yang belum diubah: order retail berstatus Diserahkan masih menawarkan "Kembalikan ke Selesai Dikerjakan" dan "Batalkan Order"; invoice publik ikut tema gelap saat dicetak bila perangkat memakai dark mode; judul tab `${APP_NAME}` mentah di Vite dev bila `.env` memakai `VITE_APP_NAME="${APP_NAME}"`.
- `main` masih hanya berisi initial commit (13 Sep 2026); seluruh pekerjaan ada di `develop`. Rilis ke `main` menunggu keputusan go-live.

## 6. Cara kerja yang disepakati dengan user

- Gate lokal: `composer ci:check` gagal di `InertiaPageAssetTest` (2) selama Vite dev jalan (`public/hot` ada) — pindahkan `public/hot` sementara. Bila `php artisan test` exit 1 padahal semua lulus, jalankan `vendor/bin/phpunit --display-all-issues` (formatter agent menyembunyikan warning PHPUnit).
- Service `web-2` di lpm (`~/.lpm/projects/erp-photostudio.yml`) menjalankan `npm run dev` di `web/` (prototype), bukan Vite Laravel di root — jalankan `npm run dev` dari root.

- Bahasa Indonesia. "lanjut" / "ya" / "oke" = lanjutkan / setuju.
- Tidak perlu minta izin untuk perintah, commit, push feature branch, maupun membuat PR ke `develop`. **Jangan** push langsung ke `develop`/`main`, jangan amend/force push.
- Akses `.env` / `.env.example` diblokir — minta user menjalankan sendiri (`! <command>`).
- Dokumen ikut diperbarui di PR yang sama dengan kode.
- Gotcha alat: Playwright MCP setelah login → buka tab baru (`browser_tabs new`), bukan `browser_close`.
