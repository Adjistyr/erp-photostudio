---
name: Photo Studio ERP
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e5'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fe'
  surface-container: '#ededf9'
  surface-container-high: '#e7e7f3'
  surface-container-highest: '#e1e2ed'
  on-surface: '#191b23'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3039'
  inverse-on-surface: '#f0f0fb'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#5a5f62'
  on-secondary: '#ffffff'
  secondary-container: '#dce0e4'
  on-secondary-container: '#5e6367'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#dfe3e7'
  secondary-fixed-dim: '#c3c7cb'
  on-secondary-fixed: '#171c1f'
  on-secondary-fixed-variant: '#43474b'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#faf8ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ed'
  success: '#22C55E'
  warning: '#F59E0B'
  destructive: '#EF4444'
  chart-retail: '#3B82F6'
  chart-studio: '#F59E0B'
  chart-event: '#A855F7'
  chart-profit: '#10B981'
  chart-expense: '#EF4444'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.01em
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar-width: 256px
  header-height: 56px
  table-row-height: 44px
  cell-padding-x: 12px
  cell-padding-y: 10px
---

# DESIGN.md — Sistem Desain ERP Photo Studio

Dokumen: 26 Agustus 2026
Basis: shadcn/ui + Tailwind, target **web desktop**, bahasa UI **Indonesia**

---

## 1. Design Tokens

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.148 0.004 228.8);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.148 0.004 228.8);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.148 0.004 228.8);
  --primary: oklch(0.488 0.243 264.376);
  --primary-foreground: oklch(0.97 0.014 254.604);
  --secondary: oklch(0.967 0.001 286.375);
  --secondary-foreground: oklch(0.21 0.006 285.885);
  --muted: oklch(0.963 0.002 197.1);
  --muted-foreground: oklch(0.56 0.021 213.5);
  --accent: oklch(0.963 0.002 197.1);
  --accent-foreground: oklch(0.218 0.008 223.9);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.925 0.005 214.3);
  --input: oklch(0.925 0.005 214.3);
  --ring: oklch(0.723 0.014 214.4);
  --radius: 0.875rem;

  /* TAMBAHAN — status semantik */
  --success: oklch(0.596 0.145 163.2);
  --success-foreground: oklch(0.98 0.02 163);
  --success-subtle: oklch(0.955 0.035 163.2);
  --success-subtle-foreground: oklch(0.465 0.125 163.2);
  --warning: oklch(0.646 0.155 58.3);
  --warning-foreground: oklch(0.98 0.02 80);
  --warning-subtle: oklch(0.960 0.045 80);
  --warning-subtle-foreground: oklch(0.480 0.115 58.3);
  --destructive-subtle: oklch(0.955 0.030 27.3);
  --destructive-subtle-foreground: oklch(0.505 0.200 27.3);

  /* Chart kategorikal */
  --chart-1: oklch(0.546 0.245 262.881);  /* biru   — Retail        */
  --chart-2: oklch(0.769 0.188 70.1);     /* amber  — Studio        */
  --chart-3: oklch(0.627 0.265 303.9);    /* ungu   — Event         */
  --chart-4: oklch(0.696 0.170 162.5);    /* hijau  — Laba / masuk  */
  --chart-5: oklch(0.645 0.246 16.4);     /* merah  — Biaya / keluar*/

  --sidebar: oklch(0.987 0.002 197.1);
  --sidebar-foreground: oklch(0.148 0.004 228.8);
  --sidebar-primary: oklch(0.546 0.245 262.881);
  --sidebar-primary-foreground: oklch(0.97 0.014 254.604);
  --sidebar-accent: oklch(0.963 0.002 197.1);
  --sidebar-accent-foreground: oklch(0.218 0.008 223.9);
  --sidebar-border: oklch(0.925 0.005 214.3);
  --sidebar-ring: oklch(0.723 0.014 214.4);
}

.dark {
  --background: oklch(0.148 0.004 228.8);
  --foreground: oklch(0.987 0.002 197.1);
  --card: oklch(0.218 0.008 223.9);
  --card-foreground: oklch(0.987 0.002 197.1);
  --popover: oklch(0.218 0.008 223.9);
  --popover-foreground: oklch(0.987 0.002 197.1);
  --primary: oklch(0.623 0.214 259.815);
  --primary-foreground: oklch(0.97 0.014 254.604);
  --secondary: oklch(0.274 0.006 286.033);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.275 0.011 216.9);
  --muted-foreground: oklch(0.723 0.014 214.4);
  --accent: oklch(0.275 0.011 216.9);
  --accent-foreground: oklch(0.987 0.002 197.1);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.56 0.021 213.5);

  --success: oklch(0.696 0.170 162.5);
  --success-foreground: oklch(0.16 0.03 163);
  --success-subtle: oklch(0.290 0.055 163.2);
  --success-subtle-foreground: oklch(0.800 0.150 163.2);
  --warning: oklch(0.769 0.188 70.1);
  --warning-foreground: oklch(0.16 0.03 80);
  --warning-subtle: oklch(0.300 0.060 70.1);
  --warning-subtle-foreground: oklch(0.840 0.150 80);
  --destructive-subtle: oklch(0.300 0.070 27.3);
  --destructive-subtle-foreground: oklch(0.790 0.130 22.2);

  --sidebar: oklch(0.218 0.008 223.9);
  --sidebar-foreground: oklch(0.987 0.002 197.1);
  --sidebar-primary: oklch(0.623 0.214 259.815);
  --sidebar-primary-foreground: oklch(0.97 0.014 254.604);
  --sidebar-accent: oklch(0.275 0.011 216.9);
  --sidebar-accent-foreground: oklch(0.987 0.002 197.1);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.56 0.021 213.5);
}
```

## 2. Aturan Tipografi
- Sans: Inter (Body, Judul)
- Mono: JetBrains Mono (Invoice, ID Order, Angka Tabular)
- Angka uang, kuantitas, tanggal wajib `tabular-nums`.

## 3. Density & Layout
- Tinggi baris tabel: 44px
- Padding cell: 12px horiz, 10px vert
- Sidebar: 256px
- Header: 56px (Breadcrumb + Aksi)
- Radius elemen kecil: `rounded-md`, Radius card: `--radius` (14px).

## 4. Status Warna
- Belum Bayar: `--destructive-subtle`
- DP: `--warning-subtle`
- Lunas/Selesai: `--success-subtle`
- Progres Kerja: Indikator titik (Booking s/d Diserahkan).
