---
paths:
    - 'Modules/Shared/**'
---

# Shared

## Shared is a toolkit, not a feature module

`Modules/Shared` holds only cross-module building blocks (enums, `Http/ListQuery`, `Models/Concerns`, `Support`, base provider), never screens or routes. `Support/` helpers are `final class` with static methods.
