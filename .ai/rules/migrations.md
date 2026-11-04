---
paths:
    - 'database/migrations/**'
---

# Migrations

## Money is whole rupiah as int

Store money as signed `bigInteger` whole rupiah, cast `'integer'` and typed `int`; never decimal or float. Percentages are whole numbers (`unsignedTinyInteger`).

## Foreign keys and enum columns

Use `foreignId(...)->constrained()` and always chain `restrictOnDelete()`, `cascadeOnDelete()` or `nullOnDelete()`; name user references by role (`created_by`). Store enums as `string()` with a `// EnumName` comment, never `->enum()`.
