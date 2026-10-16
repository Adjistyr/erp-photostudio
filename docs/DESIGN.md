# DESIGN.md — Sistem Desain ERP Photo Studio

Dokumen: 26 Agustus 2026 — bagian 2, R2–R4, R6, R8, R9 dan "Konvensi halaman" diperbarui 17 Oktober 2026 (sistem desain ala master-outlet)
Basis: shadcn/ui base-maia (Base UI) + Tailwind v4, target **web desktop**, bahasa UI **Indonesia**
Turunan dari: [business-flow.md](./business-flow.md)

---

## 1. Konteks

Dokumen ini mengunci keputusan visual untuk ERP di [business-flow.md](./business-flow.md), supaya setiap layar yang digenerate — di Google Stitch maupun nanti saat diimplementasi — konsisten tanpa perlu diputuskan ulang tiap kali.

**Cara pakai ke Stitch:** pakai [DESIGN.stitch.md](./DESIGN.stitch.md), bukan file ini. File itu paste-ready — salin seluruh isinya, save & apply, tanpa perlu menghapus apa pun. File ini tetap sumber kebenaran; `DESIGN.stitch.md` turunannya dan ikut diperbarui setiap file ini berubah.

### Kenapa versi Stitch penamaannya berbeda

Stitch tidak memakai file yang ditempel apa adanya — ia **membangun ulang** YAML frontmatter memakai kosakata Material Design, lalu merender dari hasil bangunannya sendiri. Blok CSS `oklch` di bawah frontmatter hanya jadi dokumentasi mati.

Pengamatan dari dua kali generate, konsisten keduanya:

| Nasib | Token |
|---|---|
| Lolos utuh | nama yang tidak ada di Material: `muted`, `muted-foreground`, `border`, `destructive`, `success`, `warning`, semua `*-subtle`, semua `chart-*`, `sidebar`, `sidebar-border` |
| Nilainya diremap | `primary` → digeser ke `primary-container`, slot `primary` diisi biru lain |
| Hilang sama sekali | `foreground`, `card`, `accent`, `input`, `ring`, `sidebar-primary`, `sidebar-accent`, dan tiap `*-foreground` milik token Material |
| Direset ke skala Stitch | seluruh blok `rounded` |

Konsekuensinya bukan sekadar warna meleset: aturan yang merujuk token yang hilang jadi tidak bisa dirender sama sekali. Indikator titik progres pernah hilang total karena spesifikasinya menyebut `foreground`, yang tidak ada di sistem hasil bangunan Stitch.

Karena itu `DESIGN.stitch.md` memakai nama majemuk yang tidak menabrak Material — `ink-strong`, `ink-onaction`, `action`, `action-hover` — dan seluruh aturan prosanya hanya merujuk nama itu atau token yang terbukti bertahan. Slot Material seperti `primary` dan `accent` sengaja tidak diisi sama sekali: mengisinya percuma karena pasti diremap, dan tidak ada aturan yang merujuknya.

Satu lagi yang mudah terlewat: key spacing harus bernama `sidebar`, **bukan** `sidebar-width`. Stitch menghasilkan kelas `w-sidebar` dan `ml-sidebar`, jadi key bersuffix tidak resolve — sidebar kehilangan lebar dan konten utama jatuh tertimpa di belakangnya.

Pembagian kerjanya: **frontmatter hanya untuk nilai warna bernama unik, prosa untuk semua aturan.** Lapisan prosa terbukti terserap hampir sempurna; lapisan YAML yang dibajak.

**Karakter yang dituju:** padat, tenang, cepat dibaca. Ini alat kerja harian satu orang, bukan landing page. Yang diprioritaskan: kepadatan informasi dan kecepatan scan — bukan keindahan tiap layar berdiri sendiri.

**Kondisi yang membentuk desain ini** (dari business-flow bagian 1): bisnis baru jalan 1 minggu, nol data historis, satu pengguna, < 10 transaksi/hari. Konsekuensinya ada di aturan **R7 (Empty State)** dan **R4 (Density)**.

---

## 2. Design Tokens

Sejak 17 Oktober 2026 tampilan mengikuti sistem desain **master-outlet (v3)** — proyek saudara dengan stack yang sama (React + Base UI + shadcn base-maia): kanvas hangat `#f5f5f3`, panel putih membulat tanpa garis, tombol utama **hampir hitam** berbentuk pil, teal sebagai `--brand` (logo, aksen), font Inter, `--radius` 0.625rem. Token tambahan proyek ini (status semantik R3, chart kategorikal R6) dipertahankan dan di-tune ulang supaya duduk di atas netral hangat dengan jaminan kontras yang sama.

Sumber kebenaran: `resources/css/app.css`. Netral ditulis hex supaya bisa dicocokkan dengan file desain sumber lewat search; warna semantik & chart tetap oklch karena di-tune per lightness/chroma.

