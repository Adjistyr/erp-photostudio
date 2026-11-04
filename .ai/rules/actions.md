---
paths:
    - 'Modules/*/Actions/**'
---

# Actions

## Actions expose execute() and never open transactions

An Action has a single public `execute()` and is method-injected into the controller action. It must not open its own transaction; the caller wraps it in `DB::transaction`.
