# Prompt Stitch — Per Layar

Dokumen: 26 Agustus 2026
Scope: **seluruh 10 module** dari [business-flow.md](./business-flow.md) bagian 6 — 22 layar
Prasyarat: [DESIGN.md](./DESIGN.md) sudah dipasang di project Stitch

---

## 1. Cara Pakai

Setiap layar = satu prompt. Susunannya: **preamble** (bagian 2) + **data contoh** yang relevan (bagian 3) + **prompt layar** (bagian 4). Tempel ketiganya sekaligus.

Urutan generate mengikuti ketergantungan data, bukan urutan menu — Katalog dulu karena POS dan Order tidak bisa didesain tanpa tahu bentuk itemnya. Empat kelompok, sesuai urutan pengerjaan di business-flow bagian 6:

| Kelompok | Layar | Prompt |
|---|---|---|
| Fondasi | Katalog, Customer, Order, Pembayaran, Biaya | 4.1 – 4.11 |
| Dipakai harian | POS, Dashboard | 4.12 – 4.13 |
| Menghadap customer | Invoice, Komunikasi | 4.14 – 4.18 |
| Hasil | Laporan | 4.19 – 4.22 |

> Generate 2–3 layar pertama, cek konsistensi badge dan density, baru lanjut. Membetulkan aturan sekarang jauh lebih murah daripada meregenerate 22 layar.

---

## 2. Preamble

Tempel di awal **setiap** prompt.

```
Web desktop ERP untuk photo studio. Satu pengguna: owner. Bahasa UI: Indonesia.
Ikuti DESIGN.md untuk semua token warna, tipografi, dan spasi.

Wajib:
- Font Inter, mono JetBrains Mono untuk nomor order/invoice
- Semua angka (uang, qty, persen, tanggal) pakai tabular-nums
- Tinggi baris tabel 44px, padding cell 12px horizontal 10px vertikal
- Header tabel 40px sticky, teks 12px/500 --muted-foreground, bukan uppercase
- Sidebar 256px, header sticky 56px, padding konten 24px, tabel lebar penuh
- Ikon lucide-react, badge dan input dalam tabel pakai rounded-md
- Kolom uang rata kanan, kolom teks dan status rata kiri

Sidebar (item aktif pakai --sidebar-primary), 3 grup dipisah garis --sidebar-border
dengan label grup 11px/500 --muted-foreground:
  HARIAN : Dashboard · POS · Order & Booking · Pembayaran
  DATA   : Customer · Katalog · Biaya
  KELUARAN: Invoice · Komunikasi · Laporan

Format angka: "Rp 1.250.000" (titik ribuan, tanpa desimal, tidak disingkat).
Negatif "−Rp 250.000" warna --destructive. Nol "Rp 0" warna --muted-foreground.
Tanggal "26 Agu 2026". Dengan jam "26 Agu 2026, 14:00". Rentang "12–14 Sep 2026".

Status kerja = netral, 5 titik progres horizontal 6px, titik aktif --foreground,
titik sisa --border, label teks --muted-foreground di sebelah kanan titik:
  ●○○○○ Booking · ●●○○○ Dijadwalkan · ●●●○○ Dikerjakan
  ●●●●○ Selesai Dikerjakan · ●●●●● Diserahkan (label --success)
  ✕ Batal (label --destructive, seluruh baris opacity 60%)

Status bayar = badge tint berwarna:
  Belum Bayar → bg --destructive-subtle, teks --destructive-subtle-foreground
  DP 40%      → bg --warning-subtle, teks --warning-subtle-foreground
  Lunas       → bg --success-subtle, teks --success-subtle-foreground
Badge DP selalu menampilkan persentasenya, bukan "DP" saja.
```

---

## 3. Data Contoh Bersama

Satu dataset dipakai di semua layar supaya hasilnya terasa satu aplikasi, bukan 13 mockup terpisah. **Hari ini di mockup = 26 Agustus 2026.**

Angkanya sengaja kecil — bisnis baru jalan sebulan, < 10 transaksi/hari. Tabel yang dipenuhi 50 baris dummy akan menyembunyikan masalah density yang justru mau diuji.

**Katalog — Produk** (punya HPP)

| Nama | Harga | HPP |
|---|---|---|
| Keychain Foto Akrilik | Rp 25.000 | Rp 8.000 |
| Cetak 4R | Rp 5.000 | Rp 1.500 |
| Photostrip 3 Pose | Rp 20.000 | Rp 6.000 |
| Cetak 10R + Bingkai | Rp 85.000 | Rp 32.000 |
| Album Mini 20 Halaman | Rp 175.000 | Rp 70.000 |

**Katalog — Jasa** (HPP dicatat per job)

| Nama | Harga |
|---|---|
| Paket Studio 1 Jam | Rp 350.000 |
| Paket Studio Keluarga 2 Jam | Rp 650.000 |
| Add-on Editing Lanjutan | Rp 150.000 |
| Paket Prewedding Outdoor | Rp 2.500.000 |
| Paket Wedding Full Day | Rp 8.500.000 |

**Customer**

| Nama | HP | Sumber |
|---|---|---|
| Sinta Prameswari | 0812-3344-5566 | Instagram |
| Budi Hartono | 0813-2211-9087 | Teman |
| Rani & Dimas | 0857-8899-1200 | Instagram |
| Nadia Salsabila | 0896-1122-8899 | Instagram |
| Yoga Pratama | 0821-7766-3344 | Lewat depan studio |
| Dewi Anggraini | 0878-4455-2211 | Teman |
| Fajar Nugroho | 0819-6633-7788 | Instagram |
| Umum | — | — |

**Order**

| No | Customer | Tipe | Item | Tanggal | Status Kerja | Total | Dibayar | Status Bayar |
|---|---|---|---|---|---|---|---|---|
| ORD-0012 | Sinta Prameswari | Studio | Paket Studio 1 Jam | 26 Agu 2026, 14:00 | Dikerjakan | Rp 350.000 | Rp 150.000 | DP 43% |
| ORD-0011 | Rani & Dimas | Event | Paket Wedding Full Day | 18 Okt 2026 | Dijadwalkan | Rp 8.500.000 | Rp 2.500.000 | DP 29% |
| ORD-0010 | Umum | Retail | Keychain ×2, Cetak 4R ×6 | 26 Agu 2026 | Diserahkan | Rp 80.000 | Rp 80.000 | Lunas |
| ORD-0009 | Budi Hartono | Studio | Paket Studio Keluarga 2 Jam | 24 Agu 2026 | Diserahkan | Rp 650.000 | Rp 650.000 | Lunas |
| ORD-0008 | Nadia Salsabila | Event | Paket Prewedding Outdoor | 12 Agu 2026 | Selesai Dikerjakan | Rp 2.500.000 | Rp 1.000.000 | DP 40% |
| ORD-0007 | Yoga Pratama | Studio | Paket Studio 1 Jam | 21 Agu 2026 | Diserahkan | Rp 350.000 | Rp 350.000 | Lunas |
| ORD-0006 | Umum | Retail | Cetak 10R + Bingkai ×1 | 20 Agu 2026 | Diserahkan | Rp 85.000 | Rp 85.000 | Lunas |
| ORD-0005 | Dewi Anggraini | Studio | Paket Studio 1 Jam | 29 Agu 2026, 10:00 | Booking | Rp 350.000 | Rp 0 | Belum Bayar |
| ORD-0004 | Fajar Nugroho | Event | Paket Prewedding Outdoor | 15 Agu 2026 | Batal | Rp 2.500.000 | Rp 500.000 | DP 20% |
| ORD-0003 | Umum | Retail | Photostrip ×4 | 19 Agu 2026 | Diserahkan | Rp 80.000 | Rp 80.000 | Lunas |
| ORD-0002 | Sinta Prameswari | Retail | Cetak 4R ×9 | 18 Agu 2026 | Diserahkan | Rp 45.000 | Rp 45.000 | Lunas |
| ORD-0001 | Budi Hartono | Studio | Paket Studio 1 Jam | 15 Agu 2026 | Diserahkan | Rp 350.000 | Rp 350.000 | Lunas |

Dataset ini sengaja memuat keenam status kerja dan ketiga status bayar, plus dua customer berulang (Sinta, Budi) untuk layar Customer Detail, dan satu order Batal ber-DP untuk menguji perlakuan DP hangus.

**Rekap Agustus 2026** (basis kas)

| | Nilai |
|---|---|
| Omzet diterima | Rp 5.790.000 |
| — Retail | Rp 290.000 |
| — Studio | Rp 1.500.000 |
| — Event | Rp 4.000.000 |
| Piutang berjalan | Rp 8.050.000 dari 4 order |
| Booking hari ini | 1 |
| Biaya operasional | Rp 4.800.000 |

**Laba rugi Agustus 2026** — dipakai layar 4.19, semua angka turunan dari tabel Order dan Biaya di atas

```
OMZET
   Retail                    Rp 290.000
   Studio                  Rp 1.500.000
   Event                   Rp 4.000.000
 = Total Omzet             Rp 5.790.000

BIAYA LANGSUNG
   HPP bahan produk           Rp 94.500
   Biaya job               Rp 3.000.000
 = Total Biaya Langsung    Rp 3.094.500

LABA KOTOR                 Rp 2.695.500   (47%)

BIAYA OPERASIONAL
   Sewa tempat             Rp 3.500.000
   Utilitas                  Rp 800.000
   Marketing                 Rp 500.000
 = Total Biaya Operasional Rp 4.800.000

LABA BERSIH               −Rp 2.104.500   RUGI
```

**Margin per lini Agustus 2026** — dipakai layar 4.20

| Lini | Omzet | Share | Biaya Langsung | Margin | % |
|---|---|---|---|---|---|
| Retail | Rp 290.000 | 5% | Rp 94.500 | Rp 195.500 | 67% |
| Studio | Rp 1.500.000 | 26% | Rp 200.000 | Rp 1.300.000 | 87% |
| Event | Rp 4.000.000 | 69% | Rp 2.800.000 | Rp 1.200.000 | 30% |
| **Total** | **Rp 5.790.000** | 100% | **Rp 3.094.500** | **Rp 2.695.500** | **47%** |

Angka ini sengaja disusun begini: **Event menyumbang 69% omzet tapi marginnya paling tipis (30%), Retail cuma 5% omzet tapi marginnya 67%.** Itu persis temuan yang business-flow bagian 7 sebut sebagai alasan tabel ini ada. Kalau desain layar 4.20 tidak membuat kontras itu langsung kelihatan, desainnya gagal — sekalipun rapi.

**Produk terlaris Agustus 2026** — dipakai layar 4.21