```css
:root {
  --background: #f5f5f3;   /* kanvas */
  --foreground: #1b1b19;
  --card: #ffffff;         /* panel */
  --card-foreground: #1b1b19;
  --popover: #ffffff;
  --popover-foreground: #1b1b19;
  --primary: #1b1b19;      /* tombol utama hampir hitam */
  --primary-foreground: #ffffff;
  --brand: oklch(0.508 0.118 165.612);  /* teal — logo, aksen */
  --brand-foreground: #ffffff;
  --secondary: #f0f0ee;
  --secondary-foreground: #1b1b19;
  --muted: #f3f3f1;
  --muted-foreground: #6b6b64;
  --accent: #f3f3f1;
  --accent-foreground: #1b1b19;
  --destructive: oklch(0.56 0.215 27);  /* #d61d22 */
  --border: #ececea;
  --input: #e3e3df;
  --ring: #a3a39c;
  --radius: 0.625rem;

  /* TAMBAHAN — status semantik (lihat R3) */
  --success: oklch(0.53 0.13 150);
  --success-foreground: #ffffff;
  --success-subtle: oklch(0.955 0.04 150);
  --success-subtle-foreground: oklch(0.43 0.11 150);
  --warning: oklch(0.55 0.13 58);
  --warning-foreground: #ffffff;
  --warning-subtle: oklch(0.96 0.05 85);
  --warning-subtle-foreground: oklch(0.47 0.115 58);
  --destructive-subtle: oklch(0.955 0.03 25);
  --destructive-subtle-foreground: oklch(0.5 0.19 27);

  /* Chart kategorikal, peran tetap (lihat R6) */
  --chart-1: oklch(0.546 0.245 262.881);  /* biru   — Retail        */
  --chart-2: oklch(0.65 0.16 60);         /* amber  — Studio        */
  --chart-3: oklch(0.58 0.24 304);        /* ungu   — Event         */
  --chart-4: oklch(0.6 0.15 152);         /* hijau  — Laba / masuk  */
  --chart-5: oklch(0.6 0.22 22);          /* merah  — Biaya / keluar*/

  --sidebar: #ffffff;
  --sidebar-foreground: #1b1b19;
  --sidebar-primary: #1b1b19;   /* item menu aktif = pil hampir hitam */
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #f0f0ee;
  --sidebar-accent-foreground: #1b1b19;
  --sidebar-border: #ececea;
  --sidebar-ring: #a3a39c;
}

/* Sumber tidak punya tema gelap — ini turunannya: netral hangat yang sama
   digelapkan, tombol utama dibalik jadi hampir putih (peran "kontras
   tertinggi" tetap), brand/semantik/chart dinaikkan lightness-nya. */
.dark {
  --background: #141413;
  --foreground: #f5f5f3;
  --card: #1f1f1d;
  --card-foreground: #f5f5f3;
  --popover: #1f1f1d;
  --popover-foreground: #f5f5f3;
  --primary: #f5f5f3;
  --primary-foreground: #1b1b19;
  --brand: oklch(0.72 0.13 165);
  --brand-foreground: #0f2a21;
  --secondary: #2a2a27;
  --secondary-foreground: #f5f5f3;
  --muted: #2a2a27;
  --muted-foreground: #a3a39c;
  --accent: #2a2a27;
  --accent-foreground: #f5f5f3;
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: #6b6b64;

  --success: oklch(0.74 0.15 150);
  --success-foreground: #10230f;
  --success-subtle: oklch(0.3 0.05 150);
  --success-subtle-foreground: oklch(0.84 0.13 150);
  --warning: oklch(0.78 0.15 75);
  --warning-foreground: #2a1c05;
  --warning-subtle: oklch(0.31 0.055 70);
  --warning-subtle-foreground: oklch(0.86 0.13 82);
  --destructive-subtle: oklch(0.3 0.07 25);
  --destructive-subtle-foreground: oklch(0.8 0.12 22);

  --chart-1: oklch(0.66 0.19 260);
  --chart-2: oklch(0.78 0.16 70);
  --chart-3: oklch(0.68 0.21 304);
  --chart-4: oklch(0.72 0.16 152);
  --chart-5: oklch(0.68 0.2 20);

  --sidebar: #1f1f1d;
  --sidebar-foreground: #f5f5f3;
  --sidebar-primary: #f5f5f3;
  --sidebar-primary-foreground: #1b1b19;
  --sidebar-accent: #2a2a27;
  --sidebar-accent-foreground: #f5f5f3;
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: #6b6b64;
}
```

Penyimpangan dari token sumber, masing-masing dengan alasan:

