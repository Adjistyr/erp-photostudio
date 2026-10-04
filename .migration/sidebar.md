# sidebar

2026-10-04, golden pair via prototype — disalin dari web/app/components/ui (base-maia, preset b311momZs0), alias `~/`→`@/`, `cn`→`@/lib/utils`. Migrated.

## Changed

resources/js/components/ui/sidebar.tsx; nav-main.tsx, app-sidebar.tsx (SidebarMenuButton asChild → render). Kustomisasi kosmetik starter (ikon toggle buka/tutup, h-svh gap) diganti versi prototype.

Leftover scan bersih: `grep -n "radix-ui\|@radix-ui"` pada file komponen ini tidak menemukan apa pun.

## Left alone

—

## Behavior changes



## Verify by hand

- Toggle sidebar: collapse ke 64px, state bertahan setelah reload (cookie).
