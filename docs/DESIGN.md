# DESIGN.md — Sistem Desain ERP Photo Studio

Dokumen: 26 Agustus 2026
Basis: shadcn/ui + Tailwind, target **web desktop**, bahasa UI **Indonesia**
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

Basis dari theme shadcn yang dipilih, dengan tiga penambahan yang dijelaskan di R3 dan R6.

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

  /* TAMBAHAN — status semantik (lihat R3) */
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

  /* DIGANTI — chart kategorikal, bukan monokrom (lihat R6) */
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

  /* DIGANTI dari oklch(0.424 0.199 265.638) — nilai lama kontrasnya
     hanya 1.96 di atas --card, jadi teks/link/garis chart tidak terbaca.
     Disamakan dengan --sidebar-primary supaya sidebar & konten konsisten. */
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

  /* --chart-1..5 sengaja tidak di-override: kelima warna sudah lolos
     kontras >= 3.0 terhadap --background terang maupun --card gelap. */

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

### Peta pemakaian token

| Kebutuhan | Token |
|---|---|
| Aksi utama (Simpan, Bayar, Buat Order) | `--primary` |
| Aksi sekunder (Batal, Kembali) | `--secondary` / ghost |
| Aksi merusak (Hapus, Batalkan Order) | `--destructive` |
| Lunas, Laba, tren naik yang bagus | `--success` |
| DP/Sebagian, jatuh tempo dekat, perlu perhatian | `--warning` |
| Belum Bayar, Batal, Rugi, lewat jatuh tempo | `--destructive` |
| Label kolom, hint, metadata, satuan | `--muted-foreground` |
| Garis tabel, pemisah section | `--border` |

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

### R2 — Tipografi: satu sans, satu mono, angka wajib tabular

```
Sans    : DM Sans        (dari preset shadcn b311momZs0)
Heading : Outfit         (dari preset)
Mono    : JetBrains Mono (ditambah manual) — nomor invoice, ID order, kolom uang
```

Sans dan heading mengikuti preset, bukan Inter seperti rancangan awal: preset yang jadi sumber kebenaran token, dan mengubah fontnya berarti menyimpang dari sistem desain yang justru dipilih supaya konsisten. Mono tidak ada di preset mana pun sehingga ditambahkan sebagai dependency terpisah.

| Peran | Ukuran / Berat | Catatan |
|---|---|---|
| Judul halaman | 24px / 600 | |
| Angka KPI dashboard | 30px / 600 | tabular-nums |
| Judul card / section | 16px / 600 | |
| Body & isi cell tabel | 14px / 400 | |
| Header kolom tabel | 12px / 500 | `--muted-foreground`, bukan uppercase |
| Label form, hint, caption | 12px / 500 | |

**Setiap angka uang, kuantitas, persen, dan tanggal wajib `font-variant-numeric: tabular-nums`.** Font proporsional memberi lebar berbeda tiap digit — angka `1` jauh lebih sempit dari `8`. Di kolom Rp yang rata kanan, ini bikin digit tidak sejajar antar baris, dan owner kehilangan kemampuan scan cepat "mana tagihan paling besar". Layar piutang adalah layar yang paling sering dibuka (business-flow 5.4), jadi ini bukan detail kosmetik.

```tsx
// ❌ Salah — kolom Rp zigzag
<td className="text-right">{formatRp(order.total)}</td>

// ✅ Benar — mono sudah tabular secara bawaan
<td className="text-right font-mono">{formatRp(order.total)}</td>
```

**Gotcha yang menentukan cara memenuhi aturan ini.** `tabular-nums` itu `font-variant-numeric`, dan kalau font yang aktif tidak punya fitur OpenType `tnum`, browser **diam-diam mengabaikannya tanpa error**. Kolom Rp balik zigzag dan tidak ada yang memberi tahu. Karena itu kolom uang dan angka KPI memakai **mono** — lebar digitnya sama secara bawaan, jadi tidak bergantung pada fitur font yang mungkin tidak ada. `tabular-nums` boleh dipakai sebagai tambahan, tapi tidak boleh jadi satu-satunya andalan.

Ini **blocker** untuk semua kolom numerik di tabel dan semua angka KPI.

Radius `--radius` bernilai `0.875rem` (14px). Nilai itu pas untuk card dan dialog, tapi terlalu bulat untuk elemen kecil di layar padat. Badge, input di dalam tabel, dan chip filter di-override ke `rounded-md`. Not a blocker — approve dengan komentar kalau terlewat.

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
| Belum Bayar | `--destructive-subtle` | `--destructive-subtle-foreground` | 5.60 / 6.77 |
| DP / Sebagian | `--warning-subtle` | `--warning-subtle-foreground` | 5.99 / 8.32 |
| Lunas | `--success-subtle` | `--success-subtle-foreground` | 5.63 / 7.86 |

