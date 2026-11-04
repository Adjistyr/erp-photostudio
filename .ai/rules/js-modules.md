---
paths:
    - 'resources/js/modules/**'
---

# Js Modules

## Module pages and barrels

Put domain pages in `resources/js/modules/<m>/pages/<kebab>.tsx` and render them as `'<m>::<page>'`; `resources/js/pages` is for auth, settings and dashboard. Import another module through its barrel (`@/modules/order`) and always use the `@/` alias.

## Forms via useForm and Wayfinder

Build forms with `useForm` and submit as `form.<verb>(XController.action(args).url, opts)` from `@/actions/Modules/...`. Use `@/routes/...` for links and `router.get`; never write URL strings.
