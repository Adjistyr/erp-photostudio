# button

2026-10-04, golden pair via prototype — disalin dari web/app/components/ui (base-maia, preset b311momZs0), alias `~/`→`@/`, `cn`→`@/lib/utils`. Migrated.

## Changed

resources/js/components/ui/button.tsx; resources/js/layouts/settings/layout.tsx (asChild+Link → nativeButton={false} render={<Link/>}); resources/js/components/delete-user.tsx (asChild membungkus <button type=submit> → <Button type="submit">)

Leftover scan bersih: `grep -n "radix-ui\|@radix-ui"` pada file komponen ini tidak menemukan apa pun.

## Left alone

—

## Behavior changes



## Verify by hand

- Tab ke tombol: focus ring terlihat.
- Settings > tautan Profile/Security/Appearance pindah halaman (Button render={<Link/>}).
