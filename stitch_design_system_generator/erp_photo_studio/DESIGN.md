---
name: ERP Photo Studio
colors:
  surface: '#f9f9fa'
  surface-dim: '#dadadb'
  surface-bright: '#f9f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f4'
  surface-container: '#eeeeef'
  surface-container-high: '#e8e8e9'
  surface-container-highest: '#e2e2e3'
  on-surface: '#1a1c1d'
  on-surface-variant: '#434655'
  inverse-surface: '#2f3132'
  inverse-on-surface: '#f1f0f2'
  outline: '#747687'
  outline-variant: '#c4c5d8'
  surface-tint: '#1c4bea'
  primary: '#0032b6'
  on-primary: '#ffffff'
  primary-container: '#1447e6'
  on-primary-container: '#c9d0ff'
  inverse-primary: '#b9c3ff'
  secondary: '#5c5f5f'
  on-secondary: '#ffffff'
  secondary-container: '#dee0e0'
  on-secondary-container: '#606363'
  tertiary: '#0038a7'
  on-tertiary: '#ffffff'
  tertiary-container: '#004cdb'
  on-tertiary-container: '#c6d1ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b9c3ff'
  on-primary-fixed: '#001356'
  on-primary-fixed-variant: '#0035be'
  secondary-fixed: '#e1e3e3'
  secondary-fixed-dim: '#c4c7c7'
  on-secondary-fixed: '#191c1d'
  on-secondary-fixed-variant: '#444748'
  tertiary-fixed: '#dce1ff'
  tertiary-fixed-dim: '#b6c4ff'
  on-tertiary-fixed: '#00164e'
  on-tertiary-fixed-variant: '#003baf'
  background: '#f9f9fa'
  on-background: '#1a1c1d'
  surface-variant: '#e2e2e3'
typography:
  page-title:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  metric:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 36px
  card-title:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  table-cell:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  table-header:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: '0'
  label:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar: 256px
  header-height: 56px
  table-row-height: 44px
  table-header-height: 40px
  cell-padding-x: 12px
  cell-padding-y: 10px
  card-padding: 20px
  content-padding: 24px
  section-gap: 24px
---

# ERP Photo Studio — Design Rules

Desktop web ERP for a single user: the owner of **Studio Foto Agung**, a small
photo studio. **All UI text is in Indonesian** — every label, button, status,
and heading quoted in this document must be rendered exactly as written, never
translated to English.

Character: dense, quiet, fast to scan. This is a tool opened for hours every
day, not a landing page. Information density and scanning speed take priority
over any single screen looking beautiful on its own.

## Token map

Use exactly the token names in the right column. Do **not** use `on-surface`,
`on-background`, `primary`, `primary-container`, `secondary`,
`surface-container-*`, or any other Material Design slot — their values are not
designed for this system.

| Need | Token |
|---|---|
| Body text, table numbers, headings, filled progress dot | `ink-strong` |
| Column labels, hints, metadata, units, inactive nav | `muted-foreground` |
| Primary action button, logo, active nav, marker line | `action` (hover `action-hover`) |
| Text on top of a primary action button | `ink-onaction` |
| Page and card background | `background` |
| Table lines, card borders, dividers, empty progress dot | `border` |
| Quiet background, neutral badge, active nav background | `muted` |
| Sidebar background | `sidebar`, its divider `sidebar-border` |
| Paid in full, profit, good trend | `success` / `success-subtle` |
| Partial payment, needs attention | `warning` / `warning-subtle` |
| Unpaid, cancelled, loss | `destructive` / `destructive-subtle` |

Cards are separated from the page background by a **1px border**, never by a
shadow or a different background colour. This system is border-first, with no
elevation scale.

## Navigation — required, do not change or extend

Sidebar is `sidebar` wide with a `sidebar` background, containing exactly
**10 items** in **3 groups** separated by a `sidebar-border` line. Group labels
are 11px/500 `muted-foreground` and must render as visible text, not merely as
a divider.

Item labels are Indonesian and must appear exactly as written:

```
HARIAN
  Dashboard          layout-dashboard
  POS                shopping-cart
  Order & Booking    calendar-check
  Pembayaran         wallet
DATA
  Customer           users
  Katalog            package
  Biaya              receipt
KELUARAN
  Invoice            file-text
  Komunikasi         send
  Laporan            bar-chart-3
```

Inactive item: `muted-foreground` text. Active item: `muted` background,
`action` text, 2px `action` left border. Item radius 8px, not a pill.

Exactly 10 items, no more. There is no "Jadwal", "Keuangan", "Pengaturan",
"Bantuan", or "Keluar" — including at the bottom of the sidebar. The calendar
is a view inside Order & Booking, not a menu of its own.

Sidebar top: studio name 15px/600 `ink-strong` next to a 32px square logo with
an `action` background. No action button in the sidebar — every action lives in
the page header.

**Layout shell.** The sidebar is `fixed left-0 top-0` with width `sidebar`, and
`<main>` must carry `ml-sidebar` so content is not painted underneath it. If
either class fails to resolve, the first table column disappears behind the
sidebar.

## Page header

`header-height` tall, sticky. Breadcrumb on the left, that page's primary
actions on the right. No global search, no notification bell, no profile
avatar — there is one user, nobody to notify, and no other account to switch to.