| Token | Sumber | Di sini | Alasan |
|---|---|---|---|
| `--destructive` | `#dc2626` | `oklch(0.56 0.215 27)` | `#dc2626` hanya 4.42 di atas kanvas; angka negatif (R5) juga tampil di luar panel |
| `--sidebar-primary` | teal | `#1b1b19` | item menu aktif sumber memakai `bg-primary`; di sini lewat token sidebar supaya Sidebar shadcn tetap satu-satunya pemakai |
| `--chart-1..5` | monokrom | kategorikal | R6 |
| `--success*` hue | — | 150, bukan 163 | 163 nyaris sama dengan teal `--brand`; "Lunas" tidak boleh terbaca sebagai warna merek |
| `.dark` | (tidak ada) | turunan netral hangat | sumber hanya terang |

**Kontras terukur** (WCAG 2.x, dihitung dari nilai di atas; kanvas / panel):

| Pasangan | Terang | Gelap |
|---|---|---|
| `--foreground` | 15.80 / 17.25 | 16.89 / 15.12 |
| `--muted-foreground` | 4.92 / 5.37 | 7.26 / 6.51 |
| `--brand` (teks/ikon) | 4.92 / 5.37 | 7.88 / 7.06 |
| `--destructive` (teks) | 4.76 / 5.19 | 6.37 / 5.71 |
| `--success` (teks) | 4.56 / 4.97 | 8.48 / 7.59 |
| `--warning` (teks) | 4.64 / 5.06 | 9.02 / 8.08 |
| `--primary-foreground` di `--primary` | 17.25 | 15.80 |

Semua teks semantik ≥ 4.5 di kanvas maupun panel, dua tema. Badge dan chart: lihat R3 dan R6.

### Peta pemakaian token

| Kebutuhan | Token |
|---|---|
| Aksi utama (Simpan, Bayar, Buat Order) | `--primary` (pil hampir hitam) |
| Aksi sekunder (Batal, Kembali) | `outline` (panel putih + garis `--input`) / ghost |
| Aksi merusak (Hapus, Batalkan Order) | `--destructive` |
| Logo, aksen merek, avatar inisial | `--brand` |
| Kanvas halaman | `--background` |
| Panel isi (Card, Panel, Table, empty state) | `--card` |
| Lunas, Laba, tren naik yang bagus | `--success` |
| DP/Sebagian, jatuh tempo dekat, perlu perhatian | `--warning` |
| Belum Bayar, Batal, Rugi, lewat jatuh tempo | `--destructive` |
| Label kolom, hint, metadata, satuan | `--muted-foreground` |
| Garis tabel, pemisah section | `--border` (antar baris tabel: `--secondary`) |

---

## 3. Standar dan Aturan

### R1 — Selalu pakai token, jangan hardcode warna

Nilai warna yang ditulis langsung (`#22c55e`, `text-green-500`, `bg-slate-100`) akan lepas dari tema saat dark mode dinyalakan, dan bikin dua layar yang seharusnya sama jadi beda tipis. Semua warna harus lewat token di bagian 2.

```tsx
// ❌ Salah
<Badge className="bg-green-100 text-green-700">Lunas</Badge>

// ✅ Benar
<Badge className="bg-success-subtle text-success-subtle-foreground">Lunas</Badge>
```

Ini **blocker** — harus diperbaiki sebelum merge.

---

### R2 — Tipografi: Inter, mono hanya untuk ID, angka wajib tabular

```
Sans    : Inter Variable  (@fontsource-variable/inter, self-hosted) — sama dengan master-outlet
Heading : Inter           (token --font-heading menunjuk --font-sans)
Mono    : JetBrains Mono  — HANYA nomor invoice, ID order, kode, nomor rekening
```

DM Sans + Outfit (preset `b311momZs0`) diganti Inter supaya satu sistem desain dengan master-outlet; dependensinya dicabut.

| Peran | Ukuran / Berat | Catatan |
|---|---|---|
| Judul halaman (`PageHeader`) | 34px / 500, tracking −0.02em (28px di < md) | |
| Angka KPI dashboard | 30px / 500, tracking −0.02em | `SummaryCard` |
| Judul panel (`Panel`) | 18px / 500, tracking −0.01em | `CardTitle` 16px / 500 |
| Body | 14px / 400 | |
| Isi cell tabel | 13px / 400 | |
| Header kolom tabel | 12px / 500 | `--muted-foreground`, bukan uppercase |
| Label form, hint, caption | 12px / 500 | |
| Label grup menu | 11px / 600, uppercase | satu-satunya uppercase |

**Setiap angka uang, kuantitas, persen, dan tanggal wajib tabular.** Font proporsional memberi lebar berbeda tiap digit — angka `1` jauh lebih sempit dari `8`. Di kolom Rp yang rata kanan, ini bikin digit tidak sejajar antar baris, dan owner kehilangan kemampuan scan cepat "mana tagihan paling besar". Layar piutang adalah layar yang paling sering dibuka (business-flow 5.4), jadi ini bukan detail kosmetik.

