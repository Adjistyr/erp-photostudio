---
paths:
    - 'Modules/Finance/Services/**'
---

# Services

## Business formulas live in Finance services

Every financial/report formula lives in a `Modules/Finance/Services` class that returns a `final readonly class` result (public promoted props) placed next to it. Other modules and controllers read totals from these services, never recompute them. No laravel-data, no `Data/` folder.
