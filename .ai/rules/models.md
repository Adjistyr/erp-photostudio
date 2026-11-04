---
paths:
    - 'Modules/*/Models/**'
---

# Models

## Fillable attribute and @property docblock

Declare mass-assignable columns with `#[Fillable([...])]`, never `$fillable`/`$guarded`. Start every model with a docblock: `@property` per column using its cast type and `@property-read` per relation.

## Immutable dates

Cast date-only columns to `'immutable_date'` and type them `CarbonImmutable`. Get the current time with `today()`/`now()`; parse with `CarbonImmutable::`.

## Money is whole rupiah as int

Store money as signed `bigInteger` whole rupiah, cast `'integer'` and typed `int`; never decimal or float. Percentages are whole numbers.

## Author tracking and retiring records

User-entered records `use RecordsCreator` and list `created_by` in `#[Fillable]`; don't set it in controllers. No `SoftDeletes`: retire reference data with `is_active` or a dated status; hard-delete money rows only behind `can:delete-money`.
