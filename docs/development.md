# Development — Setup & Konvensi

Dashboard internal Potrait Time (Paket B quotation): **Laravel 13 + Inertia 3 + React 19**, TypeScript, Tailwind 4, shadcn base-maia di atas **Base UI**, PostgreSQL. App Laravel ada di **root repo**.

| Folder | Isi |
|---|---|
| `app/`, `routes/`, `resources/`, `database/`, `tests/` | App Laravel |
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

### Test di PostgreSQL
`phpunit.xml` dan CI memakai PostgreSQL, bukan SQLite `:memory:` bawaan starter kit. Laporan bulanan bergantung pada fungsi tanggal dan agregasi yang perilakunya beda antar database — bug semacam itu tidak boleh baru ketahuan di produksi.

### Komponen UI
- Primitive di `resources/js/components/ui/` adalah **Base UI** (preset base-maia, mist), bukan Radix. Pola: `render={<Link … />}`, bukan `asChild`.
- Komponen yang sudah ada di prototype (`web/app/components/ui/`) **disalin dari sana**: ganti import `~/` → `@/` dan `"cn"` → `"@/lib/utils"`. Komponen prototype sudah membawa kustomisasi DESIGN.md (varian badge R3, dsb).
- Token desain di `resources/css/app.css` — ubah bersamaan dengan DESIGN.md bagian 2.
- Font self-hosted lewat `@fontsource-variable` (DM Sans, Outfit, JetBrains Mono), tanpa CDN.

### Rumus bisnis
Dihitung di PHP (`app/Services/Finance`), dikirim ke halaman sebagai props Inertia — bukan di TypeScript. Skema, konvensi, glosarium istilah Indonesia ↔ kode, dan letak tiap rumus: [database.md](./database.md).

Test keuangan mewarisi `tests/Feature/Finance/DemoDataTestCase` — dataset prototype dengan "hari ini" 26 Agustus 2026.

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
7. **`.env` dibaca setelah env proses.** Variabel yang sudah ada di environment (mis. di CI) mengalahkan `.env` — dipakai CI untuk kredensial PostgreSQL.

---

## 6. Belum dikerjakan (tahap berikutnya)

- Layar per modul (controller + Form Request + halaman Inertia), dipindah dari `web/`. Termasuk validasi bentuk input (nama aset wajib, unit ≥ 1, …) yang belum diporting dari prototype, dan aksi tulis atomik (tambah aset = aset + investasi + setoran modal dalam satu transaksi).
- Terjemahan Indonesia untuk halaman auth & settings bawaan starter kit, dan pesan validasi Laravel (`lang/id`).
- `isCurrentOrParentUrl` di `resources/js/hooks/use-current-url.ts` memakai `startsWith` biasa (`/order` cocok dengan `/orderan`) — perlu dibandingkan per segmen saat menu bertambah.
- Logo aplikasi masih logo Laravel (`app-logo-icon.tsx`).
- Varian layout header (`app-header.tsx`) tidak dipakai dan masih berisi link starter Laravel.
