# tooltip

2026-10-04, golden pair via prototype — disalin dari web/app/components/ui (base-maia, preset b311momZs0), alias `~/`→`@/`, `cn`→`@/lib/utils`. Migrated.

## Changed

resources/js/components/ui/tooltip.tsx; app.tsx (TooltipProvider delayDuration → delay); app-header.tsx (TooltipTrigger membungkus <a> → render={<a/>}, menghilangkan elemen interaktif bersarang).

Leftover scan bersih: `grep -n "radix-ui\|@radix-ui"` pada file komponen ini tidak menemukan apa pun.

## Left alone

—

## Behavior changes



## Verify by hand

- Sidebar collapsed: hover ikon Dashboard → tooltip muncul.
