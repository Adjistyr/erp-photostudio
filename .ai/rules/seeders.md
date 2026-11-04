---
paths:
    - 'database/seeders/**'
---

# Seeders

## Seeders are safe to re-run

Guard each insert with an existence check (`where(...)->doesntExist()`) so seeding twice never duplicates rows.