**Cara memenuhinya sekarang: `tabular-nums` global di `body`, bukan mono.** Alasan lama memakai mono untuk uang adalah gotcha bahwa `tabular-nums` diam-diam no-op kalau font tidak punya fitur OpenType `tnum`. Untuk Inter itu sudah diverifikasi, bukan diasumsikan: subset `inter-latin-wght-normal.woff2` yang di-self-host memuat fitur GSUB `tnum` (juga `pnum`, `frac`, `calt`; dicek dengan fontTools 17 Okt 2026), dan digit bawaannya memang proporsional (lebar advance `0`=1292 vs `1`=833 unit) — jadi `tnum` benar-benar mengubah lebarnya. Dipasang global di `app.css` supaya tidak ada kolom yang lupa diberi kelas.

```tsx
// ✅ Benar — angka sudah tabular dari body; cukup rata kanan
<SelUang nominal={order.total} />
<td className="text-right">{formatRp(order.total)}</td>
```

Kalau font sans diganti lagi, **ulangi verifikasi `tnum`** pada file woff2 yang benar-benar di-bundle — itu satu-satunya syarat aturan ini tetap terpenuhi.

**Mono tetap untuk ID** (`SelKode`, nomor invoice/order, nomor rekening): subset Inter tidak membawa fitur `zero`/`cv*`, sehingga `0`/`O` dan `1`/`l`/`I` sulit dibedakan pada kode yang dibacakan owner ke customer atau dicocokkan dengan mutasi bank. `font-mono` yang masih menempel di sel uang halaman lama tidak salah (mono juga tabular) — page pass berikutnya mencabutnya.

Ini **blocker** untuk semua kolom numerik di tabel dan semua angka KPI.

Radius `--radius` 0.625rem (10px). Bentuknya mengikuti master-outlet: tombol, input, select, badge, dan tab berbentuk **pil** (`rounded-4xl`); panel/card/tabel `rounded-3xl`; textarea `rounded-xl`. Pengecualian `rounded-md` lama untuk badge gugur — pil kecil tidak lagi "terlalu bulat" pada radius dasar 10px. Not a blocker — approve dengan komentar kalau terlewat.

---

### R3 — Sistem badge status

Satu order punya **dua status independen** (business-flow bagian 4): status kerja (6 nilai) dan status bayar (3 nilai). Kalau keduanya diberi warna penuh, satu baris tabel memuat 9 kemungkinan warna dan yang penting jadi tenggelam.

Pemisahannya berdasar **mana yang butuh aksi owner**. Status kerja itu informasi progres — owner sudah tahu pekerjaannya sampai mana. Status bayar itu yang menuntut tindakan: menagih. Jadi hanya status bayar yang dapat warna.

**Status kerja — netral + indikator progres**

| Status | Tampilan |
|---|---|
| Booking | `●○○○○` teks `--muted-foreground` |
| Dijadwalkan | `●●○○○` teks `--muted-foreground` |
| Dikerjakan | `●●●○○` teks `--muted-foreground` |
| Selesai Dikerjakan | `●●●●○` teks `--muted-foreground` |
| Diserahkan | `●●●●●` teks `--success` |
| Batal | `✕` teks `--destructive`, baris di-opacity 60% |

Titik aktif pakai `--foreground`, titik non-aktif pakai `--border`.

**Status bayar — badge tint berwarna**

| Status | Background | Teks | Kontras |
|---|---|---|---|
| Belum Bayar | `--destructive-subtle` | `--destructive-subtle-foreground` | 5.69 / 7.08 |
| DP / Sebagian | `--warning-subtle` | `--warning-subtle-foreground` | 6.27 / 8.60 |
| Lunas | `--success-subtle` | `--success-subtle-foreground` | 6.85 / 8.58 |

(kontras teks di atas tint-nya, light / dark, semua lolos WCAG AA 4.5). Badge berbentuk pil, variant `danger` / `warning` / `success` di `Badge`.

Badge DP menampilkan persentasenya: `DP 40%`, bukan `DP` saja. Angka itu yang menentukan apakah tagihan perlu dikejar sekarang atau bisa nanti.

**Setiap layar yang menampilkan indikator progres wajib punya legenda** — tooltip di header kolom atau baris kecil di bawah tabel. Notasi titik tidak menjelaskan dirinya sendiri, dan owner tidak boleh perlu menghafal urutan 5 status.

Ini **blocker** — badge status muncul di Dashboard, Order List, Kalender, Piutang, dan Customer Detail. Kalau tidak seragam, setiap layar jadi bahasa sendiri.

