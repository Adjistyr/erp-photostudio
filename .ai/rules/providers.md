---
paths:
    - 'Modules/*/Providers/**'
---

# Providers

## Module provider only sets $module

A module provider is `class XServiceProvider extends ModuleServiceProvider { protected string $module = 'X'; }` with no other logic. Register it by hand in `bootstrap/providers.php`; the base class loads routes and the `<module>::` page namespace.
