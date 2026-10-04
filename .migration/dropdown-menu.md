# dropdown-menu

2026-10-04, golden pair via prototype — disalin dari web/app/components/ui (base-maia, preset b311momZs0), alias `~/`→`@/`, `cn`→`@/lib/utils`. Migrated.

## Changed

resources/js/components/ui/dropdown-menu.tsx; user-menu-content.tsx (Item asChild → render; Label dibungkus DropdownMenuGroup; logout nativeButton); nav-user.tsx & app-header.tsx (Trigger asChild → render, w-(--radix-dropdown-menu-trigger-width) → w-(--anchor-width), data-[state=open] → data-popup-open).

Leftover scan bersih: `grep -n "radix-ui\|@radix-ui"` pada file komponen ini tidak menemukan apa pun.

## Left alone

input-otp, sonner, spinner, icon, placeholder-pattern — bukan Radix (aturan skill).

## Behavior changes

- **Crash yang ditemukan di browser (sudah diperbaiki):** DropdownMenuLabel = Menu.GroupLabel, wajib di dalam Group. Radix membolehkan label berdiri sendiri; typecheck tidak menangkapnya.
- Item dengan render <button> asli (logout `Link as="button"`) butuh `nativeButton`.

## Verify by hand

- Buka menu pengguna (sidebar bawah): info user, Settings, Log out tampil tanpa error console.
- Panah atas/bawah menavigasi item, Esc menutup.
- Log out → kembali ke login (dicek di browser).