| Produk | Qty | Omzet | HPP | Margin | % |
|---|---|---|---|---|---|
| Cetak 4R | 15 | Rp 75.000 | Rp 22.500 | Rp 52.500 | 70% |
| Photostrip 3 Pose | 4 | Rp 80.000 | Rp 24.000 | Rp 56.000 | 70% |
| Keychain Foto Akrilik | 2 | Rp 50.000 | Rp 16.000 | Rp 34.000 | 68% |
| Cetak 10R + Bingkai | 1 | Rp 85.000 | Rp 32.000 | Rp 53.000 | 62% |
| Album Mini 20 Halaman | 0 | Rp 0 | Rp 0 | Rp 0 | — |
| **Total** | **22** | **Rp 290.000** | **Rp 94.500** | **Rp 195.500** | **67%** |

**Jasa terlaris Agustus 2026** (order Batal tidak dihitung)

| Jasa | Order | Nilai |
|---|---|---|
| Paket Wedding Full Day | 1 | Rp 8.500.000 |
| Paket Prewedding Outdoor | 1 | Rp 2.500.000 |
| Paket Studio 1 Jam | 4 | Rp 1.400.000 |
| Paket Studio Keluarga 2 Jam | 1 | Rp 650.000 |

**Customer teratas Agustus 2026** (nilai order, Batal tidak dihitung)

| Customer | Order | Nilai Order | Sudah Dibayar |
|---|---|---|---|
| Rani & Dimas | 1 | Rp 8.500.000 | Rp 2.500.000 |
| Nadia Salsabila | 1 | Rp 2.500.000 | Rp 1.000.000 |
| Budi Hartono | 2 | Rp 1.000.000 | Rp 1.000.000 |
| Sinta Prameswari | 2 | Rp 395.000 | Rp 195.000 |
| Yoga Pratama | 1 | Rp 350.000 | Rp 350.000 |
| Dewi Anggraini | 1 | Rp 350.000 | Rp 0 |

Kolom "Sudah Dibayar" sengaja ada di sebelah "Nilai Order" — di basis kas, customer dengan nilai order terbesar belum tentu yang paling banyak menyetor uang. Rani & Dimas nomor satu di nilai, tapi baru menyetor 29%.

**Umur piutang Agustus 2026** — dipakai layar 4.22

| Kelompok umur | Nilai | Order | Share |
|---|---|---|---|
| Belum jatuh tempo | Rp 6.550.000 | 3 | 81% |
| 1–30 hari | Rp 1.500.000 | 1 | 19% |
| 31–60 hari | Rp 0 | 0 | 0% |
| > 60 hari | Rp 0 | 0 | 0% |
| **Total** | **Rp 8.050.000** | **4** | 100% |

Order yang jatuh tempo tepat hari ini dihitung **belum** lewat, supaya angka "sudah jatuh tempo" di sini (Rp 1.500.000, 1 order) sama persis dengan kartu "Lewat Jatuh Tempo" di layar 4.9.

| Rincian | Sisa | Share | Umur |
|---|---|---|---|
| Rani & Dimas — ORD-0011, Event | Rp 6.000.000 | 75% | 53 hari lagi |
| Nadia Salsabila — ORD-0008, Event | Rp 1.500.000 | 19% | lewat 14 hari |
| Dewi Anggraini — ORD-0005, Studio | Rp 350.000 | 4% | 3 hari lagi |
| Sinta Prameswari — ORD-0012, Studio | Rp 200.000 | 2% | jatuh tempo hari ini |

Per lini: Event Rp 7.500.000 (93%) · Studio Rp 550.000 (7%) · Retail Rp 0.

Tiga angka yang jadi inti layar 4.22: **piutang Rp 8.050.000 setara 139% omzet Agustus** — lebih banyak uang menggantung daripada yang masuk sepanjang bulan; **93% piutang ada di lini Event**; dan **75% menumpuk pada satu customer**. Ketiganya risiko nyata yang tidak kelihatan di layar 4.9, karena di sana keempat tagihan itu tampil sebagai baris yang setara.

---

## 4. Prompt Per Layar

### 4.1 Katalog — Daftar

Digenerate pertama: POS, Order, dan Dashboard semua merujuk bentuk item di sini.

```
Halaman "Katalog". Header: judul kiri, tombol primary "Tambah Item" kanan.

Di bawah header: Tabs "Semua (10)" · "Produk (5)" · "Jasa (5)", tab Produk aktif.
Sebaris dengan tabs, rata kanan: input search "Cari item…" (ikon search, 280px)
dan Select "Semua status" (Aktif / Nonaktif).

Tabel, kolom:
  Nama Item        teks, tebal 500
  Jenis            badge outline "Produk" atau "Jasa", netral
  Harga Jual       rata kanan
  HPP Bahan        rata kanan; untuk baris Jasa isi "—" warna --muted-foreground
  Margin           rata kanan, persen; hijau --success kalau >= 50%, netral kalau
                   di bawah; untuk Jasa isi "—"
  Status           Switch kecil, aktif semua
  (aksi)           ikon titik tiga, DropdownMenu: Edit · Duplikat · Nonaktifkan

Isi dengan 10 item katalog dari data contoh, produk dulu baru jasa.

Kolom HPP dan Margin diisi "—" untuk Jasa karena HPP jasa tidak tetap dan dicatat
per job, bukan di katalog. Beri tooltip ikon info di header kolom HPP Bahan yang
menjelaskan itu.

Footer tabel: "10 item" kiri, pagination kanan.
```

**Catatan.** Kolom Margin bukan input — dihitung dari harga dan HPP. Itu yang bikin owner sadar produk mana yang sebenarnya tipis, sesuai business-flow bagian 7.

---

### 4.2 Katalog — Dialog Tambah Item

```
Dialog "Tambah Item Katalog" di atas halaman Katalog yang di-dim.
Lebar 520px, radius mengikuti --radius.

Isi form, dari atas:
  Toggle group 2 pilihan: "Produk" | "Jasa". Produk terpilih.
  Nama Item          input teks, placeholder "Keychain Foto Akrilik"
  Kategori           Select: Cetak · Merchandise · Paket Studio · Paket Event · Add-on
  Harga Jual         input dengan prefix "Rp", rata kanan, tabular-nums
  HPP Bahan / unit   input dengan prefix "Rp", rata kanan, tabular-nums
                     hint di bawah: "Biaya bahan per satu unit. Dipakai menghitung
                     margin dan laba rugi."
  Margin             baris read-only, bukan input: "Rp 17.000 (68%)" warna --success
  Catatan            textarea 2 baris, opsional
  Switch "Aktif"     nyala

Footer: "Batal" ghost kiri, "Simpan" primary kanan.

Tampilkan juga varian saat "Jasa" dipilih: field HPP Bahan dan Margin hilang,
diganti satu baris info kecil dengan ikon info dan teks --muted-foreground:
"Biaya jasa dicatat per order lewat Biaya Job, bukan di katalog."
```

---

### 4.3 Customer — Daftar

```
Halaman "Customer". Header: judul kiri, tombol primary "Tambah Customer" kanan.

Baris filter: search "Cari nama atau nomor HP…" kiri; rata kanan tiga Select —
"Semua sumber", "Semua lini", "Semua waktu".

Tabel, kolom:
  Nama             teks tebal 500 + avatar inisial 28px bulat, bg --muted
  No HP            mono JetBrains, dengan ikon WhatsApp kecil yang bisa diklik
  Sumber           badge outline netral: Instagram / Teman / Lewat depan studio
  Lini Dibeli      chip kecil netral, bisa lebih dari satu: Retail · Studio · Event
  Order            rata kanan, angka
  Total Belanja    rata kanan
  Transaksi Terakhir  "26 Agu 2026" + baris kedua kecil --muted-foreground "hari ini"
                      atau "8 hari lalu"
  (aksi)           titik tiga: Lihat Detail · Edit · Kirim WhatsApp

Isi 7 customer dari data contoh, urut transaksi terakhir terbaru di atas.
Sinta Prameswari: 2 order, Rp 395.000, lini Retail + Studio.
Budi Hartono: 2 order, Rp 1.000.000, lini Studio.
Jangan tampilkan baris "Umum".

Footer: "7 customer" kiri, pagination kanan.
```

**Catatan.** "Umum" adalah penampung transaksi retail tanpa identitas (business-flow 5.1), bukan customer sungguhan — jangan ikut di daftar CRM, nanti mengotori basis blast.

---

### 4.4 Customer — Detail

```
Halaman detail customer "Sinta Prameswari".
Breadcrumb: Customer › Sinta Prameswari. Aksi kanan: "Kirim WhatsApp" outline,
"Edit" outline, "Buat Order" primary.

Layout dua kolom, kiri 320px fixed, kanan sisanya.

Kolom kiri — Card profil:
  Avatar inisial 56px, nama 18px/600, badge sumber "Instagram" di bawahnya.
  Daftar field label-value vertikal: No HP (mono, ikon WhatsApp),
  Email, Customer sejak "18 Agu 2026", Terakhir di-blast "Belum pernah"
  (warna --muted-foreground).
  Pemisah, lalu Catatan: "Suka konsep clean, minta hasil dikirim via Drive."

Kolom kanan — tiga stat kecil sebaris dulu:
  Total Order 2 · Total Belanja Rp 395.000 · Rata-rata Rp 197.500
  Angka 24px/600 tabular-nums, label 12px --muted-foreground di bawahnya.

Di bawahnya Card "Riwayat Order" berisi tabel:
  No Order (mono, link) · Tipe (badge outline) · Tanggal · Total (rata kanan)
  · Status Kerja (titik progres) · Status Bayar (badge)
  Baris: ORD-0012 Studio 26 Agu 2026 Rp 350.000 ●●●○○ Dikerjakan / DP 43%
         ORD-0002 Retail 18 Agu 2026 Rp 45.000 ●●●●● Diserahkan / Lunas
```

---

### 4.5 Order & Booking — Daftar

Layar paling padat. Kalau density-nya benar di sini, layar lain aman.

```
Halaman "Order & Booking". Header: judul kiri; kanan toggle view ikon
[daftar | kalender] dengan daftar aktif, lalu tombol primary "Buat Order".

Baris filter: search "Cari no order atau customer…" kiri.
Kanan: Select "Semua tipe" (Retail/Studio/Event), Select "Semua status kerja",
Select "Semua status bayar", date range picker "Agustus 2026".

Di bawah filter, 4 chip filter cepat sebagai Tabs:
  "Semua (12)" · "Perlu Ditindaklanjuti (4)" · "Berjalan (4)" · "Selesai (7)"
Tab Semua aktif.
(Berjalan = Booking/Dijadwalkan/Dikerjakan/Selesai Dikerjakan. Selesai = Diserahkan.
 Satu order Batal tidak masuk tab mana pun selain Semua.)

Tabel, kolom:
  No Order      mono JetBrains, link, 12px
  Customer      teks 500; kalau "Umum" pakai --muted-foreground italic
  Tipe          badge outline netral
  Item          satu baris terpotong ellipsis; kalau > 1 item tambahkan
                "+2" chip kecil di ujung
  Jadwal        tanggal; baris kedua kecil --muted-foreground berisi jam untuk
                studio, atau "dalam 53 hari" untuk event mendatang
  Total         rata kanan
  Dibayar       rata kanan, --muted-foreground
  Status Kerja  titik progres + label
  Status Bayar  badge
  (aksi)        titik tiga

Isi 12 order dari data contoh, terbaru di atas.
Baris ORD-0004 (Batal): seluruh baris opacity 60%.
Baris ORD-0012 dan ORD-0010 (hari ini): garis kiri 2px --primary sebagai penanda.

Footer: "12 order" kiri, pagination kanan.

Di bawah tabel, satu baris legenda 12px --muted-foreground:
"●○○○○ Booking · ●●○○○ Dijadwalkan · ●●●○○ Dikerjakan · ●●●●○ Selesai Dikerjakan
 · ●●●●● Diserahkan"
```