> Catatan: tint badge (`*-subtle`) hanya berbeda 1.12–1.16 (terang) / 1.18–1.24 (gelap) dari `--card`. Ini disengaja — yang bekerja adalah warna teksnya. Badge netral (`secondary`) memang dimaksudkan mundur ke belakang.

---

### R4 — Density tabel

Default generator UI cenderung lega — padding besar, baris tinggi. Pada ERP itu artinya satu layar hanya memuat 5–6 baris order, dan owner scroll terus untuk pekerjaan yang seharusnya sekali lihat.

| Elemen | Nilai |
|---|---|
| Tinggi baris tabel | 44px |
| Padding cell | 12px horizontal, 10px vertikal |
| Tinggi header tabel | 40px (`TabelData`; `Table` polos 44px), baris pil `--background` di dalam panel |
| Teks cell | 13px |
| Padding card / panel | 20px (`Card`), 18px × 16px (`Panel`) |
| Jarak antar section | 24px |
| Padding konten halaman | 24px (16px di < md) |

Kolom uang **rata kanan**, kolom teks rata kiri, kolom status rata kiri. Tabel tidak dibatasi max-width — pakai lebar layar penuh. `Table` sendiri sudah panel putih `rounded-3xl` dengan inset 6px; jangan dibungkus border lagi.

Ini **blocker** untuk semua layar bertabel.

---

### R5 — Format angka, uang, dan tanggal

Generator akan mengisi data contoh sendiri. Tanpa aturan eksplisit hasilnya `$1,250.00` dan `09/12/2026` — format yang salah negara sekaligus ambigu.

| Jenis | Format | Contoh |
|---|---|---|
| Uang | `Rp` + pemisah ribuan titik, tanpa desimal | `Rp 1.250.000` |
| Uang negatif | prefix minus, warna `--destructive` | `−Rp 250.000` |
| Uang nol | `Rp 0`, warna `--muted-foreground` | `Rp 0` |
| Persen | bulat, tanpa desimal | `40%` |
| Tanggal | `D Mmm YYYY` | `12 Sep 2026` |
| Tanggal + jam | `D Mmm YYYY, HH:mm` | `12 Sep 2026, 14:00` |
| Rentang tanggal | en dash | `12–14 Sep 2026` |
| Umur piutang | relatif | `23 hari` |

Nilai uang **tidak disingkat** (`Rp 1,2jt`) di tabel dan detail — owner mencocokkan angka ini dengan mutasi rekening, jadi harus persis. Penyingkatan hanya boleh di label sumbu chart, tempat presisi tidak dipakai.

Ini **blocker** untuk uang dan tanggal.

---

### R6 — Chart

Palette chart bawaan theme ini monokrom — kelimanya abu-abu dengan chroma 0.007–0.021. Dua konsekuensinya: antar seri hanya beda kontras 1.36–1.60 (tidak terbedakan), dan di dark mode `chart-5` lama hanya 1.17 terhadap `--card` alias hilang. Padahal **margin per lini** adalah output paling berharga menurut business-flow bagian 7, dan itu butuh tiga seri sejajar yang jelas berbeda.

Karena itu chart-1..5 diganti jadi kategorikal (lihat bagian 2), dengan **peran tetap** yang tidak boleh ditukar antar layar:

| Token | Peran | Selalu untuk |
|---|---|---|
| `--chart-1` biru | Lini | Retail |
| `--chart-2` amber | Lini | Studio |
| `--chart-3` ungu | Lini | Event |
| `--chart-4` hijau | Arah | Laba, uang masuk |
| `--chart-5` merah | Arah | Biaya, uang keluar |

Retail selalu biru di setiap chart, di setiap layar. Kalau warnanya berpindah-pindah, owner harus baca legenda setiap kali dan chart kehilangan gunanya.

Urutan biru → amber → ungu dipilih, bukan urutan yang menaruh hijau dan amber bersebelahan: pasangan hijau/amber adalah yang paling sering tertukar pada deuteranopia. Hijau dan merah disisihkan ke peran laba/biaya, yang memang tidak pernah dibandingkan sebagai kategori sejajar.

Kontras tiap seri sebagai elemen grafis (≥ 3.0, WCAG 1.4.11), kanvas / panel:

| Token | Terang | Gelap |
|---|---|---|
| `--chart-1` biru | 4.82 / 5.26 | 5.75 / 5.15 |
| `--chart-2` amber | 3.10 / 3.38 | 8.95 / 8.01 |
| `--chart-3` ungu | 4.44 / 4.84 | 5.85 / 5.24 |
| `--chart-4` hijau | 3.38 / 3.69 | 7.93 / 7.10 |
| `--chart-5` merah | 4.04 / 4.41 | 5.82 / 5.21 |

