---
paths:
    - 'Modules/*/Requests/**'
---

# Requests

## Form Request labels and authorize()

Omit `authorize()`; roles are checked by route `can:` middleware (use it only for a state lock on the bound record). Every request defines `attributes()` mapping each field, including `x.*`, to a lowercase Indonesian label; `messages()` only for specific `field.rule` sentences.

## Form Request structure

Put cross-field and record-state checks in `after()` returning `Closure(Validator)` entries. Share rule/attribute/message fragments via `Requests/Concerns` traits (`xxxRules()`, `xxxAttributes()`, `xxxMessages()`). Read the bound model through a typed accessor that checks `instanceof` and throws `LogicException`; put input normalisation in public getters the controller calls.

## Money dates use OpenPeriod

Add `new OpenPeriod` to every validated date that affects money; closed periods must reject writes.