**Catatan.** Legenda itu wajib (DESIGN.md R3). Notasi titik tidak menjelaskan dirinya sendiri dan owner tidak boleh perlu menghafal urutan 5 status.

---

### 4.6 Order — Form Buat Order

Halaman penuh, bukan modal — diisi bertahap, sering ditinggal setengah jalan.

```
Halaman "Buat Order". Breadcrumb: Order & Booking › Buat Order.
Kanan header: "Batal" ghost, "Simpan sebagai Booking" outline, "Simpan" primary.

Paling atas, toggle group 3 pilihan lebar penuh, tinggi 56px, masing-masing
dengan ikon lucide + label + subteks kecil:
  Retail (shopping-bag) "Barang dibawa pulang"
  Studio (camera) "Sesi terjadwal di studio"   ← terpilih
  Event  (map-pin) "Wedding, prewedding"

Di bawahnya dua kolom, kiri 1fr, kanan 380px.

KIRI — tiga Card bertumpuk:

Card "Customer"
  Command combobox search "Cari nama atau no HP…", terpilih "Sinta Prameswari".
  Di bawahnya kartu ringkas terpilih: avatar inisial, nama, no HP mono,
  badge "2 order sebelumnya", ikon X untuk melepas.
  Link teks kecil di kanan: "+ Customer baru".

Card "Item"
  Tabel editable, kolom: Item (combobox) · Qty (stepper 72px) ·
  Harga Satuan (input Rp, rata kanan) · Subtotal (teks rata kanan) · ikon hapus.
  Satu baris terisi: Paket Studio 1 Jam / 1 / Rp 350.000 / Rp 350.000
  Baris kosong berikutnya dengan placeholder "Tambah item…".
  Link "+ Tambah item" di bawah tabel.

Card "Jadwal"
  Dua kolom: Tanggal (date picker, "26 Agu 2026") dan Jam Mulai (time, "14:00").
  Durasi Select "1 jam". Lokasi input teks, terisi "Studio".

KANAN — Card sticky "Ringkasan":
  Baris label-value: Subtotal Rp 350.000
  Diskon: input Rp kecil rata kanan, terisi Rp 0
  Pemisah, lalu Total 20px/600 tabular-nums Rp 350.000
  Pemisah, lalu bagian "Pembayaran Awal" — Select metode
  (Tunai / Transfer / QRIS) dan input Rp "150.000".
  Baris hasil: "Sisa tagihan Rp 200.000" warna --warning.
  Preview badge status bayar "DP 43%".
  Textarea "Catatan" 3 baris, opsional.

Tampilkan juga varian saat tipe "Retail" dipilih: Card "Jadwal" hilang seluruhnya,
dan di Card Customer muncul checkbox "Tanpa customer (Umum)" dalam keadaan
tercentang, combobox jadi disabled.
```

**Catatan.** Checkbox "Tanpa customer" default tercentang di Retail itu disengaja — business-flow 5.1 menegaskan mewajibkan customer di flow retail adalah cara tercepat bikin owner malas pakai app.

---

### 4.7 Order — Detail (Sheet)

```
Sheet slide dari kanan, lebar 640px, di atas halaman Order & Booking yang di-dim.

Header sheet: "ORD-0012" mono 12px --muted-foreground di baris atas,
"Paket Studio 1 Jam" 20px/600 di bawahnya. Tombol X kanan atas.
Sebaris di bawah judul: badge tipe "Studio" + badge bayar "DP 43%".

Di bawah header, stepper horizontal 5 langkah lebar penuh menampilkan status
kerja: Booking · Dijadwalkan · Dikerjakan · Selesai Dikerjakan · Diserahkan.
Langkah 1–3 terisi --foreground, 4–5 kosong --border, "Dikerjakan" jadi
langkah aktif dengan label tebal. Di bawah stepper, tombol lebar penuh outline
"Tandai Selesai Dikerjakan".

Isi sheet, bagian bertumpuk dipisah garis --border:

"Customer" — avatar inisial, nama Sinta Prameswari, no HP mono dengan ikon
WhatsApp, link kecil "Lihat profil".

"Jadwal" — 26 Agu 2026, 14:00 · 1 jam · Studio. Ikon calendar.

"Item" — tabel ringkas 3 kolom: Item · Qty · Subtotal.
Satu baris Paket Studio 1 Jam / 1 / Rp 350.000.
Baris total di bawah pemisah: Total Rp 350.000, tebal.

"Pembayaran" — header bagian dengan tombol kecil outline "+ Catat Pembayaran"
di kanan. Daftar payment sebagai list, tiap baris: tanggal kiri,
metode badge outline di tengah, nominal rata kanan.
  26 Agu 2026 · Transfer · Rp 150.000 · keterangan "DP"
Di bawahnya dua baris ringkas: "Total dibayar Rp 150.000" dan
"Sisa tagihan Rp 200.000" warna --warning tebal.

"Biaya Job" — header dengan tombol kecil outline "+ Tambah Biaya".
Kosong, tampilkan empty state inline satu baris: ikon receipt kecil dan teks
--muted-foreground "Belum ada biaya langsung untuk order ini."

"Hasil Foto" — input teks berisi placeholder "Tempel link Google Drive…"
dengan tombol "Simpan" kecil di sebelahnya. Disabled, dengan hint
--muted-foreground: "Bisa diisi setelah status Selesai Dikerjakan."

"Catatan" — teks --muted-foreground.

Footer sheet sticky: "Batalkan Order" ghost warna --destructive kiri,
"Edit" outline kanan.
```

**Catatan.** Field Hasil Foto sengaja disabled sampai status Selesai Dikerjakan — mencegah link ditempel sebelum hasilnya ada, yang bikin Thank You mail terkirim ke folder kosong.

---

### 4.8 Kalender Booking

```
Halaman "Order & Booking" dengan toggle view di posisi kalender.
Header sama seperti 4.5, tapi ikon kalender yang aktif.

Baris kontrol di bawah header: panah kiri, "Agustus 2026" 18px/600, panah kanan,
tombol outline kecil "Hari ini". Rata kanan: toggle Bulan | Minggu, Bulan aktif.

Grid kalender bulanan 7 kolom. Header hari Sen–Min, 12px/500 --muted-foreground.
Tinggi sel 120px, border --border 1px, tanggal di pojok kiri atas 13px.
Sel di luar bulan berjalan pakai --muted-foreground dan bg --muted.
Sel 26 Agustus (hari ini): border 2px --primary, angka tanggal dalam lingkaran
--primary dengan teks --primary-foreground.

Event di dalam sel = chip tinggi 22px, radius rounded-md, teks 12px terpotong,
diberi garis kiri 3px berwarna sesuai tipe: Retail --chart-1, Studio --chart-2,
Event --chart-3. Isi chip: jam + nama customer, contoh "14:00 Sinta P.".

Isi kalender:
  15 Agu — chip Studio "Budi Hartono" (Diserahkan, opacity 60%)
  15 Agu — chip Event "Fajar Nugroho" dicoret, opacity 60%, ikon x kecil
  12 Agu — chip Event "Nadia Salsabila"
  21 Agu — chip Studio "Yoga Pratama" (opacity 60%)
  24 Agu — chip Studio "Budi Hartono" (opacity 60%)
  26 Agu — chip Studio "14:00 Sinta P."
  29 Agu — chip Studio "10:00 Dewi Anggraini"

Order yang sudah Diserahkan atau Batal tampil opacity 60% supaya jadwal yang
masih perlu dikerjakan langsung menonjol.

Jangan buat chip Retail di kalender — order retail tidak punya jadwal, selesai
saat itu juga. Warna Retail tetap ada di legenda supaya konsisten dengan chart.

Di bawah grid, baris legenda 12px: kotak warna kecil + label
"Retail · Studio · Event", lalu pemisah, lalu "Pudar = selesai atau batal".
```

---

### 4.9 Pembayaran — Piutang

Layar yang paling sering dibuka owner (business-flow 5.4). Prioritas: mana yang harus ditagih hari ini.

```
Halaman "Pembayaran". Header: judul kiri, tombol primary "Catat Pembayaran" kanan.
Tabs di bawah header: "Piutang (4)" aktif · "Riwayat Pembayaran" · "Rekap Metode".

Empat Card stat sebaris di atas tabel, tiap card: label 12px --muted-foreground
di atas, angka 30px/600 tabular-nums di bawah, ikon lucide 16px pojok kanan atas
warna --muted-foreground.
  Total Piutang        Rp 8.050.000   (ikon wallet)
  Jatuh Tempo ≤ 7 hari Rp 550.000     (ikon clock, angka warna --warning)
  Lewat Jatuh Tempo    Rp 1.500.000   (ikon alert-triangle, angka --destructive)
  Order Belum Lunas    4              (ikon file-text)

Baris filter: search kiri; kanan Select "Semua tipe" dan Select urutan
"Urut: Umur tagihan" (opsi lain: Jatuh tempo, Nominal terbesar).

Tabel, kolom:
  No Order      mono, link
  Customer      teks 500 + ikon WhatsApp kecil di kanannya
  Tipe          badge outline
  Jadwal        tanggal
  Total         rata kanan
  Dibayar       rata kanan --muted-foreground
  Sisa Tagihan  rata kanan, tebal 600
  Umur          "14 hari" — netral kalau < 7, --warning 7–29, --destructive >= 30
  Status Bayar  badge
  (aksi)        tombol kecil primary "Catat Bayar" + titik tiga

Isi 4 baris, urut umur tagihan terlama di atas:
  ORD-0008 Nadia Salsabila  Event  12 Agu 2026  Rp 2.500.000 Rp 1.000.000
           Rp 1.500.000  14 hari  DP 40%
  ORD-0005 Dewi Anggraini   Studio 29 Agu 2026  Rp 350.000   Rp 0
           Rp 350.000    —        Belum Bayar
  ORD-0012 Sinta Prameswari Studio 26 Agu 2026  Rp 350.000   Rp 150.000
           Rp 200.000    hari ini DP 43%
  ORD-0011 Rani & Dimas     Event  18 Okt 2026  Rp 8.500.000 Rp 2.500.000
           Rp 6.000.000  —        DP 29%

Baris ORD-0008 diberi bg --destructive-subtle sangat tipis sebagai penanda
paling mendesak.

Footer tabel: baris total tebal — "Total sisa tagihan" kiri,
"Rp 8.050.000" rata kanan di kolom Sisa Tagihan.
```