(kontras light / dark, keduanya lolos WCAG AA 4.5)

Badge DP menampilkan persentasenya: `DP 40%`, bukan `DP` saja. Angka itu yang menentukan apakah tagihan perlu dikejar sekarang atau bisa nanti.

**Setiap layar yang menampilkan indikator progres wajib punya legenda** — tooltip di header kolom atau baris kecil di bawah tabel. Notasi titik tidak menjelaskan dirinya sendiri, dan owner tidak boleh perlu menghafal urutan 5 status.

Ini **blocker** — badge status muncul di Dashboard, Order List, Kalender, Piutang, dan Customer Detail. Kalau tidak seragam, setiap layar jadi bahasa sendiri.

> Catatan dark mode: tint badge (`*-subtle`) hanya berbeda 1.24–1.26 dari `--card`. Ini disengaja — yang bekerja adalah warna teksnya. Badge netral bahkan hanya 1.17, memang dimaksudkan mundur ke belakang.

---

### R4 — Density tabel

Default generator UI cenderung lega — padding besar, baris tinggi. Pada ERP itu artinya satu layar hanya memuat 5–6 baris order, dan owner scroll terus untuk pekerjaan yang seharusnya sekali lihat.

| Elemen | Nilai |
|---|---|
| Tinggi baris tabel | 44px |
| Padding cell | 12px horizontal, 10px vertikal |
| Tinggi header tabel | 40px, sticky saat scroll |
| Padding card | 20px |
| Jarak antar section | 24px |
| Padding konten halaman | 24px |

Kolom uang **rata kanan**, kolom teks rata kiri, kolom status rata kiri. Tabel tidak dibatasi max-width — pakai lebar layar penuh.

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
| Sidebar | 256px, collapsed 64px, `--sidebar`, ikon + label |
| Header | 56px, sticky, berisi breadcrumb kiri + aksi utama halaman kanan |
| Konten | padding 24px, lebar penuh (tanpa max-width) |
| Focus ring | `--ring`, 2px, offset 2px |

Sepuluh module tidak muat sebagai daftar rata — pada 10 item, mata kehilangan tempat dan setiap navigasi jadi pencarian. Dikelompokkan jadi tiga, dipisah garis `--sidebar-border` dengan label grup 11px/500 `--muted-foreground`. Urutan di dalam grup mengikuti frekuensi pakai harian, bukan nomor module di business-flow bagian 6:

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
| KPI dashboard | `Card` |
| Catat Payment | `Dialog` |
| Detail order dari tabel | `Sheet` (slide kanan) |
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

Detail order pakai Sheet, bukan halaman, supaya owner bisa cepat buka-tutup beberapa order berurutan tanpa kehilangan posisi scroll dan filter di tabel.

Not a blocker — approve dengan komentar kalau ada penyimpangan yang beralasan.

---

### R10 — Yang sengaja tidak dispesifikasi

Ditulis eksplisit supaya tidak ditambahkan "biar lengkap". Menuliskannya justru menambah noise dan bikin generator mengambil keputusan aneh di area yang default-nya sudah benar:

- Skala shadow — shadcn berbasis border, bukan elevasi
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

**Checklist angka di [stitch-prompts.md](./stitch-prompts.md) bagian 6 dijalankan sebagai test**, bukan dicek mata — omzet Rp 5.790.000, piutang Rp 8.050.000 dari 4 order, laba bersih −Rp 2.894.950 (−Rp 2.104.500 sebelum alokasi dana maintenance, business-flow 8.2), margin per lini, kelompok umur piutang, produk terlaris. Seluruh rekap diturunkan dari satu daftar order di `web/app/lib/dummy.ts`, jadi angka yang tidak cocok antar layar tidak mungkin terjadi.

### Yang masih menunggu client

Tiga jawaban masih mengubah layar yang sudah jadi, dan ini alasan mockup dibangun sebelum spesifikasi difinalkan — bukan sesudah:

1. **Basis kas vs akrual** ([business-flow bagian 7](./business-flow.md)) — mengubah Laba Rugi dan KPI omzet Dashboard.
2. **Aturan DP** (persentase tetap vs nego per deal) — mengubah Form Order dan badge DP.
3. **Status crew** (freelance vs tetap) — menentukan biaya masuk BiayaJob atau BiayaOperasional, mengubah Margin per Lini.
