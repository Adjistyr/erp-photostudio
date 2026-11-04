---
paths:
    - 'resources/js/**/*.tsx'
    - 'resources/js/**'
    - 'resources/js/**/*.test.{ts,tsx}'
---

# Js

## Format numbers and dates via lib/format

Render all money, percentages and dates through `@/lib/format` (`formatRp`, `formatTanggal`, `formatPersen`, `kelasRp`, `hanyaDigit`). Never call `Intl`/`toLocaleString` or build `"Rp "` strings. Money form fields use `MoneyInput` (`@/components/money-input`, digits in state, `withPrefix={false}` next to an Rp/% toggle), never `Input` + `hanyaDigit` or `type="number"`.

## Gate UI with useCan

Hide buttons and menus with `useCan().<ability_key>`, never by checking `user.role`. Render server-stripped financial fields based on whether the field exists, not on `can`.

## Hardcoded Indonesian UI copy

Write UI text directly in Indonesian; there is no i18n layer. Put enum display text in `*_LABEL` maps in `types/domain.ts` or the module's `types.ts`.

## Colocated Vitest tests

Put `<file>.test.ts(x)` next to the source. Use `import assert from 'node:assert/strict'` with `test` from `vitest` (not `expect`); render components with `renderToStaticMarkup`.
