# dialog

2026-10-04, golden pair via prototype — disalin dari web/app/components/ui (base-maia, preset b311momZs0), alias `~/`→`@/`, `cn`→`@/lib/utils`. Migrated.

## Changed

resources/js/components/ui/dialog.tsx; delete-user.tsx & passkey-item.tsx (DialogTrigger/DialogClose asChild → render={<Button/>}); two-factor-setup-modal.tsx onOpenChange kompatibel tanpa perubahan.

Leftover scan bersih: `grep -n "radix-ui\|@radix-ui"` pada file komponen ini tidak menemukan apa pun.

## Left alone

input-otp, sonner, spinner, icon, placeholder-pattern — bukan Radix (aturan skill).

## Behavior changes



## Verify by hand

- Settings > Profile > Delete account: dialog terbuka, fokus ke password, Cancel menutup & mereset form (dicek di browser).
- Esc menutup dialog, fokus kembali ke tombol pemicu.
