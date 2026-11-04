---
paths:
    - 'Modules/*/Controllers/**'
---

# Controllers

## Controllers own writes; no repository layer

Write with Eloquent directly in the controller, wrapping multi-row writes in `DB::transaction(fn ...)`. Do not add repositories or query objects. Extract a `Modules/<M>/Actions/<Verb><Noun>` only when the write step is reused.

## Money dates use OpenPeriod

Call `OpenPeriod::ensureOpen($model->date)` before deleting a money record; closed periods must reject deletes.

## Inertia props are hand-built arrays

Do not add API Resources. Build props as snake_case arrays (`->map(fn (Model $x) => [...])`, a private `xxxProps()` method, or a model `toProps()`). Remove owner-only fields with `Finance::except(...)` / `Finance::only(fn () => ...)`; never send them as null.

## Paginated lists go through ListQuery

Paginate with `->paginate(ListQuery::PER_PAGE)->withQueryString()`, pass `ListQuery::paginated($page, $mapper)` and `'filters' => $list->toArray()` to the page.

## Toast flash then to_route/back

After a mutation call `Inertia::flash('toast', ['type' => 'success'|'error'|'warning', 'message' => '<Indonesian sentence>'])`, then `return to_route(...)` or `back()`. No `redirect()->route()` or session `->with()`.