## Tables

- Fixed row height `table-row-height`, cell padding `cell-padding-x` /
  `cell-padding-y`
- Header row `table-header-height` tall using the `table-header` style —
  **sentence case, never all caps**
- Money columns right-aligned; text and status columns left-aligned
- **Cell content must never wrap to a second line.** Money, dates, order
  numbers, and all badges use `white-space: nowrap`. Widen the column if needed,
  or truncate text columns with an ellipsis. Money broken into "Rp" on line one
  and "350.000" on line two destroys digit alignment and defeats tabular-nums.
- **Every table cell requires `font-variant-numeric: tabular-nums`**, written
  directly on the cell class rather than relying on an inherited type style
- Tables span the full container width, no max-width
- Render **every** row given in the prompt — never truncate to a few samples

## Numbers and dates

Money is `Rp 1.250.000` — dot as thousands separator, no decimals, never
abbreviated in tables or detail pages, because the owner reconciles these
figures against bank statements. Negative is `−Rp 250.000` in `destructive`.
Zero is `Rp 0` in `muted-foreground`. Percentages are whole numbers.

Dates are `26 Agu 2026`. With time, `26 Agu 2026, 14:00`. Ranges use an en
dash: `12–14 Sep 2026`. Invoice age is relative: `23 hari`.

Abbreviation (`1jt`) is allowed only on chart axis labels.

## Work status — neutral, dot indicator

The Status Kerja column **must never be plain text**. Each cell holds two parts
side by side: the dot indicator first, then its label.

The indicator is 5 circular elements, each 6px × 6px, `border-radius: 9999px`,
3px apart, laid out horizontally. Filled circles use an `ink-strong`
background; remaining circles use `border`. The label sits 8px to the right at
14px.

Labels are Indonesian and must render exactly as written:

| Status | Filled circles | Label colour |
|---|---|---|
| Booking | 1 of 5 | `muted-foreground` |
| Dijadwalkan | 2 of 5 | `muted-foreground` |
| Dikerjakan | 3 of 5 | `muted-foreground` |
| Selesai Dikerjakan | 4 of 5 | `muted-foreground` |
| Diserahkan | 5 of 5 | `success` |
| Batal | a 14px `destructive` x-circle icon replaces the whole indicator | `destructive`, and the entire row drops to 60% opacity |

Any screen using this indicator needs a legend row beneath the table, and that
legend must use real circles too — not text alone. Dot notation does not
explain itself, and the owner should never have to memorise the order of five
statuses.

## Payment status — tinted badges

| Status | Background | Text |
|---|---|---|
| Belum Bayar | `destructive-subtle` | `destructive-subtle-foreground` |
| DP 40% | `warning-subtle` | `warning-subtle-foreground` |
| Lunas | `success-subtle` | `success-subtle-foreground` |

8px radius, 2px 8px padding, 12px/500, and always **on one line** — "DP 43%"
must not break across two lines. A partial-payment badge always carries its
percentage, never just "DP": that number is what decides whether the invoice
needs chasing today or can wait.

Only payment status is coloured. Work status is deliberately neutral because
the owner already knows how far along the job is — what demands action is
collecting money, and that has to stand out alone.

## Order type badge

The Tipe column uses a **neutral** outline badge: `border` border,
`muted-foreground` text, transparent background, 8px radius. Do not colour it
per business line. Line colours belong to charts and the calendar, where
comparing lines is the whole point; in an order table they compete with the
payment badge that actually needs attention.

Values are Indonesian: `Retail`, `Studio`, `Event`.

## Business line colours — fixed, never swapped between screens

Retail is `chart-retail` blue · Studio is `chart-studio` amber · Event is
`chart-event` purple. Profit and money in use `chart-profit` green; cost and
money out use `chart-expense` red.

Retail is blue in every chart on every screen. If the colour moves, the owner
has to read the legend every time and the chart stops being useful.

## Charts

- More than 3 categories compare as a horizontal bar chart, never a pie
- Grid lines `border`, axis text `muted-foreground` 12px tabular-nums
- No gradient fills, no 3D effects, no drop shadows on series
- Every chart carries a legend or direct labels

## Radius

| Element | Radius |
|---|---|
| Card, dialog, sheet | **14px** |
| Badge, chip, tab, input, button, nav item | **8px** |
| Avatar, progress indicator circles | full |

Tabs, badges, and nav items are **not** pills. If the built-in radius scale has
no 14px and no 8px step, write the literal value — do not round to 12px or 16px.

## Empty states

Every screen needs an empty variant. This business is one month old with no
prior record-keeping, so on day one every screen is empty — without a designed
empty state, the first impression is that the app is broken.

Three parts: a 40px `muted-foreground` lucide icon, one Indonesian sentence
explaining what will appear here, and one button leading to the action that
fills it. 80px vertical padding, centred.

The exception is an empty receivables list — that is good news, not missing
data. Use a check-circle icon in `success` and no button.

## Components

Table, Badge, Card, Dialog, Sheet, Calendar, Command, Select, Tabs,
AlertDialog, Alert, Textarea, Progress, ToggleGroup, Sonner. Icons from lucide.
Do not invent components outside this list.

## Do not specify

Shadow scale (this system is border-first, not elevation-based), animation
timing, responsive breakpoints, custom illustrations for empty states.