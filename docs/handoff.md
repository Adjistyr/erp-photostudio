# Handoff — posisi proyek & cara melanjutkan

Diperbarui **7 Oktober 2026**. Baca ini dulu di sesi baru; dokumen lain dirujuk dari sini. Perbarui bagian "Posisi" dan "Langkah berikutnya" setiap kali ada PR yang di-merge.

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

## 3. Posisi per 7 Oktober 2026

- `develop` memuat PR #10–#28: semua layar prototype `web/` sudah dipindah ke Laravel (Order & Booking, POS, Pembayaran, Katalog, Customer, Biaya, Aset & Maintenance, Laporan ×4, Modal & Bagi Hasil, Invoice + link publik bertanda tangan, Komunikasi, Dashboard), terjemahan `id`, dan keputusan bisnis 6 Okt: margin order batal = uang diterima − biaya job; biaya job boleh ke order batal; tutup buku manual per bulan (`period_closings`, rule `OpenPeriod`); koreksi = hapus dengan konfirmasi (`ConfirmDelete`), hanya bulan terbuka.
- Test terakhir: 256 PHPUnit, 25 Vitest, PHPStan bersih.
- **PR #29** (`docs/analisis-modul-operasional`, docs-only): analisis modul, rencana per fase, 32 spek, dan file ini. Kalau belum merged saat kamu membaca ini, merge dulu.

## 4. Langkah berikutnya

Ikuti `docs/specs/README.md`. Urutan: **0.1 `created_by`** → 0.2 → 1.1 → 2.1 → 2.2 → 2.3 → 2.4 → 1.2 → 1.3 → 1.4 → 2.5 → 3.x → 4.x; 5.x hanya setelah owner memastikan ada staf admin yang akan input; 6.x sesuai kebutuhan.

Per item: branch dari `develop` (`feat/<modul>-<item>`), kerjakan sesuai spek (test ditulis bersamaan), checklist spek dipindah ke body PR, PR ke `develop`, setelah merge ubah status di `docs/specs/README.md` → ✅ + nomor PR. Kalau spek tidak cocok dengan kode saat dikerjakan, kode yang menang — perbarui speknya di PR yang sama.

Keputusan K1–K5 di `docs/rencana-pengembangan-operasional.md` adalah **rekomendasi dev yang berlaku sampai owner mengubah** — tidak perlu menunggu.

## 5. Terbuka di luar spek (butuh owner/client)

- Logo asli — `resources/js/components/app-logo-icon.tsx` masih ikon kamera.
- `.env` produksi: `APP_NAME`, `STUDIO_NAME/ADDRESS/PHONE/BANK_ACCOUNT` (dipakai invoice & template), `MAIL_*` (blast email masih `log`).
- Hapus folder `web/` (prototype) setelah client setuju.
- Go-live: hosting, backup, data awal (katalog, aset, **modal awal per owner**), CI (billing GitHub Actions terkunci).
- `docs/demo-client.md` masih naskah prototype.
- RBAC (spek 5.1) menunggu kepastian staf admin.

## 6. Cara kerja yang disepakati dengan user

- Bahasa Indonesia. "lanjut" / "ya" / "oke" = lanjutkan / setuju.
- Tidak perlu minta izin untuk perintah, commit, push feature branch, maupun membuat PR ke `develop`. **Jangan** push langsung ke `develop`/`main`, jangan amend/force push.
- Akses `.env` / `.env.example` diblokir — minta user menjalankan sendiri (`! <command>`).
- Dokumen ikut diperbarui di PR yang sama dengan kode.
- Gotcha alat: Playwright MCP setelah login → buka tab baru (`browser_tabs new`), bukan `browser_close`.