**Catatan.** Kolom Umur diisi "—" untuk order yang jadwalnya masih di depan (ORD-0005, ORD-0011) — belum jadi tunggakan, jadi jangan diberi warna peringatan. Menandai booking bulan depan sebagai "merah" akan bikin owner mengabaikan warna merah sama sekali.

---

### 4.10 Pembayaran — Dialog Catat Pembayaran

```
Dialog "Catat Pembayaran" lebar 480px di atas halaman Piutang yang di-dim.

Bagian atas, Card ringkas bg --muted radius --radius berisi konteks order:
  "ORD-0008" mono kecil, "Nadia Salsabila · Paket Prewedding Outdoor"
  Tiga kolom kecil: Total Rp 2.500.000 · Dibayar Rp 1.000.000 ·
  Sisa Rp 1.500.000 (warna --warning, tebal)

Form di bawahnya:
  Tanggal    date picker, terisi "26 Agu 2026"
  Nominal    input prefix Rp, besar 18px tabular-nums, terisi "1.500.000"
             Di bawahnya 3 chip cepat: "Lunasi (Rp 1.500.000)" ·
             "50% (Rp 750.000)" · "Nominal lain". Chip pertama aktif.
  Metode     toggle group 3: Tunai · Transfer · QRIS. Transfer terpilih.
  Keterangan Select bebas-isi: DP · Pelunasan · Termin 2. Terisi "Pelunasan".

Di bawah form, baris preview dengan bg --success-subtle, radius rounded-md,
padding 12px: ikon check-circle --success-subtle-foreground dan teks
"Setelah disimpan, order ini menjadi Lunas."

Footer: "Batal" ghost, "Simpan Pembayaran" primary.
```

**Catatan.** Baris preview itu penting: status bayar tidak diinput manual, dihitung dari total Payment (business-flow bagian 4). Owner perlu lihat konsekuensinya sebelum simpan, bukan setelah.

---

### 4.11 Biaya

Dua jenis biaya yang beda sifat digabung di satu halaman dengan tabs — memisah jadi dua menu bikin biaya operasional bulanan sering lupa dicatat.

```
Halaman "Biaya". Header: judul kiri, tombol primary "Catat Biaya" kanan.
Tabs: "Biaya Operasional" aktif · "Biaya Job".

Baris kontrol: panah kiri, "Agustus 2026", panah kanan (pemilih bulan) di kiri.
Rata kanan: Select "Semua kategori".

Tiga Card stat sebaris:
  Total Biaya Operasional  Rp 4.800.000
  Total Biaya Job          Rp 3.000.000
  Total Biaya Bulan Ini    Rp 7.800.000   (angka tebal, border card --border 2px)

Tabel tab Biaya Operasional, kolom:
  Tanggal · Kategori (badge outline) · Keterangan · Metode Bayar (badge outline)
  · Nominal (rata kanan) · aksi titik tiga
Isi:
  01 Agu 2026 · Sewa Tempat · Sewa studio Agustus · Transfer · Rp 3.500.000
  05 Agu 2026 · Utilitas · Listrik & air · Transfer · Rp 450.000
  05 Agu 2026 · Utilitas · Internet · Transfer · Rp 350.000
  14 Agu 2026 · Marketing · Iklan Instagram · Transfer · Rp 500.000
Footer tabel: baris total tebal "Total" / "Rp 4.800.000".

Tampilkan juga tab "Biaya Job" aktif sebagai varian kedua. Tabelnya beda kolom:
  Tanggal · No Order (mono, link) · Customer · Kategori · Keterangan
  · Nominal (rata kanan) · aksi
Isi:
  12 Agu 2026 · ORD-0008 · Nadia Salsabila · Fee Crew · Fotografer freelance
                · Rp 1.200.000
  12 Agu 2026 · ORD-0008 · Nadia Salsabila · Fee Crew · MUA · Rp 800.000
  12 Agu 2026 · ORD-0008 · Nadia Salsabila · Transport · Sewa mobil + bensin
                · Rp 450.000
  12 Agu 2026 · ORD-0008 · Nadia Salsabila · Sewa Lokasi · Villa Puncak
                · Rp 350.000
  24 Agu 2026 · ORD-0009 · Budi Hartono · Fee Crew · Asisten studio · Rp 200.000

Di tab Biaya Job, tambahkan Alert kecil di atas tabel dengan ikon info,
bg --muted, teks --muted-foreground:
"Biaya job menempel ke satu order dan dipakai menghitung margin per lini.
 Biaya yang tidak bisa dikaitkan ke order tertentu catat di Biaya Operasional."
```

**Catatan.** Data biaya job sengaja menumpuk di ORD-0008 (event) — Rp 2.800.000 biaya untuk omzet Rp 2.500.000 yang baru terbayar Rp 1.000.000. Itu memperlihatkan persis masalah yang business-flow bagian 7 sebut: lini event omzetnya paling besar tapi marginnya paling tipis.

---

### 4.12 POS

Target < 30 detik per transaksi (business-flow 5.1). Desainnya harus terasa cepat, bukan lengkap.

```
Halaman "POS" tanpa Card pembungkus, layout dua kolom penuh tinggi layar:
kiri 1fr (pemilih item), kanan 400px fixed (keranjang). Padding 24px.

KIRI:
  Search besar di atas, tinggi 48px, ikon search, autofocus,
  placeholder "Cari item atau scan…". 16px.
  Di bawahnya baris chip kategori: Semua · Cetak · Merchandise · Add-on.
  "Semua" aktif.
  Grid item 4 kolom, gap 12px. Tiap kartu tinggi 100px, border --border,
  radius --radius, hover border --primary:
    nama item 14px/500 dua baris maksimal, harga 15px/600 tabular-nums
    di bawahnya, dan HPP 11px --muted-foreground di baris paling bawah.
  Isi dengan 5 produk dari data contoh, lalu 5 kartu jasa (Paket Studio 1 Jam,
  Paket Studio Keluarga 2 Jam, Add-on Editing Lanjutan, Paket Prewedding Outdoor,
  Paket Wedding Full Day). Kartu jasa tanpa baris HPP.

KANAN — Card keranjang penuh tinggi, tersusun tiga bagian:

  Atas: baris "Keranjang" 16px/600 dan link kecil --destructive "Kosongkan".

  Tengah (scroll): daftar item, tiap baris —
    nama item 14px/500 kiri, harga satuan 12px --muted-foreground di bawahnya;
    kanan: stepper qty kompak (− angka +) lalu subtotal tabular-nums;
    ikon trash kecil paling kanan.
  Isi 2 baris:
    Keychain Foto Akrilik  Rp 25.000  qty 2  Rp 50.000
    Cetak 4R               Rp 5.000   qty 6  Rp 30.000

  Bawah (sticky):
    Baris Subtotal Rp 80.000
    Baris Diskon: input Rp kecil rata kanan, Rp 0
    Pemisah, baris Total 24px/600 tabular-nums Rp 80.000
    Pemisah.
    Baris customer: teks --muted-foreground "Customer: Umum" dengan link kecil
    "Tambah customer" di kanan. TIDAK ada field wajib di sini.
    Toggle group metode bayar 3 tombol lebar penuh: Tunai · Transfer · QRIS.
    Tunai terpilih.
    Tombol primary lebar penuh tinggi 48px: "Bayar Rp 80.000".
    Di bawahnya dua tombol ghost kecil sebaris: "Cetak Nota" dan "Kirim WA".
```

**Catatan.** Customer tampil sebagai teks pasif, bukan field. Begitu jadi input yang minta diisi, owner akan berhenti atau asal isi — dan business-flow 5.1 menyebut ini eksplisit sebagai cara tercepat bikin app ditinggal.

---

### 4.13 Dashboard

Digenerate terakhir: isinya rangkuman dari semua layar sebelumnya.

```
Halaman "Dashboard". Header: judul kiri dengan subteks --muted-foreground
"Rabu, 26 Agustus 2026". Kanan: Select periode "Agustus 2026" dan tombol
primary "Buat Order".

Baris 1 — empat Card stat, tiap card: label 12px --muted-foreground,
angka 30px/600 tabular-nums, ikon lucide 16px pojok kanan atas, dan baris
perbandingan 12px paling bawah.
  Omzet Bulan Ini    Rp 5.790.000  (ikon trending-up)
                     baris bawah: "Bulan pertama pencatatan" --muted-foreground
  Piutang Berjalan   Rp 8.050.000  (ikon wallet)
                     baris bawah: "4 order belum lunas" --muted-foreground
  Booking Hari Ini   1             (ikon calendar)
                     baris bawah: "14:00 Sinta Prameswari" --muted-foreground
  Perlu Ditindak     4             (ikon alert-circle, angka --warning)
                     baris bawah: "3 tagihan, 1 hasil belum dikirim" --warning

Baris 2 — dua kolom, kiri 1fr kanan 400px.

  KIRI, Card "Omzet per Lini — Agustus 2026":
    Bar chart horizontal, 3 batang, tinggi batang 32px, gap 12px.
    Retail Rp 290.000 warna --chart-1
    Studio Rp 1.500.000 warna --chart-2
    Event  Rp 4.000.000 warna --chart-3
    Label lini di kiri batang, nominal di ujung kanan batang, tabular-nums.
    Sumbu X pakai nilai disingkat (0, 1jt, 2jt, 3jt, 4jt), teks 12px
    --muted-foreground. Grid vertikal tipis --border.
    Tanpa gradient, tanpa shadow pada batang.

  KANAN, Card "Perlu Ditindaklanjuti":
    Daftar 4 baris, tiap baris: ikon lucide 16px kiri, teks utama 14px,
    subteks 12px --muted-foreground di bawahnya, dan tombol ghost kecil kanan.
      alert-triangle --destructive — "Tagihan lewat 14 hari"
        "ORD-0008 · Nadia Salsabila · Rp 1.500.000"      → "Tagih"
      clock --warning — "Sisa tagihan hari ini"
        "ORD-0012 · Sinta Prameswari · Rp 200.000"       → "Tagih"
      calendar --muted-foreground — "Booking belum bayar DP"
        "ORD-0005 · Dewi Anggraini · 29 Agu 2026"        → "Ingatkan"
      image --muted-foreground — "Hasil foto belum ditempel"
        "ORD-0008 · Nadia Salsabila"                     → "Tempel Link"

Generate juga varian kedua card Omzet untuk nanti saat sudah ada pembanding:
baris bawah jadi "▲ 34% dari bulan lalu" warna --success, plus varian turun
"▼ 12% dari bulan lalu" warna --destructive.

Baris 3 — Card "Order Terbaru":
  Tabel ringkas 6 baris teratas dari data contoh, kolom:
  No Order (mono) · Customer · Tipe (badge) · Total (rata kanan)
  · Status Kerja (titik progres) · Status Bayar (badge).
  Header card punya link kecil "Lihat semua" di kanan.
```

