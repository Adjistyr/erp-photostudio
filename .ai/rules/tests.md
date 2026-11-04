---
paths:
    - 'Modules/*/Tests/**'
---

# Tests

## Module test location and naming

Put module tests in `Modules/<Name>/Tests/{Feature,Unit}` extending `Tests\TestCase`. Name methods `test_english_snake_case()` without `#[Test]` or `: void`; give the class an Indonesian docblock citing the spec.

## Tests run on demo data, no module factories

Don't add factories for module models. In `setUp()` seed `DemoSeeder`, `travelTo('2026-08-26 09:00:00')` and `actingAs(User::factory()->create())` (Finance extends `DemoDataTestCase`); fetch records with private `->sole()` lookups. Don't mock the app's own classes; only framework fakes.

## Inertia page assertions

Assert pages with `assertInertia(fn (Assert $page) => $page->component('<module>::<page>')->where(...)->has(...))` using the `AssertableInertia as Assert` alias; for row-level checks pull `->inertiaPage()['props']`.