Klaim lama "kelima warna lolos ≥ 3.0 di terang maupun gelap" ternyata tidak benar untuk amber (2.15) dan hijau (2.46) di atas putih; nilai di atas memperbaikinya, dan tema gelap kini punya set chart sendiri (biru lama hanya 3.30 di atas `--card` gelap).

Aturan lain:
- Perbandingan > 3 kategori pakai **bar horizontal**, bukan pie. Pie dengan 5 irisan tidak bisa dibaca perbandingannya.
- Garis grid pakai `--border`, teks sumbu `--muted-foreground` 12px tabular-nums.
- Tanpa gradient fill, tanpa efek 3D, tanpa drop shadow pada seri.
- Setiap chart punya legenda atau label langsung.

Peran warna tetap adalah **blocker**. Sisanya not a blocker — approve dengan komentar.

---

### R7 — Empty state di setiap layar

Ini yang paling gampang terlewat dan paling besar dampaknya di sini. Bisnis client baru berjalan 1 minggu dengan **nol pendataan** (business-flow bagian 1). Hari pertama app dipakai, **setiap layar kosong**. Kalau empty state tidak didesain, kesan pertama owner adalah app-nya rusak — dan business-flow bagian 1 sudah menyebut risiko terbesar proyek ini bukan teknis, tapi owner berhenti memakai app.

Setiap empty state berisi tiga hal: ikon lucide `--muted-foreground`, satu kalimat yang menjelaskan apa yang akan muncul di sini, dan satu tombol primary menuju aksi yang mengisinya.

| Layar | Kalimat | Tombol |
|---|---|---|
| Dashboard | "Belum ada data. Mulai dengan mengisi katalog produk dan jasa." | Isi Katalog |
| Katalog | "Belum ada produk atau jasa. Tambahkan yang paling sering dijual dulu." | Tambah Item |
| Customer | "Customer akan terkumpul otomatis dari setiap transaksi." | Tambah Customer |
| POS | "Katalog masih kosong. Isi dulu supaya bisa jualan." | Isi Katalog |
| Order & Booking | "Belum ada order. Buat order pertama untuk sesi studio atau event." | Buat Order |
| Kalender | "Belum ada jadwal bulan ini." | Buat Booking |
| Pembayaran / Piutang | "Tidak ada tagihan tertunggak." | — |
| Biaya | "Belum ada biaya tercatat bulan ini." | Catat Biaya |

Dua di antaranya bukan empty state biasa dan perlu dibedakan:

- **Piutang kosong itu kabar baik**, bukan kekurangan data. Pakai ikon centang dan `--success`, jangan nada "belum ada apa-apa".
- **POS dan Dashboard bergantung pada Katalog.** Empty state-nya harus mengarahkan ke Katalog, bukan menawarkan aksi yang belum bisa dijalankan. Ini mengikuti urutan ketergantungan di business-flow bagian 6.

Empty state di semua layar adalah **blocker**. Nada khusus untuk piutang not a blocker — approve dengan komentar.

---

### R8 — Layout shell

Seragam di semua layar:

| Bagian | Spesifikasi |
|---|---|
| Kanvas | `--background` hangat; rail, header chip, dan panel isi berwarna `--card` di atasnya, tanpa garis |
| Sidebar (rail) | panel melayang `rounded-3xl`, inset 12px dari tepi; lebar 256px, ringkas 64px (ikon saja); chip merek di atas (lingkaran `--brand` + nama), tombol **Ringkas menu / Lebarkan menu** di bawah; status disimpan cookie `sidebar_state`, Ctrl/⌘+B tetap berlaku |
| Item menu | pil 40px; aktif = `--sidebar-primary` (hampir hitam), tooltip berisi nama saat ringkas |
| Mobile (< md) | rail jadi Sheet kiri, dibuka tombol menu di header |
| Header | 64px, tidak sticky (POS mobile dan form katalog/aset punya `sticky` sendiri), breadcrumb kiri (di mobile hanya halaman sekarang) + aksi utama halaman + chip profil kanan |
| Chip profil | inisial di lingkaran `--brand`/15% + nama (di mobile inisial saja); menu Pengaturan, Keluar |
| Konten | padding 24px, lebar penuh (tanpa max-width) |
| Focus ring | `--ring`/50, 3px |

Sepuluh module tidak muat sebagai daftar rata — pada 10 item, mata kehilangan tempat dan setiap navigasi jadi pencarian. Dikelompokkan jadi tiga dengan judul grup 11px/600 uppercase `--muted-foreground` yang **bisa dibuka/tutup** (tombol ber-`aria-expanded`). Semua grup terbuka bawaan; yang ditutup diingat per browser (`localStorage` `pt.nav.groups.closed`), dan grup berisi halaman aktif selalu dibuka saat navigasi. Saat rail ringkas, judul grup tidak muat — semua item tampil dan garis `--sidebar-border` menandai awal tiap grup. Urutan di dalam grup mengikuti frekuensi pakai harian, bukan nomor module di business-flow bagian 6:

```
HARIAN
  Dashboard
  POS
  Order & Booking
  Pembayaran        ← Piutang jadi tab di dalamnya
DATA
  Customer
  Katalog
  Biaya
  Aset & Maintenance ← daftar alat, jadwal perawatan, riwayat servis (business-flow 8.9)
KELUARAN
  Invoice
  Komunikasi        ← Thank You mail, blast, template
  Laporan
  Modal & Bagi Hasil ← setoran owner, pos dana, investasi, rasio (business-flow bagian 8)
```

Modal & Bagi Hasil jadi menu sendiri, bukan tab di Biaya: Biaya diisi harian, layar ini dibuka owner sebulan sekali. Menggabungkannya menaruh form biaya harian bersebelahan dengan pemakaian dana dan investasi — dua hal yang tidak boleh masuk Laba Rugi, dan tertukarnya memotong laba dua kali.

Aset & Maintenance masuk grup Data, bukan tab di Modal & Bagi Hasil: daftar aset adalah data master yang dirujuk setiap kali ada servis, bukan laporan bulanan. Status aset memakai badge netral — yang menuntut aksi adalah jadwal perawatan yang lewat, dan itu memakai teks `--destructive` yang sama dengan umur piutang lewat jatuh tempo. Aset yang dilepas dipudarkan 60% seperti order Batal.

Ini **blocker** — shell yang berbeda antar layar langsung terasa sebagai app yang tidak selesai.

---

### R9 — Komponen shadcn yang dipakai

Dibatasi supaya generator tidak mengarang komponen yang tidak ada di shadcn dan harus dibuat manual saat implementasi.

| Kebutuhan UI | Komponen |
|---|---|
| Daftar order, katalog, customer, piutang | `Table` + `Badge` |
| KPI dashboard | `Card` / `SummaryCard` |
| Bagian halaman (judul + isi) | `Panel` (`@/components/page`) |
| Catatan read-only / cakupan data | `Notice` (`@/components/page`) |
| Catat Payment | `Dialog` |
| Detail order dari tabel | halaman penuh (sejak spek 7.4 — dulu `Sheet`; tombol Ubah tersembunyi di dasar Sheet) |
| Form order studio/event, tambah/edit item katalog | halaman penuh, bukan modal (katalog sejak spek 7.2 — galeri foto dan varian tidak muat di dialog) |
| Kalender booking | `Calendar` |
| Pilih item di POS, pilih customer | `Command` (search-first) |
| Filter status, filter lini | `Select` / `Tabs` |
| Konfirmasi Batalkan Order / Hapus | `AlertDialog` |
| Feedback setelah simpan | `Sonner` (toast) |
| Peringatan basis kas, keterbatasan WhatsApp | `Alert` |
| Isi template, pesan blast, catatan | `Textarea` |
| Progres blast, bar margin per lini | `Progress` |
| Pilih tipe order, metode bayar, kanal kirim | `ToggleGroup` |
| Ikon | `lucide-react` |

Form order dibuat halaman penuh, bukan modal, karena punya banyak bagian (customer, item, jadwal, biaya) dan sering diisi bertahap — modal memaksa selesai sekali duduk dan gampang tertutup tidak sengaja.

Detail order dulu Sheet supaya owner bisa cepat buka-tutup beberapa order tanpa kehilangan posisi scroll; sejak spek 7.4 halaman penuh (lihat baris tabel di atas).

Not a blocker — approve dengan komentar kalau ada penyimpangan yang beralasan.

---

### Konvensi halaman

Primitif tata letak di `resources/js/components/page.tsx` (diadaptasi dari master-outlet). Page pass berikutnya menyusun setiap layar dari ini, bukan dari `div` bergaris buatan sendiri:

```tsx
<div className="flex flex-col gap-6 p-4 md:p-6">
  <PageHeader
    title="Pembayaran"
    description="Tagihan yang belum lunas, terlama di atas."
    meta={<Badge variant="warning">3 lewat tempo</Badge>}
    actions={<Button>Catat Bayar</Button>}
  />
  <Panel title="Rincian" aside="4 order" flush>
    <TabelData>…</TabelData>
  </Panel>
  <Notice>Basis kas: angka hanya menghitung uang yang sudah diterima.</Notice>
</div>
```