**Catatan.** Card "Perlu Ditindaklanjuti" adalah alasan owner membuka app tiap pagi. Isinya bukan notifikasi pasif — tiap baris punya satu tombol aksi. Kalau ini cuma jadi daftar tanpa tombol, dashboard kehilangan fungsinya dan owner langsung lompat ke menu lain.

---

### 4.14 Invoice — Daftar

Invoice bukan entitas terpisah, hanya tampilan dari Order (business-flow 5.5). Halaman ini pada dasarnya daftar order dengan sudut pandang "sudah dikirim atau belum".

```
Halaman "Invoice". Header: judul kiri, tombol outline "Pengaturan Invoice" kanan.

Baris filter: search "Cari no invoice, order, atau customer…" kiri.
Kanan: Select "Semua status kirim" (Belum Dikirim / Terkirim / Dilihat),
date range "Agustus 2026".

Tiga Card stat sebaris:
  Belum Dikirim      2            (ikon file-clock, angka --warning)
  Terkirim Bulan Ini 5            (ikon send)
  Nilai Belum Lunas  Rp 8.050.000 (ikon wallet)

Tabel, kolom:
  No Invoice     mono, link, contoh "INV-0008"
  No Order       mono, --muted-foreground, 12px
  Customer       teks 500
  Tanggal Terbit tanggal
  Total          rata kanan
  Sisa           rata kanan, tebal; "Rp 0" --muted-foreground kalau lunas
  Status Bayar   badge
  Terakhir Dikirim  tanggal + baris kedua kecil --muted-foreground berisi
                 kanal dan jumlah, contoh "WhatsApp · 2×".
                 Kalau belum pernah: teks "Belum dikirim" warna --warning.
  (aksi)         tombol kecil outline "Kirim" + titik tiga
                 (Lihat · Unduh PDF · Salin Link · Kirim Ulang)

Isi 6 baris:
  INV-0011 ORD-0011 Rani & Dimas     18 Okt 2026 Rp 8.500.000 Rp 6.000.000
           DP 29%  · 02 Agu 2026 WhatsApp · 1×
  INV-0008 ORD-0008 Nadia Salsabila  01 Agu 2026 Rp 2.500.000 Rp 1.500.000
           DP 40%  · 01 Agu 2026 Email · 2×
  INV-0012 ORD-0012 Sinta Prameswari 26 Agu 2026 Rp 350.000   Rp 200.000
           DP 43%  · Belum dikirim
  INV-0005 ORD-0005 Dewi Anggraini   26 Agu 2026 Rp 350.000   Rp 350.000
           Belum Bayar · Belum dikirim
  INV-0009 ORD-0009 Budi Hartono     24 Agu 2026 Rp 650.000   Rp 0
           Lunas   · 24 Agu 2026 WhatsApp · 1×
  INV-0007 ORD-0007 Yoga Pratama     21 Agu 2026 Rp 350.000   Rp 0
           Lunas   · 21 Agu 2026 WhatsApp · 1×

Baris yang "Belum dikirim" diberi garis kiri 2px --warning.
```

