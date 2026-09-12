---
name: ERP Photo Studio
colors:
  background: '#ffffff'
  foreground: '#090b0c'
  card: '#ffffff'
  card-foreground: '#090b0c'
  popover: '#ffffff'
  popover-foreground: '#090b0c'
  primary: '#1447e6'
  primary-foreground: '#eff6ff'
  secondary: '#f4f4f5'
  secondary-foreground: '#18181b'
  muted: '#f1f3f3'
  muted-foreground: '#67787c'
  accent: '#f1f3f3'
  accent-foreground: '#161b1d'
  border: '#e3e7e8'
  input: '#e3e7e8'
  ring: '#9ca8ab'
  destructive: '#e7000b'
  destructive-foreground: '#ffffff'
  success: '#009966'
  success-foreground: '#ffffff'
  warning: '#d17100'
  warning-foreground: '#ffffff'
  success-subtle: '#dcf8ea'
  success-subtle-foreground: '#006e45'
  warning-subtle: '#ffefd1'
  warning-subtle-foreground: '#8c4a00'
  destructive-subtle: '#ffe9e5'
  destructive-subtle-foreground: '#bc0e16'
  chart-retail: '#155dfc'
  chart-studio: '#fe9a00'
  chart-event: '#ad46ff'
  chart-profit: '#00bc7d'
  chart-expense: '#ff2057'
  sidebar: '#f9fbfb'
  sidebar-foreground: '#090b0c'
  sidebar-primary: '#155dfc'
  sidebar-primary-foreground: '#eff6ff'
  sidebar-accent: '#f1f3f3'
  sidebar-accent-foreground: '#161b1d'
  sidebar-border: '#e3e7e8'
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
    fontVariantNumeric: tabular-nums
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
    fontVariantNumeric: tabular-nums
  table-header:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: '0'
    textTransform: none
  label:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    textTransform: none
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    fontVariantNumeric: tabular-nums
rounded:
  sm: 0.375rem
  DEFAULT: 0.5rem
  md: 0.5rem
  lg: 0.875rem
  xl: 0.875rem
  full: 9999px
spacing:
  sidebar-width: 256px
  header-height: 56px
  table-row-height: 44px
  table-header-height: 40px
  cell-padding-x: 12px
  cell-padding-y: 10px
  card-padding: 20px
  content-padding: 24px
  section-gap: 24px
---

# ERP Photo Studio — Aturan Desain

Versi format Stitch. Sumber kebenaran ada di `DESIGN.md`; file ini turunannya,
dengan token ditulis sebagai hex di frontmatter karena itu yang dibaca Stitch.
Kalau `DESIGN.md` berubah, file ini ikut diperbarui.

Web desktop. Satu pengguna: owner studio bernama **Studio Foto Agung**.
Bahasa UI: Indonesia. Karakter: padat, tenang, cepat dibaca. Ini alat kerja
harian, bukan landing page.

## Navigasi — WAJIB, jangan diubah atau ditambah

Sidebar 256px, warna `sidebar`, tepat **10 item** dalam **3 grup**, dipisah
garis `sidebar-border` dengan label grup 11px/500 `muted-foreground`:

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

Item aktif: bg `sidebar-accent`, teks `sidebar-primary`, garis kiri 2px
`sidebar-primary`.

Jangan menambah item nav apa pun. Tidak ada "Jadwal", "Keuangan", "Pengaturan",
"Bantuan", atau "Keluar" — kalender adalah tampilan di dalam Order & Booking,
bukan menu sendiri.

Paling atas sidebar: nama studio 15px/600 dengan logo kotak 32px `primary`.
Tanpa tombol aksi di sidebar — semua aksi ada di header halaman.

## Header halaman

Tinggi 56px, sticky. Kiri: breadcrumb. Kanan: aksi utama halaman saja.
Tanpa search global, tanpa ikon notifikasi, tanpa avatar profil — penggunanya
satu orang dan tidak ada yang perlu diberi notifikasi.

## Tabel

- Tinggi baris tetap 44px, padding cell 12px horizontal 10px vertikal
- Header 40px, gaya `table-header` — **huruf normal, bukan kapital semua**
- Kolom uang rata kanan, teks dan status rata kiri
- **Isi cell tidak boleh membungkus ke baris kedua.** Kolom uang, tanggal,
  nomor order, dan badge pakai `white-space: nowrap`. Lebarkan kolomnya kalau
  perlu, atau potong dengan ellipsis untuk kolom teks. Uang yang terbelah jadi
  "Rp" di baris satu dan "350.000" di baris dua merusak kesejajaran digit.
- Semua angka `tabular-nums`
- Tabel lebar penuh, tanpa max-width
- Tampilkan **semua** baris yang diminta, jangan dipotong jadi contoh

## Angka & tanggal

Uang `Rp 1.250.000` — titik ribuan, tanpa desimal, tidak pernah disingkat di
tabel. Negatif `−Rp 250.000` warna `destructive`. Nol `Rp 0` warna
`muted-foreground`. Persen bulat. Tanggal `26 Agu 2026`, dengan jam
`26 Agu 2026, 14:00`, rentang `12–14 Sep 2026`.

Penyingkatan (`1jt`) hanya boleh di label sumbu chart.

## Status kerja — netral, indikator titik

Lima lingkaran 6px berjajar gap 3px, diikuti label teks di kanannya.
Lingkaran aktif `foreground`, sisanya `border`. Label `muted-foreground`.

```
●○○○○ Booking      ●●○○○ Dijadwalkan   ●●●○○ Dikerjakan
●●●●○ Selesai Dikerjakan               ●●●●● Diserahkan   (label success)
✕ Batal  (label destructive, seluruh baris opacity 60%)
```

Setiap layar yang memakai indikator ini wajib punya baris legenda di bawah tabel.

## Status bayar — badge tint berwarna

| Status | Background | Teks |
|---|---|---|
| Belum Bayar | `destructive-subtle` | `destructive-subtle-foreground` |
| DP 40% | `warning-subtle` | `warning-subtle-foreground` |
| Lunas | `success-subtle` | `success-subtle-foreground` |

Badge rounded-md, padding 2px 8px, 12px/500, **satu baris** — "DP 43%" tidak
boleh patah jadi dua baris. Badge DP selalu membawa persentasenya.

## Warna lini — tetap, jangan ditukar antar layar

Retail `chart-retail` biru · Studio `chart-studio` amber · Event `chart-event`
ungu. Laba dan uang masuk `chart-profit` hijau, biaya dan uang keluar
`chart-expense` merah.

## Radius

Card, dialog, sheet: `lg` (14px). Badge, input dalam tabel, chip, tab: `md`
(8px). Tab dan item nav **bukan** pill — jangan pakai `full`.

## Komponen

Table, Badge, Card, Dialog, Sheet, Calendar, Command, Select, Tabs,
AlertDialog, Alert, Textarea, Progress, ToggleGroup, Sonner. Ikon lucide.
Jangan mengarang komponen di luar daftar ini.

## Jangan dispesifikasi

Skala shadow (border-first, bukan elevasi), timing animasi, breakpoint
responsif, ilustrasi custom.
