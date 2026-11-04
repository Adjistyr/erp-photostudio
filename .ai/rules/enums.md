---
paths:
    - app/Enums/Ability.php
---

# Enums

## New permission = new Ability case

Add a case to `App\Enums\Ability` for a new permission; it is automatically defined as a Gate, shared as `auth.can`, and usable as `can:<value>`. Do not write Policies or separate `Gate::define` calls.