**Catatan.** Order retail tidak muncul di sini — dibayar lunas di tempat dan yang keluar nota, bukan invoice. Nomor invoice memakai penomoran internal `INV-xxxx` yang mengikuti nomor order, bukan nomor pajak berurutan (business-flow asumsi #8).

---

### 4.15 Invoice — Preview & Kirim

```
Halaman "INV-0008". Breadcrumb: Invoice › INV-0008.
Kanan header: "Unduh PDF" outline (ikon download), "Salin Link" outline
(ikon link), "Kirim" primary (ikon send).

Dua kolom: kiri 1fr berisi preview dokumen, kanan 360px panel kirim.

KIRI — dokumen invoice di dalam Card bg --card, padding 40px, rasio kertas A4,
shadow tipis, isi memakai --card-foreground:

  Baris atas: kiri logo placeholder kotak 48px bg --muted dengan teks "LOGO",
  di bawahnya nama studio 16px/600 "Studio Foto Agung", lalu alamat, telepon,
  dan email 12px --muted-foreground.
  Kanan atas: "INVOICE" 24px/600, di bawahnya "INV-0008" mono
  --muted-foreground, "Terbit 01 Agu 2026", "Jatuh tempo 12 Agu 2026".
  Badge status bayar "DP 40%" di bawahnya.

  Pemisah garis --border.

  Dua kolom: kiri "Ditagihkan kepada" label 11px --muted-foreground lalu
  "Nadia Salsabila", "0896-1122-8899", "nadia@email.com".
  Kanan "Detail Acara": "Prewedding Outdoor", "12 Agu 2026", "Villa Puncak".

  Tabel item, header bg --muted:
  Deskripsi · Qty · Harga · Jumlah
  Paket Prewedding Outdoor · 1 · Rp 2.500.000 · Rp 2.500.000

  Blok ringkasan rata kanan, lebar 260px:
    Subtotal                Rp 2.500.000
    Diskon                  Rp 0
    Total                   Rp 2.500.000   (tebal, garis atas)
    ---
    Riwayat pembayaran, tiap baris 12px --muted-foreground:
    01 Agu 2026 · Transfer · DP   −Rp 1.000.000
    ---
    Sisa Tagihan            Rp 1.500.000   (18px/600, warna --warning,
                                            bg --warning-subtle, padding 8px)

  Pemisah. Bagian "Instruksi Pembayaran": nama bank, nomor rekening (mono 15px),
  nama pemilik rekening. Di kanannya kotak QR placeholder 88px bg --muted
  dengan label "QRIS".

  Paling bawah, teks 11px --muted-foreground rata tengah:
  "Terima kasih atas kepercayaan Anda."

KANAN — dua Card bertumpuk:

  Card "Kirim Invoice":
    Toggle group 2: "WhatsApp" | "Email". WhatsApp terpilih.
    Field Tujuan, terisi "0896-1122-8899", ikon edit kecil.
    Textarea 5 baris berisi pesan siap kirim, sudah terisi:
      "Halo Nadia, berikut invoice untuk Paket Prewedding Outdoor.
       Total Rp 2.500.000, sisa tagihan Rp 1.500.000.
       Invoice: [link]
       Terima kasih 🙏"
    Chip kecil di bawah textarea: "Pakai template Penagihan".
    Tombol primary lebar penuh "Buka WhatsApp" dengan ikon external-link.
    Hint 12px --muted-foreground di bawahnya:
    "WhatsApp terbuka di tab baru dengan pesan sudah terisi. Kirim manual dari sana."

  Card "Riwayat Pengiriman":
    Timeline vertikal, tiap baris: titik 8px --border di garis vertikal,
    kanan teks 13px dan subteks 11px --muted-foreground.
      01 Agu 2026, 10:12 · Email · Terkirim
      03 Agu 2026, 09:40 · Email · Terkirim ulang
    Baris terakhir dengan titik --success: "05 Agu 2026, 14:22 · Link dibuka".
```

**Catatan.** Tombolnya "Buka WhatsApp", bukan "Kirim". App tidak mengirim sendiri — menyiapkan pesan lalu owner yang mengirim, sesuai gotcha WhatsApp di business-flow 5.6. Hint di bawah tombol wajib ada supaya owner tidak menyangka pesan sudah terkirim.

Satu invoice dikirim berkali-kali seiring pembayaran bertambah; isinya selalu kondisi terkini. Karena itu tidak ada dokumen terpisah untuk DP dan pelunasan — dan riwayat pengiriman jadi penting, karena dokumen yang sama bisa punya beberapa versi terkirim.

---

### 4.16 Komunikasi — Template

Satu tempat untuk semua teks yang dikirim ke customer. Digenerate sebelum layar blast karena keduanya memakainya.

```
Halaman "Komunikasi". Header: judul kiri, tombol primary "Template Baru" kanan.
Tabs: "Template" aktif · "Blast Email" · "Blast WhatsApp" · "Riwayat".

Dua kolom: kiri 280px daftar template, kanan 1fr editor.

KIRI — list template, tiap baris tinggi 64px, radius --radius, hover bg --accent,
item terpilih bg --accent dengan garis kiri 2px --primary:
  nama template 14px/500, subteks 12px --muted-foreground berisi kanal dan
  pemicu, plus badge kecil "Otomatis" untuk yang terkirim sendiri.
  Thank You Mail        Email · otomatis saat Diserahkan   [Otomatis]
  Reminder H-1          WhatsApp · manual
  Penagihan             WhatsApp · manual
  Promo / Blast         Email · manual
"Thank You Mail" terpilih.

KANAN — Card editor:
  Baris atas: input nama template "Thank You Mail" 16px/600 tanpa border,
  kanan Switch "Kirim otomatis" dalam keadaan nyala.
  Baris kedua: Select kanal "Email", dan hint --muted-foreground
  "Terkirim otomatis saat order berpindah ke status Diserahkan."

  Field Subjek: input, terisi
  "Hasil foto kamu sudah siap, {nama_customer}!"

  Toolbar variabel — baris chip kecil mono yang bisa diklik untuk disisipkan:
  {nama_customer} · {no_order} · {nama_paket} · {tanggal_acara} · {link_hasil}
  · {sisa_tagihan} · {nama_studio}
  Chip pakai bg --muted, teks --muted-foreground, font JetBrains Mono 12px.

  Textarea besar tinggi 280px berisi isi email, variabel di dalamnya
  di-highlight bg --muted radius rounded-md:
    "Halo {nama_customer},

     Terima kasih sudah memercayakan momenmu ke {nama_studio}.
     Hasil foto untuk {nama_paket} sudah bisa diunduh di sini:
     {link_hasil}

     Kalau berkenan, kami sangat terbantu kalau kamu mau meninggalkan
     ulasan singkat. Sampai jumpa di sesi berikutnya!"

  Di bawah textarea, Card kecil bg --muted judul "Pratinjau" 12px/500:
  isi yang sama tapi variabel sudah terisi data Nadia Salsabila, teks 13px.

  Footer editor: "Kirim Tes ke Saya" ghost kiri, "Simpan" primary kanan.
```

---

### 4.17 Komunikasi — Blast Email

```
Halaman "Komunikasi", tab "Blast Email" aktif.

Dua kolom: kiri 1fr penyusun pesan, kanan 380px pemilih penerima.

KIRI — Card "Susun Pesan":
  Select template, terisi "Promo / Blast".
  Input Subjek: "Promo Cetak Foto Akhir Bulan 🎉"
  Toolbar variabel sama seperti 4.16.
  Textarea tinggi 240px berisi draf promo dengan {nama_customer} di-highlight.
  Card pratinjau kecil di bawahnya seperti 4.16.

KANAN — Card "Penerima" sticky:
  Judul bagian "Filter" 12px/500 --muted-foreground, lalu tiga baris filter:
    Select "Pernah beli: Studio"
    Select "Sumber: Semua"
    Select "Belum di-blast 30 hari terakhir" dalam keadaan aktif
  Tombol ghost kecil "Reset filter".

  Pemisah. Baris hasil: angka 30px/600 tabular-nums "4" dan label
  "penerima terpilih" 12px --muted-foreground. Di kanannya link kecil
  "Lihat daftar".

  Daftar penerima, tinggi maksimal 200px scroll, tiap baris:
  checkbox tercentang, avatar inisial 24px, nama 13px, email 11px
  --muted-foreground.
    Sinta Prameswari · sinta@email.com
    Budi Hartono · budi@email.com
    Yoga Pratama · yoga@email.com
    Dewi Anggraini · dewi@email.com

  Alert kecil bg --muted ikon info, teks 12px --muted-foreground:
  "3 customer tanpa email tidak masuk daftar. Kirim lewat WhatsApp."

  Tombol primary lebar penuh tinggi 44px: "Kirim ke 4 Penerima".
  Di bawahnya tombol ghost "Kirim Tes ke Saya".
```

**Catatan.** Alert "3 customer tanpa email" wajib ada. Tanpa itu owner menyangka blast sampai ke semua customer, padahal sebagian tidak punya email — dan diam-diam kehilangan sepertiga jangkauan.

---

### 4.18 Komunikasi — Blast WhatsApp

Layar paling gampang salah desain. App **tidak** mengirim WhatsApp; app menyiapkan dan owner yang mengirim.

```
Halaman "Komunikasi", tab "Blast WhatsApp" aktif.

Paling atas, sebelum apa pun, Alert lebar penuh bg --warning-subtle,
teks --warning-subtle-foreground, ikon info, radius --radius, padding 12px:
"WhatsApp dikirim manual dari HP kamu. App menyiapkan nomor dan pesannya,
 lalu kamu yang menekan kirim. Broadcast list WhatsApp Business hanya sampai
 ke penerima yang sudah menyimpan nomor studio."

Dua kolom: kiri 1fr, kanan 380px.

KIRI — dua Card bertumpuk:

  Card "Pesan":
    Select template "Promo / Blast".
    Toolbar variabel.
    Textarea tinggi 180px berisi draf pesan dengan {nama_customer} di-highlight.
    Card pratinjau kecil di bawahnya, digambarkan sebagai gelembung chat:
    lebar maksimal 300px, radius 12px, bg --muted, teks 13px, dengan jam kecil
    di pojok kanan bawah gelembung.

  Card "Cara Kirim" berisi dua pilihan sebagai kartu pilihan besar bersebelahan,
  masing-masing tinggi 120px, border --border, yang terpilih border --primary 2px:

    Kartu A (terpilih) — ikon message-circle, judul "Kirim Satu per Satu",
    subteks "Buka WhatsApp per customer dengan pesan sudah terisi. Nama otomatis
    dipersonalisasi. Cocok untuk di bawah 20 penerima."

    Kartu B — ikon copy, judul "Salin Daftar Nomor",
    subteks "Salin semua nomor untuk ditempel ke broadcast list WhatsApp Business.
    Maksimal 256 kontak, pesan tidak dipersonalisasi."

  Saat Kartu A terpilih, di bawahnya muncul tabel antrean kirim:
    kolom: checkbox · Nama · No HP (mono) · Status · aksi
    Status berupa badge: "Belum" netral atau "Terkirim" --success-subtle.
    Baris, tombol aksi kecil primary "Buka WhatsApp" per baris:
      Sinta Prameswari  0812-3344-5566  Terkirim  (badge --success-subtle,
                                                   tombol jadi ghost "Kirim ulang")
      Budi Hartono      0813-2211-9087  Belum
      Rani & Dimas      0857-8899-1200  Belum
      Nadia Salsabila   0896-1122-8899  Belum
    Baris progres di atas tabel: "1 dari 4 terkirim" dengan Progress bar tipis
    --primary di bawahnya.

  Tampilkan juga varian saat Kartu B terpilih: tabel antrean diganti Card
  bg --muted berisi daftar nomor dalam font JetBrains Mono 13px satu per baris,
  tinggi maksimal 160px scroll, dengan tombol outline "Salin 4 Nomor"
  (ikon copy) di pojok kanan atas Card. Di bawahnya teks 12px
  --muted-foreground: "Tempel ke broadcast list WhatsApp Business di HP kamu."

KANAN — Card "Penerima" sticky, sama seperti 4.17 tapi filter ketiga jadi
"Punya nomor HP" dalam keadaan aktif dan terkunci (disabled, ikon lock kecil),
dengan hint "Wajib — blast WhatsApp butuh nomor."
Angka hasil "4 penerima terpilih".
```

**Catatan.** Tidak ada tombol "Kirim Semua" di layar ini, dan itu disengaja. Satu tombol yang seolah mengirim massal akan membuat owner mengira app punya WhatsApp Business API — padahal tidak, dan business-flow 5.6 minta itu dijelaskan sejak awal. Yang ada hanya "Buka WhatsApp" per baris dan "Salin Nomor".

Kolom Status per baris ada supaya owner tahu sudah sampai mana kalau proses manualnya terputus di tengah. Tanpa itu, blast 20 orang yang terhenti di nomor 11 harus diulang dari awal.

---

### 4.19 Laporan — Laba Rugi

```
Halaman "Laporan". Header: judul kiri; kanan Select periode "Agustus 2026",
tombol outline "Unduh PDF" (ikon download), tombol outline "Ekspor CSV".
Tabs: "Laba Rugi" aktif · "Margin per Lini" · "Penjualan" · "Piutang".

Alert kecil di bawah tabs, bg --muted, ikon info, teks 12px --muted-foreground:
"Basis kas — omzet dihitung dari uang yang benar-benar diterima bulan ini,
 bukan dari nilai order. Order yang sudah dikerjakan tapi belum lunas ada di
 tab Piutang."

Empat Card stat sebaris:
  Total Omzet        Rp 5.790.000  (ikon trending-up)
  Laba Kotor         Rp 2.695.500  (ikon layers, subteks "47% dari omzet")
  Biaya Operasional  Rp 4.800.000  (ikon building)
  Laba Bersih       −Rp 2.104.500  (ikon trending-down, angka warna
                                    --destructive, subteks "Rugi bulan ini"
                                    --destructive)

Dua kolom: kiri 1fr laporan bertingkat, kanan 380px grafik.

KIRI — Card "Laba Rugi Agustus 2026" berisi tabel bertingkat tanpa garis
horizontal antar baris, hanya garis pemisah antar blok. Baris berjumlah
(diawali "=") pakai teks 600 dan garis atas --border. Nominal rata kanan,
tabular-nums, lebar kolom tetap.

  OMZET                                     ← 12px/600 uppercase --muted-foreground
     Retail                     Rp 290.000  ← indent 16px, 14px/400
     Studio                   Rp 1.500.000
     Event                    Rp 4.000.000
   = Total Omzet              Rp 5.790.000  ← 14px/600

  BIAYA LANGSUNG
     HPP bahan produk           Rp 94.500
     Biaya job                Rp 3.000.000
   = Total Biaya Langsung     Rp 3.094.500

  LABA KOTOR                  Rp 2.695.500  ← 16px/600, bg --muted, padding 12px,
                                              radius rounded-md, badge "47%" kanan

  BIAYA OPERASIONAL
     Sewa tempat              Rp 3.500.000
     Utilitas                   Rp 800.000
     Marketing                  Rp 500.000
   = Total Biaya Operasional  Rp 4.800.000

  LABA BERSIH                −Rp 2.104.500  ← 18px/600 warna --destructive,
                                              bg --destructive-subtle, padding 12px

Setiap baris rincian bisa diklik (ikon chevron-right kecil --muted-foreground
muncul saat hover) untuk membuka daftar transaksi pembentuknya.

KANAN — dua Card bertumpuk:

  Card "Komposisi Omzet": bar horizontal bertumpuk satu baris tinggi 40px,
  tiga segmen — Retail --chart-1 5%, Studio --chart-2 26%, Event --chart-3 69%.
  Persentase ditulis di dalam segmen kalau muat. Legenda di bawahnya tiga baris:
  kotak warna, nama lini, nominal rata kanan tabular-nums.

  Card "Omzet vs Biaya": bar chart vertikal 2 batang tinggi 180px —
  "Uang Masuk" Rp 5.790.000 warna --chart-4, "Uang Keluar" Rp 7.894.500
  warna --chart-5. Di bawahnya baris selisih: "Selisih −Rp 2.104.500"
  warna --destructive tebal.
```

**Catatan.** Alert basis kas di atas wajib, bukan hiasan. Angka "Rugi Rp 2.104.500" akan mengejutkan owner yang merasa bulan ini ramai — penjelasannya ada di dua tempat: sebagian uang order belum masuk (tab Piutang), dan sewa Rp 3.500.000 menelan hampir seluruh laba kotor. Tanpa alert dan tanpa tab Piutang yang gampang dijangkau, owner akan menyimpulkan laporannya salah lalu berhenti memakainya.

Uang Keluar Rp 7.894.500 = biaya langsung Rp 3.094.500 + operasional Rp 4.800.000.

---

### 4.20 Laporan — Margin per Lini

Output paling berharga bagi owner (business-flow bagian 7). Desainnya harus membuat satu temuan langsung terbaca: lini dengan omzet terbesar justru marginnya paling tipis.

```
Halaman "Laporan", tab "Margin per Lini" aktif. Header dan Select periode
sama seperti 4.19.

Paling atas, Card lebar penuh bg --warning-subtle radius --radius padding 16px,
ikon lightbulb --warning-subtle-foreground di kiri, teks 14px:
"Event menyumbang 69% omzet tapi marginnya paling tipis (30%).
 Retail hanya 5% omzet dengan margin 67%."
Card ini bukan hiasan — ini kesimpulan yang dicari owner.

Tiga Card lini sebaris, tiap card padding 20px, border --border, dengan garis
atas 3px berwarna sesuai lini (--chart-1 / --chart-2 / --chart-3):
  Nama lini 14px/600 dengan titik warna 8px di kirinya.
  Angka margin 28px/600 tabular-nums.
  Baris "dari omzet Rp x" 12px --muted-foreground.
  Progress bar tipis tinggi 6px menampilkan persentase margin, warna lini.
  Persentase 13px/600 di kanan bar.
  Isi:
    Retail · Rp 195.500 · dari omzet Rp 290.000 · bar 67%
    Studio · Rp 1.300.000 · dari omzet Rp 1.500.000 · bar 87%
    Event  · Rp 1.200.000 · dari omzet Rp 4.000.000 · bar 30%

Card "Rincian per Lini" berisi tabel:
  kolom: Lini (titik warna + nama) · Omzet (rata kanan) · Share (rata kanan,
  --muted-foreground) · Biaya Langsung (rata kanan) · Margin (rata kanan, 600)
  · Margin % (rata kanan; --success kalau >= 50%, --warning 30–49%,
  --destructive < 30%)
  Baris:
    Retail  Rp 290.000    5%   Rp 94.500    Rp 195.500   67%
    Studio  Rp 1.500.000  26%  Rp 200.000   Rp 1.300.000 87%
    Event   Rp 4.000.000  69%  Rp 2.800.000 Rp 1.200.000 30%
  Baris total tebal dengan garis atas:
    Total   Rp 5.790.000  100% Rp 3.094.500 Rp 2.695.500 47%

Dua kolom di bawahnya:

  KIRI Card "Omzet vs Margin per Lini": grouped bar chart vertikal, tinggi 220px.
  Tiga kelompok (Retail, Studio, Event), tiap kelompok 2 batang bersebelahan —
  batang Omzet warna lini penuh, batang Margin warna lini dengan opacity 45%.
  Sumbu Y disingkat (0, 2jt, 4jt). Legenda "Omzet · Margin" di bawah.
  Kontras tinggi batang Event yang jangkung tapi margin-nya pendek adalah
  inti visual chart ini — jangan diskalakan ulang per kelompok.

  KANAN Card "Biaya Langsung Terbesar": daftar 5 baris, tiap baris nama biaya
  kiri, nominal rata kanan, dan bar tipis proporsional di bawahnya warna
  --chart-5:
    Fee fotografer freelance  Rp 1.200.000  (ORD-0008)
    MUA                         Rp 800.000  (ORD-0008)
    Transport                   Rp 450.000  (ORD-0008)
    Sewa lokasi                 Rp 350.000  (ORD-0008)
    Asisten studio              Rp 200.000  (ORD-0009)
  No order 11px --muted-foreground di kanan nama.
```

**Catatan.** Card "Biaya Langsung Terbesar" ada supaya temuan margin tipis punya tindak lanjut. Melihat "Event 30%" tanpa tahu penyebabnya tidak mengubah apa pun; melihat bahwa Rp 2.800.000 biaya event menumpuk di crew dan transport satu job langsung memberi tahu owner apa yang harus dinegosiasi ulang.

Skala chart sengaja tidak dinormalisasi per kelompok. Batang Event yang tinggi di Omzet tapi pendek di Margin adalah pesan utamanya; menormalkan skala per kelompok justru menghapus pesan itu.

---

### 4.21 Laporan — Penjualan

```
Halaman "Laporan", tab "Penjualan" aktif. Header dan Select periode
sama seperti 4.19.

Empat Card stat sebaris:
  Unit Produk Terjual  22            (ikon package)
  Order Jasa           7             (ikon camera)
  Rata-rata per Order  Rp 482.500    (ikon receipt)
  Customer Aktif       6             (ikon users)

Dua kolom sejajar, masing-masing 1fr.

  KIRI Card "Produk Terlaris":
    Toggle kecil di header card: "Qty" | "Margin". Qty aktif.
    Tabel: Produk · Qty (rata kanan) · Omzet (rata kanan) · HPP (rata kanan,
    --muted-foreground) · Margin (rata kanan, 600) · % (rata kanan)
      Cetak 4R               15  Rp 75.000  Rp 22.500  Rp 52.500  70%
      Photostrip 3 Pose       4  Rp 80.000  Rp 24.000  Rp 56.000  70%
      Keychain Foto Akrilik   2  Rp 50.000  Rp 16.000  Rp 34.000  68%
      Cetak 10R + Bingkai     1  Rp 85.000  Rp 32.000  Rp 53.000  62%
      Album Mini 20 Halaman   0  Rp 0       Rp 0       Rp 0       —
    Baris Album Mini pakai teks --muted-foreground seluruhnya.
    Baris total tebal: Total 22 · Rp 290.000 · Rp 94.500 · Rp 195.500 · 67%

  KANAN Card "Jasa Terlaris":
    Tabel: Jasa · Order (rata kanan) · Nilai (rata kanan)
      Paket Wedding Full Day       1  Rp 8.500.000
      Paket Prewedding Outdoor     1  Rp 2.500.000
      Paket Studio 1 Jam           4  Rp 1.400.000
      Paket Studio Keluarga 2 Jam  1  Rp 650.000
    Di bawah tabel, teks 12px --muted-foreground:
    "Nilai order, bukan uang diterima. Order batal tidak dihitung."

Card lebar penuh "Customer Teratas":
  Tabel: Customer (avatar inisial + nama) · Order (rata kanan) ·
  Nilai Order (rata kanan) · Sudah Dibayar (rata kanan) ·
  Sisa (rata kanan, --warning kalau > 0) · aksi ikon chevron-right
    Rani & Dimas      1  Rp 8.500.000  Rp 2.500.000  Rp 6.000.000
    Nadia Salsabila   1  Rp 2.500.000  Rp 1.000.000  Rp 1.500.000
    Budi Hartono      2  Rp 1.000.000  Rp 1.000.000  Rp 0
    Sinta Prameswari  2  Rp 395.000    Rp 195.000    Rp 200.000
    Yoga Pratama      1  Rp 350.000    Rp 350.000    Rp 0
    Dewi Anggraini    1  Rp 350.000    Rp 0          Rp 350.000
  Kolom Sisa yang "Rp 0" pakai --muted-foreground.
```

**Catatan.** Kolom "Sudah Dibayar" berdampingan dengan "Nilai Order" itu disengaja: di basis kas, customer dengan nilai order terbesar belum tentu penyumbang uang terbesar. Rani & Dimas nomor satu di nilai tapi baru menyetor 29% — tanpa kolom itu, daftar "Customer Teratas" menyesatkan.

Baris Album Mini dengan qty 0 sengaja ditampilkan, bukan disembunyikan. Produk yang tidak pernah laku adalah informasi, dan menyembunyikannya membuat owner lupa produk itu ada.

---

### 4.22 Laporan — Piutang

Bukan duplikat layar 4.9. Yang di Pembayaran adalah daftar kerja — siapa ditagih hari ini, dengan tombol aksi per baris. Yang ini potret bulanan: berapa uang menggantung, seberapa tua, dan menumpuk di mana. Dibuka saat tutup buku (business-flow 5.7 langkah 4), bukan setiap hari.

Layar ini juga yang menutup kelemahan basis kas. Laba rugi hanya menghitung uang yang sudah masuk; tanpa layar ini owner tidak punya tempat melihat pekerjaan yang sudah selesai tapi belum dibayar.

```
Halaman "Laporan", tab "Piutang" aktif. Header dan Select periode sama
seperti 4.19.

Alert kecil di bawah tabs, bg --muted, ikon info, teks 12px --muted-foreground:
"Angka di sini TIDAK masuk laporan laba rugi. Laba rugi memakai basis kas —
 hanya uang yang sudah diterima. Halaman ini isinya uang yang belum masuk."

Empat Card stat sebaris:
  Total Piutang       Rp 8.050.000  (ikon wallet)
                      subteks "dari 4 order" --muted-foreground
  Setara Omzet        139%          (ikon percent, angka --warning)
                      subteks "dari omzet Agustus Rp 5.790.000" --warning
  Sudah Jatuh Tempo   Rp 1.500.000  (ikon alert-triangle, angka --destructive)
                      subteks "1 order" --destructive
  Rata-rata Umur      14 hari       (ikon clock)
                      subteks "tagihan yang sudah jatuh tempo" --muted-foreground

Dua kolom, kiri 1fr kanan 380px.

KIRI — Card "Umur Piutang":
  Bar horizontal bertumpuk satu baris tinggi 40px, dua segmen:
  81% warna --muted-foreground (Belum jatuh tempo) dan 19% warna --warning
  (1–30 hari). Persentase di dalam segmen kalau muat.

  Di bawahnya tabel 4 baris:
    kolom: Kelompok Umur · Nilai (rata kanan) · Order (rata kanan) ·
           Share (rata kanan, --muted-foreground)
    Belum jatuh tempo  Rp 6.550.000  3  81%
    1–30 hari          Rp 1.500.000  1  19%
    31–60 hari         Rp 0          0   0%
    > 60 hari          Rp 0          0   0%
  Baris nilai Rp 0 seluruhnya --muted-foreground.
  Baris "31–60 hari" dan "> 60 hari" tetap ditampilkan walau kosong.
  Baris total tebal dengan garis atas: Total Rp 8.050.000 · 4 · 100%

  Kolom Kelompok Umur diberi titik warna 8px di kirinya:
  Belum jatuh tempo --muted-foreground, 1–30 hari --warning,
  31–60 hari --destructive, > 60 hari --destructive.

KANAN — dua Card bertumpuk:

  Card "Piutang per Lini": tiga baris, tiap baris nama lini dengan titik warna
  lini, nominal rata kanan, dan bar tipis proporsional di bawahnya:
    Event  Rp 7.500.000  93%  bar --chart-event
    Studio Rp 550.000     7%  bar --chart-studio
    Retail Rp 0           0%  bar kosong, seluruh baris --muted-foreground
  Di bawahnya teks 12px --muted-foreground:
  "Retail dibayar lunas di tempat, jadi tidak pernah menimbulkan piutang."

  Card "Konsentrasi" dengan bg --warning-subtle:
  ikon alert-circle --warning-subtle-foreground, judul 14px/600
  "75% piutang ada di satu customer", teks 13px
  "Rani & Dimas — Rp 6.000.000 dari total Rp 8.050.000. Kalau satu pembayaran
   ini meleset, hampir seluruh piutang bulan ini ikut tertahan."

Card lebar penuh "Rincian Piutang":
  Tabel, kolom:
    No Order (mono, link) · Customer · Tipe (badge outline netral) ·
    Jadwal · Total (rata kanan) · Dibayar (rata kanan, --muted-foreground) ·
    Sisa (rata kanan, tebal 600) · Share (rata kanan, --muted-foreground) ·
    Umur · Status Bayar (badge)
  Kolom Umur: "lewat 14 hari" --destructive, "jatuh tempo hari ini" --warning,
  "3 hari lagi" dan "53 hari lagi" --muted-foreground.
  Baris, urut sisa terbesar di atas:
    ORD-0011 Rani & Dimas     Event  18 Okt 2026 Rp 8.500.000 Rp 2.500.000
             Rp 6.000.000 75% 53 hari lagi          DP 29%
    ORD-0008 Nadia Salsabila  Event  12 Agu 2026 Rp 2.500.000 Rp 1.000.000
             Rp 1.500.000 19% lewat 14 hari        DP 40%
    ORD-0005 Dewi Anggraini   Studio 29 Agu 2026 Rp 350.000   Rp 0
             Rp 350.000    4% 3 hari lagi          Belum Bayar
    ORD-0012 Sinta Prameswari Studio 26 Agu 2026 Rp 350.000   Rp 150.000
             Rp 200.000    2% jatuh tempo hari ini DP 43%
  Baris total tebal dengan garis atas:
  "Total" · Rp 11.700.000 · Rp 3.650.000 · Rp 8.050.000 · 100%

  Tanpa tombol aksi per baris — ini laporan, bukan daftar kerja. Di bawah tabel,
  satu link teks --primary: "Tagih dari halaman Pembayaran →".
```

**Catatan.** Urutannya sisa terbesar di atas, bukan umur tagihan terlama seperti di 4.9. Dua layar, dua pertanyaan berbeda: 4.9 menjawab "mana yang harus ditagih duluan" (umur), layar ini menjawab "di mana uangnya menumpuk" (nilai).

Kartu "Setara Omzet 139%" adalah angka paling penting di layar ini dan paling gampang dilewatkan kalau hanya melihat nominal. Piutang Rp 8.050.000 terdengar wajar sampai disandingkan dengan omzet sebulan Rp 5.790.000 — artinya lebih banyak uang menggantung daripada yang benar-benar masuk.

Kelompok umur 31–60 dan > 60 hari tetap ditampilkan meski Rp 0. Baris kosong hari ini adalah baris yang paling ingin dilihat owner tetap kosong bulan depan; menyembunyikannya membuat kemunculan pertamanya tidak terasa sebagai perubahan.

Tanpa tombol aksi per baris juga disengaja. Kalau layar laporan bisa dipakai menagih, dua layar piutang jadi tumpang tindih dan owner tidak pernah tahu harus buka yang mana.

---

## 5. Prompt Empty State

Wajib per DESIGN.md R7: hari pertama app dipakai, **semua layar kosong**. Generate setelah versi terisi selesai, sebagai varian kedua tiap layar.

Prompt umum — ganti bagian dalam kurung siku:

```
Layar [nama layar] dalam keadaan kosong, belum ada data sama sekali.
Sidebar, header, dan baris filter tetap tampil normal. Area tabel diganti
empty state di tengah, padding vertikal 80px:
  ikon lucide [ikon] ukuran 40px warna --muted-foreground
  judul 16px/600: "[judul]"
  keterangan 14px --muted-foreground, maksimal satu kalimat: "[kalimat]"
  tombol primary: "[tombol]"
```

| Layar | Ikon | Judul | Kalimat | Tombol |
|---|---|---|---|---|
| Katalog | `package` | Katalog masih kosong | Tambahkan produk dan jasa yang paling sering dijual dulu. | Tambah Item |
| Customer | `users` | Belum ada customer | Customer akan terkumpul otomatis dari setiap transaksi. | Tambah Customer |
| Order & Booking | `calendar-plus` | Belum ada order | Buat order pertama untuk sesi studio atau event. | Buat Order |
| Kalender | `calendar` | Belum ada jadwal bulan ini | — | Buat Booking |
| Biaya | `receipt` | Belum ada biaya bulan ini | Catat sewa, listrik, dan internet supaya laba rugi akurat. | Catat Biaya |

Tiga layar di bawah ini **tidak** memakai prompt umum di atas:

**POS** — bergantung pada Katalog, jadi jangan tawarkan aksi yang belum bisa dijalankan:

```
Layar POS dalam keadaan katalog masih kosong. Kolom kanan (keranjang) tetap
tampil tapi seluruhnya disabled dengan opacity 50%. Kolom kiri diisi empty state
di tengah: ikon package 40px --muted-foreground, judul 16px/600
"Katalog masih kosong", keterangan "Isi katalog dulu supaya item bisa dijual
di sini.", tombol primary "Isi Katalog".
```

**Piutang kosong itu kabar baik**, bukan kekurangan data — nadanya harus beda:

```
Tab Piutang dalam keadaan tidak ada tagihan tertunggak. Empat Card stat di atas
tetap tampil dengan nilai Rp 0 warna --muted-foreground. Area tabel diganti
empty state: ikon check-circle 40px warna --success, judul 16px/600
"Semua tagihan lunas", keterangan --muted-foreground "Tidak ada tagihan
tertunggak saat ini." Tanpa tombol.
```

**Dashboard** — mengarahkan ke langkah pertama, mengikuti urutan ketergantungan di business-flow bagian 6:

```
Dashboard hari pertama, belum ada data apa pun. Empat Card stat tetap tampil
dengan angka "Rp 0" dan "0" warna --muted-foreground, tanpa baris perbandingan.
Card chart dan Card "Perlu Ditindaklanjuti" diganti satu Card lebar penuh
berisi onboarding: judul 18px/600 "Mulai dari sini", keterangan
"Tiga langkah supaya app siap dipakai.", lalu daftar 3 langkah bernomor —
tiap baris: lingkaran nomor 24px bg --primary teks --primary-foreground,
judul langkah 14px/500, subteks 12px --muted-foreground, tombol ghost kecil kanan.
  1. Isi katalog produk dan jasa · "Tanpa ini, POS dan Order belum bisa dipakai"
     → Isi Katalog
  2. Catat biaya operasional bulan ini · "Sewa, listrik, internet"
     → Catat Biaya
  3. Buat transaksi pertama · "Lewat POS untuk retail, atau Buat Order untuk sesi"
     → Buka POS
```

**Invoice, Komunikasi, dan Laporan** — ketiganya tidak punya aksi yang bisa dijalankan saat kosong, jadi jangan tawarkan tombol yang berujung ke layar kosong lain:

```
Layar [Invoice / Blast Email / Laporan] dalam keadaan belum ada data.
Sidebar, header, dan Card stat tetap tampil dengan nilai "0" atau "Rp 0"
warna --muted-foreground. Area utama diganti empty state di tengah,
padding vertikal 80px: ikon lucide [ikon] 40px --muted-foreground,
judul 16px/600 "[judul]", keterangan 14px --muted-foreground "[kalimat]",
tombol primary "[tombol]".
```

| Layar | Ikon | Judul | Kalimat | Tombol |
|---|---|---|---|---|
| Invoice | `file-text` | Belum ada invoice | Invoice terbit otomatis dari order studio dan event. | Buat Order |
| Blast Email | `mail` | Belum ada customer ber-email | Email terkumpul saat kamu mencatat customer di order. | Lihat Customer |
| Blast WhatsApp | `message-circle` | Belum ada nomor untuk dikirimi | Nomor HP terkumpul saat kamu mencatat customer di order. | Lihat Customer |
| Laporan | `bar-chart-3` | Belum ada data bulan ini | Laporan terisi sendiri setelah ada transaksi dan biaya tercatat. | Buka POS |

Khusus **Laporan**, tampilkan juga varian ketiga — sudah ada omzet tapi biaya operasional belum dicatat, kondisi yang paling mungkin terjadi di bulan pertama:

```
Tab Laba Rugi dengan omzet terisi tapi biaya operasional masih Rp 0.
Semua Card stat dan tabel tampil normal, tapi blok BIAYA OPERASIONAL diganti
baris ajakan: bg --warning-subtle, radius rounded-md, padding 12px, ikon
alert-circle, teks --warning-subtle-foreground 13px "Biaya operasional bulan ini
belum dicatat. Laba bersih di bawah ini belum mencerminkan kondisi sebenarnya."
dengan tombol kecil outline "Catat Biaya" di kanan.
Baris LABA BERSIH tetap tampil tapi angkanya diberi opacity 60%.
```

---

## 6. Checklist Konsistensi

Cek setelah semua layar jadi, sebelum masuk implementasi. Yang paling sering meleset di generator adalah tiga baris pertama.

**Visual**

- [ ] Tinggi baris tabel 44px di semua layar, tidak ada yang lebih lega
- [ ] Semua kolom uang rata kanan dan tabular-nums, digit sejajar antar baris
- [ ] Sidebar identik di 22 layar: 3 grup, urutan, lebar, penanda item aktif
- [ ] Warna lini konsisten: Retail biru, Studio amber, Event ungu — di chart, kalender, dan laporan
- [ ] Badge DP selalu bawa persentase, tidak ada yang cuma "DP"
- [ ] Legenda titik progres ada di setiap layar yang menampilkannya
- [ ] Format tanggal "26 Agu 2026" di mana-mana, tidak ada yang jadi "26/08/2026"
- [ ] Tidak ada nominal disingkat di tabel — penyingkatan hanya di sumbu chart
- [ ] Setiap layar punya varian empty state
- [ ] Order Batal tampil opacity 60% di daftar maupun kalender
- [ ] Angka negatif pakai "−Rp" dan warna --destructive, bukan tanda kurung

**Angka** — semuanya turunan dari satu dataset di bagian 3; kalau ada yang beda, salah satu layar mengarang

- [ ] Omzet Rp 5.790.000 sama di Dashboard, Laba Rugi, dan Margin per Lini
- [ ] Piutang Rp 8.050.000 dari 4 order sama di Dashboard, Piutang, dan Invoice
- [ ] Total lini (290rb + 1,5jt + 4jt) berjumlah persis Rp 5.790.000
- [ ] Total produk terlaris berjumlah persis Rp 290.000 omzet dan Rp 94.500 HPP
- [ ] Laba bersih −Rp 2.894.950 = 5.790.000 − 3.094.500 − 4.800.000 − 790.450 (alokasi dana maintenance, business-flow 8.2). Prompt layar di atas masih memakai −Rp 2.104.500 dari sebelum alokasi ini ada.

**Isi yang gampang hilang** — tiap baris di sini menjaga satu keputusan di business-flow

- [ ] POS: customer tampil sebagai teks pasif, bukan field wajib (5.1)
- [ ] Blast WhatsApp: tidak ada tombol "Kirim Semua", alert keterbatasan ada di paling atas (5.6)
- [ ] Blast Email: alert "customer tanpa email tidak masuk daftar" ada
- [ ] Invoice: tombolnya "Buka WhatsApp", bukan "Kirim", plus hint bahwa pengiriman manual (5.6)
- [ ] Laba Rugi: alert basis kas ada di atas, sebelum angka apa pun (bagian 7)
- [ ] Margin per Lini: kesimpulan "Event 69% omzet, margin 30%" tampil sebagai kalimat, bukan cuma tabel
- [ ] Order Detail: field Hasil Foto disabled sampai status Selesai Dikerjakan
- [ ] Katalog: kolom HPP dan Margin diisi "—" untuk baris Jasa

---

## 7. Setelah Semua Layar Jadi

1. Jalankan checklist bagian 6. Perbaikan aturan di DESIGN.md lebih murah daripada meregenerate layar satu per satu.
2. Ekspor semua layar, lalu tinjau berdampingan dalam satu papan — inkonsistensi antar layar baru kelihatan saat disandingkan, bukan saat dilihat satu-satu.
3. Bawa dua layar ke client sebagai bahan konfirmasi bagian 2 business-flow (Pertanyaan Terbuka): **Laba Rugi** untuk mengunci keputusan basis kas vs akrual, dan **Blast WhatsApp** untuk menjelaskan keterbatasan WhatsApp sejak awal. Keduanya jauh lebih mudah dibahas lewat gambar daripada lewat dokumen.
4. Baru masuk rencana teknis.

> Tiga catatan dari review business-flow yang belum diputuskan dan akan mengubah layar kalau jawabannya berbeda: HPP belum di-snapshot di OrderItem (margin historis bisa berubah surut), `katalog_id` perlu nullable untuk item event custom, dan belum ada konsep kas vs rekening padahal basis kas dipilih justru supaya cocok dengan mutasi. Layar yang terkena: Katalog, Form Order, Laporan.
