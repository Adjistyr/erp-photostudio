# Development — Setup & Konvensi

Dashboard internal Potrait Time (Paket B quotation): **Laravel 13 + Inertia 3 + React 19**, TypeScript, Tailwind 4, shadcn base-maia di atas **Base UI**, PostgreSQL. App Laravel ada di **root repo**.

| Folder | Isi |
|---|---|
| `app/`, `routes/`, `resources/`, `database/`, `tests/` | App Laravel (bawaan starter kit + bagian bersama) |
| `Modules/` | Kode bisnis per domain — lihat [Struktur per domain](#struktur-per-domain) |
| `web/` | Prototype React Router (data dummy). **Referensi** saat memindah layar — tidak di-deploy, dihapus setelah semua layar pindah |
| `docs/` | Dokumen bisnis, desain, arsip Stitch |
| `.migration/` | Laporan migrasi komponen UI Radix → Base UI |

---

## 1. Kebutuhan

- PHP ≥ 8.3 (lokal dikembangkan di 8.5), Composer 2
- Node ≥ 22, npm — **bukan pnpm** (lihat Gotcha 3)
- PostgreSQL (lokal 18 via Homebrew)

## 2. Setup lokal

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
createdb erp_photostudio
createdb erp_photostudio_test
```

Isi `.env`:

```dotenv
APP_NAME="Potrait Time"
APP_LOCALE=id
APP_FAKER_LOCALE=id_ID
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=erp_photostudio
DB_USERNAME=<user postgres lokal, Homebrew = user macOS>
DB_PASSWORD=
```

`APP_TIMEZONE` tidak perlu diisi — default `Asia/Jakarta` di `config/app.php`.

```bash
php artisan migrate --seed
php artisan db:seed --class=DemoSeeder   # opsional: dataset prototype (bukan produksi)
composer dev        # php serve + queue + log + vite sekaligus
```

### Akun

| Lingkungan | Cara |
|---|---|
| Lokal / staging | Seeder: `agung@potraittime.test` dan `raka@potraittime.test`, password `password` |
| Produksi | `php artisan app:buat-pengguna` — registrasi publik dimatikan |

## 3. Perintah

| Perintah | Fungsi |
|---|---|
| `composer dev` | Server + Vite dev |
| `composer test` | PHPUnit — memakai DB `erp_photostudio_test` (PostgreSQL) |
| `composer ci:check` | Yang dijalankan CI: lint/format frontend, typecheck, PHPStan, test |
| `npm run check` | Lint + format (vite-plus) |
| `npm run types:check` | `tsc --noEmit` |
| `vendor/bin/pint` | Format PHP |
| `php artisan wayfinder:generate --with-form` | Generate helper route TypeScript. **`--with-form` wajib** — Vite memakai `formVariants: true`, tanpa opsi ini typecheck gagal di semua `.form()` |

---

## 4. Konvensi

### Tanggal & zona waktu
Timezone app `Asia/Jakarta`. Tanggal transaksi, jadwal, dan jatuh tempo adalah **tanggal kalender**, bukan instant — simpan sebagai `date` / string `YYYY-MM-DD`, jangan `timestamp` UTC yang dikonversi. Prototype pernah kena bug tanggal bergeser satu hari karena parsing UTC (`web/app/lib/format.ts`).

### Tutup buku
Bulan "final" = sudah **ditutup owner** di Modal & Bagi Hasil, bukan sekadar lewat kalender (keputusan 2026-10-06). Tutup buku berurutan (bulan paling awal yang belum ditutup, hanya bulan yang sudah lewat); hanya bulan terakhir yang ditutup yang bisa dibuka kembali — riwayat buka/tutup di `period_closings`, tidak dihapus. `Periods::closedMonths()` dan `ProfitShareMonth::final` membaca tabel itu, jadi dana, balik modal, dan pelunasan pinjaman mengikuti.

**Setiap tanggal baru yang memengaruhi uang wajib memakai aturan `Modules\Finance\Rules\OpenPeriod`** — tanpa itu transaksi bisa masuk ke bulan yang bagi hasilnya sudah final. Tanggal yang selalu hari ini (DP di Buat Order, POS) tidak perlu: bulan berjalan tidak bisa ditutup.

### Bahasa
UI dan pesan server berbahasa Indonesia; kode berbahasa Inggris. Pesan validasi, login, dan reset kata sandi di `lang/id/*.php`; string `__()` lain di `lang/id.json`. Nama field di pesan validasi diambil dari `attributes()` tiap Form Request (field bawaan starter kit di `lang/id/validation.php` → `attributes`).

`.env` **wajib** `APP_LOCALE=id` — nilai `.env` mengalahkan default `config/app.php`, dan `.env` bawaan starter kit berisi `en` (semua pesan jadi bahasa Inggris). `phpunit.xml` mengunci `APP_LOCALE=id` supaya test tidak bergantung pada `.env` lokal.

### Test di PostgreSQL
`phpunit.xml` dan CI memakai PostgreSQL, bukan SQLite `:memory:` bawaan starter kit. Laporan bulanan bergantung pada fungsi tanggal dan agregasi yang perilakunya beda antar database — bug semacam itu tidak boleh baru ketahuan di produksi.

### Komponen UI
- Primitive di `resources/js/components/ui/` adalah **Base UI** (preset base-maia, mist), bukan Radix. Pola: `render={<Link … />}`, bukan `asChild`.
- Komponen yang sudah ada di prototype (`web/app/components/ui/`) **disalin dari sana**: ganti import `~/` → `@/` dan `"cn"` → `"@/lib/utils"`. Komponen prototype sudah membawa kustomisasi DESIGN.md (varian badge R3, dsb).
- Token desain di `resources/css/app.css` — ubah bersamaan dengan DESIGN.md bagian 2.
- Font self-hosted lewat `@fontsource-variable` (DM Sans, Outfit, JetBrains Mono), tanpa CDN.

### Rumus bisnis
Dihitung di PHP (`Modules/Finance/Services`), dikirim ke halaman sebagai props Inertia — bukan di TypeScript. Skema, konvensi, glosarium istilah Indonesia ↔ kode, dan letak tiap rumus: [database.md](./database.md).

Test keuangan mewarisi `Modules/Finance/Tests/Feature/DemoDataTestCase` — dataset prototype dengan "hari ini" 26 Agustus 2026.

### Struktur per domain
Kode bisnis dikelompokkan per domain di `Modules/<Modul>/` (backend) dan `resources/js/modules/<modul>/` (frontend). `app/` hanya berisi bawaan starter kit (User, auth/Fortify, settings, middleware, `Controller` dasar) dan layar perangkum lintas modul — saat ini `DashboardController`, yang hanya merangkai service modul tanpa menghitung ulang.

| Modul | Isi |
|---|---|
| `Shared` | `BusinessLine`, `Money`, `ModuleServiceProvider` (dasar provider modul) |
| `Catalog` | Item katalog (produk/jasa) |
| `Customer` | Customer |
| `Order` | Order, item, pembayaran, status kerja/bayar |
| `Expense` | Biaya job, biaya operasional |
| `Asset` | Aset, servis/perawatan |
| `Finance` | Owner, modal, investasi, pos dana, bagi hasil, dan semua rumus laporan (`Services/`) |

Isi satu modul backend (folder dibuat saat dibutuhkan): `Controllers/ Requests/ Models/ Enums/ Services/ Routes/web.php Providers/ Tests/{Feature,Unit}`. Migrasi, factory, dan seeder tetap terpusat di `database/`. Frontend: `pages/`, `components/`, dan `index.ts` sebagai permukaan publik (contoh: `@/modules/order` mengekspor `PaymentDialog` + tipe order).

Aturan yang disepakati:
- **Batas pragmatis.** Modul boleh membaca model modul lain (mis. `Finance` membaca `Order`, `Payment`, `JobCost`; `Order` punya relasi ke `Customer`). Tidak ada lapisan service antar-modul — dipilih karena laporan keuangan memang lintas domain, dan memaksakan batas ketat berarti menulis ulang semua rumus tanpa manfaat di skala ini. Impor frontend lintas modul tetap lewat `index.ts`, bukan path dalam.
- **Provider eksplisit.** Modul ber-layar punya `Providers/<Modul>ServiceProvider` (turunan `ModuleServiceProvider`, cukup isi `$module`) dan didaftarkan manual di `bootstrap/providers.php`. Provider memuat `Routes/web.php` dan mendaftarkan namespace halaman Inertia. Modul tanpa layar belum butuh provider.
- **Nama halaman Inertia `<modul>::<halaman>`** (`Inertia::render('order::index')` → `resources/js/modules/order/pages/index.tsx`). Halaman app tetap tanpa namespace (`dashboard`, `auth/login`, `settings/profile`). Resolver di `resources/js/app.tsx`.
- **Komponen dipakai 2+ modul** tetap di `resources/js/components/` (mis. `status-order.tsx`, `data-table.tsx`); tipe enum domain bersama di `resources/js/types/domain.ts`.

### Pola modul (contoh: Katalog)
Setiap layar yang dipindah dari `web/` mengikuti pola modul Katalog:

| Bagian | Letak | Catatan |
|---|---|---|
| Route | `Modules/<Modul>/Routes/web.php`, grup `web` + `auth` + `verified` | Resource terbatas (`->only([...])`); tidak ada `destroy` untuk data yang dirujuk riwayat — nonaktifkan |
| Validasi | `Modules/<Modul>/Requests/<Model>Request.php` | Aturan bisnis input (mis. HPP wajib produk, dilarang jasa); `attributes()` berbahasa Indonesia |
| Controller | `Modules/<Modul>/Controllers/<Model>Controller.php` (extends `App\Http\Controllers\Controller`) | Tipis; `Inertia::flash('toast', [...])` lalu `to_route(...)` |
| Halaman | `resources/js/modules/<modul>/pages/index.tsx`, dirender sebagai `<modul>::index` | Props bertipe; form `useForm`; URL dari Wayfinder (`@/actions/Modules/...`), bukan string |
| Aksi header | `<PageActions>` | Portal ke slot kanan header (R8) — tombol tetap bisa memakai state halaman |
| Status order | `components/status-order.tsx` | Badge status bayar & progres kerja (R3) — status bayar & persen DP dari server, tidak dihitung ulang di layar |
| Aksi status | `PATCH <modul>/{id}/<aksi>` (mis. `orders.advance`, `orders.cancel`) | Transisi status = route sendiri, bukan field di form edit. Langkah berikutnya ditentukan server (`WorkStatus::next()`), layar hanya mengirim "lanjut" |
| Riwayat anak | Route bersarang (`POST orders/{order}/payments`) + controller sendiri | Pembayaran tidak diedit; salah catat dihapus lalu dicatat ulang (`ConfirmDelete`, hanya bulan yang belum tutup buku). Dialog `PaymentDialog` (`@/modules/order`) dipakai Detail Order dan layar Pembayaran; controller-nya `back()` supaya owner kembali ke layar asal |
| Item dari katalog | Request memakai trait `Modules\Order\Requests\Concerns\ResolvesCatalogLines` | Klien hanya mengirim `catalog_item_id` + `quantity`; nama, harga, HPP disalin dari katalog di server saat simpan (Form Order, POS) |
| Aksi tulis lintas tabel | `Modules/<Modul>/Actions/<Aksi>.php` dengan `execute()` (mis. `Finance\Actions\RecordInvestment`) | Satu tempat untuk pencatatan yang dipakai beberapa layar (Catat Investasi + Tambah Aset), dibungkus transaksi oleh pemanggil |
| Halaman untuk customer (tanpa login) | Route di luar grup `auth`, middleware `signed`, link dari `URL::signedRoute()` (mis. `Order::invoiceUrl()`); halaman tanpa layout admin (kasus di `layout` `app.tsx`) | Id di URL tidak bisa diganti untuk mengintip data lain; jangan pernah membuka data customer lewat route publik tanpa `signed` |
| Layar per bulan | `?month=YYYY-MM` + `Periods::orCurrent()` di controller, `<MonthNav>` di halaman | Bulan di URL, difilter server; bulan tidak valid jatuh ke bulan berjalan. Total diambil dari service Finance (mis. `ProfitAndLoss`) supaya sama dengan laporan |
| Menu | `app-sidebar.tsx`, grup R8 yang sesuai | |
| Test | `Modules/<Modul>/Tests/Feature/<Model>Test.php` (namespace `Modules\<Modul>\Tests\Feature`) | Auth, render Inertia + props, validasi, aturan bisnis |

### Menu sidebar
Grup Harian / Data / Keluaran (DESIGN.md R8) di `resources/js/components/app-sidebar.tsx`. Grup tanpa item otomatis disembunyikan — modul baru cukup menambah item ke grupnya.

---

## 5. Gotcha

1. **Label menu/select Base UI wajib di dalam Group.** `DropdownMenuLabel` adalah `Menu.GroupLabel`; di luar `DropdownMenuGroup` menu langsung blank. Radix membolehkan, typecheck tidak menangkap — ini sudah sekali membuat menu pengguna crash. Perhatikan saat memindah layar prototype.
2. **Item menu yang merender `<button>` asli butuh `nativeButton`** (mis. `Link as="button"` untuk logout).
3. **`npx shadcn add` mendeteksi pnpm** dari `pnpm-workspace.yaml` bawaan starter kit, lalu membuat `pnpm-lock.yaml` kedua dan menambah paket `cn`. Ambil komponen registry langsung dari `https://ui.shadcn.com/r/styles/base-maia/<nama>.json`, atau hapus `pnpm-lock.yaml` + batalkan perubahan `package.json` setelahnya.
4. **Tailwind memindai seluruh project.** `web/` dan `docs/` dikecualikan lewat `@source not` di `app.css`, dan dari lint/format di `vite.config.ts`. Folder non-app baru perlu ditambahkan ke keduanya.
5. **PHPStan butuh memori > 128 MB** — `composer types:check` sudah memakai `--memory-limit=1G`.
6. **Seed data test di `setUp()`, bukan properti `$seed`.** `RefreshDatabase` hanya migrate + seed sekali per proses, oleh class test pertama yang jalan — kalau class itu tidak men-seed, data tidak pernah masuk untuk class lain. Gejalanya: test lolos saat dijalankan sendiri, gagal di suite penuh.
7. **Test tidak bergantung pada `npm run build`.** `tests/TestCase.php` memanggil `withoutVite()`. Tanpa itu, halaman baru yang belum ada di manifest Vite gagal render (500) dan test Inertia jebol dengan pesan "Not a valid Inertia response" yang tidak menunjuk ke penyebabnya.
8. **Lebar Sheet harus ditulis dengan prefix varian bawaan.** Sheet base-maia memasang `data-[side=right]:sm:max-w-sm`; `sm:max-w-2xl` biasa kalah spesifisitas dan tidak di-merge tailwind-merge — panel tetap sempit, isi terpotong. Pakai `data-[side=right]:sm:max-w-2xl`.
9. **`.env` dibaca setelah env proses.** Variabel yang sudah ada di environment (mis. di CI) mengalahkan `.env` — dipakai CI untuk kredensial PostgreSQL.
10. **`SelectValue` Base UI menampilkan nilai mentah.** Kalau value-nya id (`"7"`), trigger menampilkan `7`, bukan nama. Berikan `items={[{ value, label }]}` ke `<Select>` supaya trigger menampilkan label (contoh: `modules/order/pages/create.tsx`). Select yang value-nya sudah berupa teks tampil (sumber customer) tidak perlu.

---

## 6. Belum dikerjakan (tahap berikutnya)

- Semua layar prototype `web/` sudah dipindah — folder `web/` bisa dihapus setelah client menyetujui.
- Blast email butuh konfigurasi SMTP di `.env` (`MAIL_MAILER`, `MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`) — default `log` hanya menulis email ke log.
- Profil studio di invoice (`config/studio.php`) masih data contoh prototype — isi `STUDIO_NAME`, `STUDIO_ADDRESS`, `STUDIO_PHONE`, `STUDIO_BANK_ACCOUNT` di `.env` sebelum invoice dikirim ke customer.
- Logo aplikasi masih SEMENTARA (ikon kamera di `app-logo-icon.tsx`) — ganti isi komponen itu saat file logo Potrait Time tersedia. Nama di sidebar & judul tab = `APP_NAME` di `.env`.
- Gap modul operasional (POS, Order, Pembayaran, Katalog, Aset) dari sudut pandang admin & owner dan perbandingan dengan POS lain: `docs/research/analisis-modul-operasional.md` — belum ada yang diimplementasikan; urutan usulan di bagian 7 dokumen itu.
