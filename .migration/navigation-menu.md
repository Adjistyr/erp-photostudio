# navigation-menu

2026-10-04, golden pair via registry base-maia (URL https://ui.shadcn.com/r/styles/base-maia/<c>.json), `cn`→`@/lib/utils`; IconPlaceholder diganti ChevronDownIcon (lucide). Migrated.

## Changed

resources/js/components/ui/navigation-menu.tsx (dipakai app-header, varian layout header yang tidak aktif)

Leftover scan bersih: `grep -n "radix-ui\|@radix-ui"` pada file komponen ini tidak menemukan apa pun.

## Left alone

—

## Behavior changes

- Base UI NavigationMenu punya delay buka ±50ms dibanding Radix (flag skill, tidak di-patch).

## Verify by hand

- Hanya relevan kalau layout diganti ke varian header.
