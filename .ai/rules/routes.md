---
paths:
    - 'Modules/*/Routes/**'
---

# Routes

## Module route files

Wrap routes in `Route::middleware(['web', 'auth', 'verified'])->group(...)` (`web` is required; the provider loads these outside the web group). Register explicit verb routes `[XController::class, 'method']` named `plural.sub.action`; non-CRUD actions are named methods, not invokable controllers. Nested `parent/{parent}/child/{child}` routes use `scopeBindings()`. Enforce permissions with `->middleware('can:<ability>')`, never inside controllers.