| Primitif | Pakai untuk | Aturan |
|---|---|---|
| `PageHeader` | judul halaman (satu-satunya `h1`), deskripsi singkat, `meta` (badge status/lini di samping judul), `actions` (tombol, turun ke bawah judul di layar sempit) | Halaman dengan PageHeader tidak lagi memakai `<h1 className="sr-only">`. Aksi utama pindah dari `<PageActions>` (portal ke header) ke `actions`; slot header dicabut setelah semua halaman pindah |
| `Panel` | setiap kelompok isi di atas kanvas: form section, ringkasan, tabel | `title` → `h2` di kepala panel bergaris bawah; `aside` untuk jumlah/tautan kecil di kanan; `flush` untuk tabel/daftar yang menempel ke tepi; tanpa `title`, beri `label` (jadi `aria-label` section). Ganti pola lama `rounded-lg border p-5` |
| `Notice` | strip petunjuk abu-abu: catatan read-only, cakupan data, alasan angka | bukan peringatan — yang menuntut perhatian tetap `Alert` |

Tabel tidak perlu dibungkus Panel kalau berdiri sendiri: `Table`/`TabelData` sudah panel putih. Di dalam `Panel flush`, tabel tetap rapi karena inset 6px-nya.

---

### R10 — Yang sengaja tidak dispesifikasi

Ditulis eksplisit supaya tidak ditambahkan "biar lengkap". Menuliskannya justru menambah noise dan bikin generator mengambil keputusan aneh di area yang default-nya sudah benar:

- Skala shadow — permukaan dibedakan lewat warna (panel putih di kanvas hangat), bukan elevasi; bayangan hanya pada overlay (popup, toast) dan tab aktif
- Timing dan easing animasi
- Breakpoint responsif — target desktop. Pengecualian (spek 4.6): **POS** di bawah `lg` (keranjang jadi Sheet bawah + tombol melayang) dan **Pembayaran** di bawah `md` (tabel jadi kartu, tombol 44 px). Layar lain boleh menggulir tabel ke samping
- Ilustrasi custom untuk empty state — ikon lucide cukup

---

## 4. Status Implementasi

Jalur Stitch **ditutup**. Hasilnya tidak bisa dipakai sebagai kode: tiap layar mengarang ulang Tailwind config sendiri (47–61 color key, berbeda-beda antar layar), namespace tokennya Material bukan shadcn, dan tiga aturan blocker di dokumen ini gagal secara merata — R3 badge "Belum Bayar" dirender empat cara di lima layar, R7 empty state ada di 1 dari 21 layar, R8 label grup sidebar nol dari 21. Mockup Stitch di `docs/stitch_design_system_generator/` tetap berguna sebagai **referensi layout**, bukan sumber kode.

Penggantinya ada di `web/` — React Router 7 (SPA) + shadcn preset `b311momZs0`, yaitu preset yang bagian 2 dokumen ini memang ditulis di atasnya. Tiga delta yang perlu ditambal setelah `init` persis tiga modifikasi yang sudah didokumentasikan di atas:

| Delta | Di preset | Tindakan |
|---|---|---|
| `chartColor: mist` | monokrom, chroma 0.007–0.021 | override `--chart-1..5` kategorikal (R6) |
| `success` / `warning` / `*-subtle` | tidak ada | tambah 10 token (R3) |
| `.dark --primary` | kontras 1.96 di atas `--card` | ganti ke `oklch(0.623 0.214 259.815)` |

Tiga blocker yang gagal di Stitch sekarang mustahil menyimpang per layar karena hanya punya satu definisi: R8 di `AppShell`, R3 di `BadgeStatusBayar`, R4/R7 di `TabelData` + `KosongTabel`.

> Catatan 17 Oktober 2026: tabel delta di atas menggambarkan preset lama dan prototipe `web/`. App Laravel kini memakai token bagian 2 (sistem master-outlet); prototipe `web/` tidak ikut diperbarui dan bukan lagi acuan visual.

**Checklist angka di [stitch-prompts.md](./stitch-prompts.md) bagian 6 dijalankan sebagai test**, bukan dicek mata — omzet Rp 5.790.000, piutang Rp 8.050.000 dari 4 order, laba bersih −Rp 2.894.950 (−Rp 2.104.500 sebelum alokasi dana maintenance, business-flow 8.2), margin per lini, kelompok umur piutang, produk terlaris. Seluruh rekap diturunkan dari satu daftar order di `web/app/lib/dummy.ts`, jadi angka yang tidak cocok antar layar tidak mungkin terjadi.

### Yang masih menunggu client

Tiga jawaban masih mengubah layar yang sudah jadi, dan ini alasan mockup dibangun sebelum spesifikasi difinalkan — bukan sesudah:

1. **Basis kas vs akrual** ([business-flow bagian 7](./business-flow.md)) — mengubah Laba Rugi dan KPI omzet Dashboard.
2. **Aturan DP** (persentase tetap vs nego per deal) — mengubah Form Order dan badge DP.
3. **Status crew** (freelance vs tetap) — menentukan biaya masuk BiayaJob atau BiayaOperasional, mengubah Margin per Lini.
