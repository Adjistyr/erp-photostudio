---
paths:
    - 'Modules/**'
---

# Modules

## Domain code lives in Modules/<Name>

Put new domain features in `Modules/<Name>/{Controllers,Requests,Models,Enums,Actions,Routes,Providers,Tests}`. Keep `app/` for starter-kit code and cross-module screens only; migrations, factories and seeders stay in `database/`.

## No events, listeners, jobs or observers

Do not add events, listeners, jobs or Observer classes. Call the Action directly inside the same transaction; model side effects go in `protected static function booted()` closures or a `bootXxx` trait.

## Indonesian why-comments with spec references

Write comments in Indonesian, explain why, and cite the spec section (`spek 8.1`, `business-flow 3`). Mark a deliberate scale shortcut as `ponytail: <limit> — <when to upgrade>`.

## PHP idioms

Prefer helpers (`auth()`, `config()`, `to_route()`, `back()`) over their facades. Use native string functions (`mb_*`, `trim`), not `Str::of()`. Use collection methods on Eloquent results and `array_*` on plain arrays; always type closure parameters.
