# project

2026-10-04, whole-project migration Laravel React starter kit (shadcn new-york + Radix) → Base UI dengan preset prototype (base-maia, mist). Selesai: 21 wrapper, 0 sisa Radix.

## Changed

- components.json: style `new-york` → `base-maia`, baseColor `mist` (sama dengan web/components.json).
- Strategi: bukan mempertahankan tampilan starter — tujuannya tampilan prototype. Wrapper yang ada di prototype disalin dari web/app/components/ui (sudah membawa kustomisasi DESIGN.md); sisanya (avatar, collapsible, navigation-menu) dari registry base-maia.
- Dependensi: `@base-ui/react` dipasang; 13 paket `@radix-ui/*` dicopot; `shadcn` (devDependency) untuk `shadcn/tailwind.css` (custom variant data-open/closed/checked).
- Pemakai: 15 `asChild` di 10 file → `render`; class Radix (`--radix-*-trigger-width`, `data-[state=open]`) → padanan Base UI.
- **Gotcha tooling:** `shadcn add` mendeteksi pnpm dari `pnpm-workspace.yaml` starter kit, membuat `pnpm-lock.yaml` kedua dan menambah paket `cn`. Dibatalkan; komponen registry berikutnya diambil langsung lewat URL.
- Hasil akhir: `npm run types:check`, `npm run check`, `npm run build` lolos; PHP test 49/49.

## Left alone

- input-otp (lib `input-otp`), sonner, spinner, icon, placeholder-pattern — bukan Radix.
- Varian layout header (app-header.tsx, app-header-layout.tsx) — tidak dipakai, masih memuat link starter Laravel.

## Behavior changes

- DropdownMenuLabel wajib di dalam Group (crash kalau tidak) — sudah diperbaiki di user-menu-content.tsx. **Wajib diingat saat memindah layar prototype**: setiap Label menu/select harus di dalam Group.
- NavigationMenu: delay buka ±50ms (tidak di-patch).

## Verify by hand

Sudah dicek di browser 2026-10-04 (tanpa error console): login + Remember me, dashboard, menu pengguna, logout, Settings > Profile (dialog hapus akun buka/tutup), Settings > Security (redirect konfirmasi password). Sisa: menu mobile (sheet), tooltip sidebar collapsed, halaman 2FA/passkey.
