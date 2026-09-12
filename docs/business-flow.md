# Flow Bisnis — Web App Photo Studio

Dokumen: 22 Agustus 2026
Status: Draft untuk dikonfirmasi ke client

---

## 1. Konteks Bisnis

Client bergerak di bidang fotografi dengan empat lini pendapatan:

| Lini | Contoh | Sifat |
|---|---|---|
| Jasa studio | Sesi foto di studio | Terjadwal, ada booking |
| Jasa outdoor | Wedding, prewedding | Terjadwal jauh hari, nilai besar |
| Produk fisik | Keychain foto, cetak foto, bingkai | Beli-langsung-selesai |
| Add-on | Cetak tambahan, editing | Nempel ke jasa atau berdiri sendiri |

**Kondisi saat ini:** bisnis baru berjalan ± 1 minggu. Belum ada pendataan sama sekali — tidak ada buku, tidak ada spreadsheet. Owner sadar ini masalah dan ingin langsung pakai web app.

**Pengguna app:** owner sendiri (1 orang). Volume transaksi masih sepi (< 10/hari).

**Goal utama:** pendataan yang transparan — owner tahu uang masuk dari mana, keluar ke mana, dan lini mana yang benar-benar untung.

### Konsekuensi dari "bisnis baru 1 minggu"

Ini kondisi yang paling nentuin desain, dan perlu disadari sejak awal:

1. **Flow operasional client belum stabil.** Harga, paket, dan cara kerja masih akan berubah dalam 3–6 bulan ke depan. Desain app harus gampang diubah, bukan dikunci ke asumsi hari ini.
2. **Belum ada data historis.** Semua master data (produk, jasa, harga, HPP) harus diisi manual dari nol sebelum app bisa dipakai.
3. **Risiko terbesar bukan teknis, tapi disiplin input.** Kalau owner malas mencatat, app sebagus apa pun jadi sampah dalam 2 minggu. Karena itu target desain utama: **satu transaksi selesai diinput dalam < 30 detik**. Setiap field yang tidak wajib harus benar-benar opsional.

---

## 2. Asumsi & Pertanyaan Terbuka

Bagian ini yang paling perlu dibawa ke client. Selama belum terjawab, dokumen ini jalan dengan asumsi yang ditulis di kolom kanan.

| # | Pertanyaan | Asumsi sementara |
|---|---|---|
| 1 | "POS di lokasi" — POS hanya dipakai di studio untuk transaksi walk-in, atau juga dipakai saat job outdoor? | Hanya di studio |
| 2 | "Pendataan pos barang dan jasa" — maksudnya Point of Sale, atau pelacakan stok barang? | Point of Sale. Stok belum dilacak |
| 3 | Aturan DP: persentase tetap (mis. 30%) atau nego per deal? | Nego per deal, nominal bebas |
| 4 | Harga paket jasa: fixed dari katalog atau custom per deal? | Fixed untuk studio, custom untuk event |
| 5 | Crew (fotografer, videografer, MUA): karyawan tetap atau freelance per job? | Freelance per job → masuk biaya langsung, bukan biaya operasional |
| 6 | Kebijakan pembatalan & refund DP? | Belum ada. Order bisa dibatalkan, DP dicatat sebagai hangus |
| 7 | Laporan pakai basis kas atau akrual? | Basis kas (lihat bagian 7) |
| 8 | Perlu nomor invoice resmi berurutan untuk pajak? | Belum. Nomor internal saja |
| 9 | Sesi studio bisa walk-in (customer datang langsung tanpa booking, kalau slot kosong) atau wajib booking dulu? | Bisa walk-in. Ditangani sebagai Order `studio` yang langsung berstatus **Dikerjakan** tanpa melewati **Booking** — tidak butuh flow baru |

---

## 3. Entitas Inti

Sebelum bicara flow, ini kerangka datanya. Semua flow di bawah bermuara ke sini.

```
Customer
   │
   └──< Order ──< OrderItem  >── Katalog (Produk / Jasa)
          │
          ├──< Payment      (uang masuk, bisa lebih dari satu per order)
          │
          └──< BiayaJob     (uang keluar yang nempel ke order ini)

BiayaOperasional  (uang keluar bulanan, tidak nempel ke order mana pun)
```

**Customer** — nama, no HP, email, sumber tahu (IG / teman / lewat depan studio), catatan, tanggal pertama transaksi.

**Katalog** — dua jenis dalam satu daftar:
- *Produk* (keychain, cetak 4R, bingkai): punya HPP bahan per unit yang diisi manual.
- *Jasa* (paket studio 1 jam, paket prewed, paket wedding): punya harga jual, tapi HPP-nya tidak tetap — dicatat per job lewat BiayaJob.

**Order** — satu tabel untuk semua jenis transaksi, dibedakan oleh field `tipe`: `retail` / `studio` / `event`. Menyimpan customer, tanggal transaksi, jadwal (kalau ada), lokasi, total, diskon, link hasil foto, catatan.

**OrderItem** — baris item: referensi ke katalog, qty, harga satuan saat itu.

**Payment** — tanggal, nominal, metode (tunai / transfer / QRIS), keterangan (DP / pelunasan / termin 2).

**BiayaJob** — biaya langsung yang nempel ke satu order: fee fotografer, fee MUA, transport, sewa lokasi, sewa alat, bahan tambahan.

**BiayaOperasional** — biaya bulanan yang tidak bisa dinisbatkan ke order tertentu: sewa tempat, listrik, internet, langganan software, iklan.

### Keputusan desain yang perlu dicatat

**Satu tabel Order untuk tiga jenis transaksi, bukan tiga sistem terpisah.**
Retail, studio, dan event kelihatannya beda jauh, tapi yang menyatukan ketiganya cuma dua hal: siapa customer-nya, dan arus uangnya. Kalau dipecah jadi tiga sistem, laporan laba rugi harus menggabungkan tiga sumber dan riwayat customer terpecah. Yang beda cukup form input di depannya, bukan strukturnya.

**Booking bukan tabel terpisah.**
Booking = Order bertipe `studio` atau `event` yang punya tanggal jadwal. Bikin tabel Booking terpisah berarti tiap booking yang jadi harus dikonversi ke Order — satu langkah manual yang gampang lupa, dan sumber data ganda. Kalau nanti perlu booking yang belum jelas jadi atau tidak, cukup pakai status `Booking` di Order yang sama.

**Status bayar tidak diinput manual.**
Lihat bagian 4.

---

## 4. Status Order

Ini titik yang paling sering salah dirancang. Sebuah order punya **dua dimensi status yang independen** — progres pengerjaan dan progres pembayaran. Kalau digabung jadi satu field, muncul kombinasi yang tidak bisa diwakili: foto sudah selesai dikerjakan tapi customer belum lunas, atau customer sudah lunas di muka tapi acaranya bulan depan. Keduanya normal terjadi di bisnis ini.

Jadi dipisah jadi dua field:

### Status Kerja (diinput manual)

```
Booking  →  Dijadwalkan  →  Dikerjakan  →  Selesai Dikerjakan  →  Diserahkan
                                                                        
   └────────────────────── Batal ──────────────────────┘
```

| Status | Artinya |
|---|---|
| Booking | Sudah deal tapi belum bayar apa pun / tanggal belum fix |
| Dijadwalkan | Tanggal fix, masuk kalender |
| Dikerjakan | Hari-H, sesi/acara sedang atau sudah berjalan |
| Selesai Dikerjakan | Pemotretan selesai, editing selesai, hasil siap |
| Diserahkan | Hasil sudah sampai ke customer |
| Batal | Dibatalkan di titik mana pun |

Order bertipe `retail` langsung lahir dengan status **Diserahkan** — barangnya dibawa pulang saat itu juga.

### Status Bayar (dihitung otomatis)

Bukan field yang diisi, tapi turunan dari total Payment dibanding total Order:

| Kondisi | Status |
|---|---|
| total bayar = 0 | Belum Bayar |
| 0 < total bayar < total order | DP / Sebagian |
| total bayar ≥ total order | Lunas |

Dibuat turunan supaya tidak mungkin terjadi status "Lunas" padahal pembayarannya kurang. Satu sumber kebenaran: catatan Payment.

---

## 5. Flow Bisnis

### 5.1 Walk-in Retail — keychain, cetak foto, bingkai

Transaksi paling sederhana dan paling sering. Target: selesai di bawah 30 detik.

1. Customer datang dan pilih barang.
2. Owner buka layar POS, pilih item dari katalog, isi qty.
3. Total dihitung otomatis. Owner bisa isi diskon kalau ada.
4. **Customer bersifat opsional.** Kalau customer mau nomornya dicatat (misal untuk dikirimi file foto), isi nama + HP. Kalau tidak, transaksi tetap bisa disimpan atas nama "Umum".
5. Pilih metode bayar → simpan.
6. Nota bisa dicetak atau dikirim via WA (opsional).

Hasil: Order `retail`, status kerja **Diserahkan**, status bayar **Lunas**, dan HPP tercatat otomatis dari data HPP bahan di katalog.

> **Catatan penting:** jangan mewajibkan pengisian customer di flow retail. Mewajibkannya adalah cara tercepat membuat owner malas memakai app — dan begitu satu transaksi dilewat, data laporan sudah tidak bisa dipercaya. CRM lebih baik terisi 60% daripada app-nya ditinggal sama sekali.

### 5.2 Sesi Studio

1. Customer menghubungi (DM/WA/datang) menanyakan slot.
2. Owner cek kalender ketersediaan tanggal dan jam.
3. Buat Order `studio`: customer, paket dari katalog, tanggal + jam, status **Booking**.
4. Kirim invoice DP ke customer (link atau PDF).
5. Customer bayar DP → owner catat Payment. Status kerja naik jadi **Dijadwalkan**.
6. H-1: owner lihat daftar booking besok dan kirim reminder ke customer.
7. Hari-H sesi berjalan → status **Dikerjakan**.
8. Kalau ada biaya langsung (fee MUA, fotografer freelance), dicatat di BiayaJob order ini.
9. Editing selesai → status **Selesai Dikerjakan**.
10. Customer melunasi → catat Payment → status bayar otomatis jadi **Lunas**.
11. Hasil diunggah ke Google Drive, link-nya ditempel di Order → status **Diserahkan**.
12. App mengirim Thank You mail berisi link hasil foto.

### 5.3 Event Job — wedding, prewedding

Sama kerangkanya dengan studio, bedanya di rentang waktu (bisa 1–3 bulan dari deal ke serah terima), nilai transaksi, dan jumlah biaya langsung.

1. Inquiry masuk → catat sebagai Customer, buat Order `event` status **Booking**.
2. Negosiasi paket. Item bisa custom, tidak harus persis dari katalog.
3. Deal → kirim invoice DP.
4. DP masuk → catat Payment → status **Dijadwalkan**, tanggal acara masuk kalender.
5. Sebelum hari-H: catat rencana biaya (crew, transport, sewa alat/lokasi) sebagai perkiraan.
6. Hari-H: eksekusi → status **Dikerjakan**.
7. Setelah acara: catat **biaya aktual** — fee fotografer, videografer, MUA, transport, sewa. Ini yang menentukan job tersebut benar-benar untung atau tidak.
8. Proses editing (bisa berminggu-minggu) → **Selesai Dikerjakan**.
9. Pelunasan → catat Payment.
10. Album/file diserahkan, link ditempel → **Diserahkan**.
11. Thank You mail + permintaan review/testimoni.

> **Gotcha:** karena rentangnya panjang, sangat mungkin DP masuk di bulan Januari tapi acaranya Maret dan pelunasan April. Cara laporan memperlakukan ini dibahas di bagian 7 — dan ini keputusan yang harus disepakati client di awal, karena mengubahnya belakangan berarti seluruh laporan historis berubah angka.

### 5.4 Pembayaran & Piutang

Satu order bisa punya banyak Payment. Setiap Payment mencatat tanggal, nominal, metode, dan keterangan.

Dari sini muncul satu layar yang paling sering dibuka owner: **daftar piutang** — semua order yang status bayarnya belum Lunas, diurutkan berdasarkan tanggal acara atau umur tagihan. Tanpa layar ini, tagihan yang belum ditagih akan terlupakan, dan ini kebocoran paling umum di bisnis jasa.

### 5.5 Invoice & Thank You Mail

**Invoice** digenerate dari Order, tidak diketik ulang. Isinya: identitas studio, data customer, rincian item, total, riwayat pembayaran, sisa tagihan, dan instruksi transfer. Dibagikan sebagai link atau PDF.

Satu invoice bisa dikirim berkali-kali seiring pembayaran bertambah — isinya selalu mencerminkan kondisi terkini, jadi tidak perlu bikin dokumen terpisah untuk DP dan pelunasan.

**Thank You mail** dikirim saat order berpindah ke status **Diserahkan**. Isinya ucapan terima kasih, link hasil foto, dan ajakan memberi review. Template-nya bisa diedit owner.

### 5.6 CRM & Blast

Yang dibutuhkan di sini bukan CRM dalam arti sales pipeline — client sudah menyebutkan sendiri bahwa yang diperlukan hanya pendataan customer agar bisa blast. Jadi isinya:

1. Daftar customer terkumpul otomatis dari semua order.
2. Filter: pernah beli lini apa, terakhir transaksi kapan, sumber tahunya dari mana.
3. **Blast email** — dikirim langsung dari app. Volume kecil, jadi tidak perlu layanan khusus.
4. **Blast WhatsApp** — app menyiapkan daftar nomor terfilter dan template pesan, lalu owner mengirim lewat WhatsApp. Dua cara: klik link `wa.me` per customer, atau salin daftar nomor untuk dipakai di broadcast list WhatsApp Business.
5. Catat kapan seorang customer terakhir di-blast, supaya tidak dikirimi berulang.

> **Gotcha WhatsApp — perlu dijelaskan ke client sejak awal.**
> Mengirim blast WhatsApp otomatis dari aplikasi memerlukan WhatsApp Business API: harus verifikasi bisnis ke Meta, template pesan harus disetujui dulu, dan ada biaya per pesan terkirim. Untuk jumlah customer yang masih puluhan, biaya dan kerumitannya jauh melebihi manfaatnya.
> Pendekatan di dokumen ini (app menyiapkan, owner yang mengirim) memberi hasil yang sama tanpa biaya dan tanpa proses verifikasi.
> Perlu diketahui juga: broadcast list di WhatsApp Business dibatasi 256 kontak, dan pesan broadcast **hanya sampai ke penerima yang sudah menyimpan nomor kita**. Ini batasan WhatsApp, bukan batasan app. Kalau nanti customer sudah ribuan, baru pindah ke API.

### 5.7 Tutup Buku Bulanan

1. Owner mencatat biaya operasional bulan berjalan (sewa, listrik, internet, iklan).
2. Buka laporan laba rugi periode tersebut.
3. Cek breakdown margin per lini — ini output paling berharga bagi owner.
4. Cek daftar piutang yang masih menggantung.

---

## 6. Daftar Module

Sepuluh module, mencakup seluruh kebutuhan di dokumen kebutuhan awal. Karena penggunanya satu orang dan volumenya kecil, setiap module bisa dibuat versi tipis — tidak perlu POS berkecepatan tinggi, tidak perlu manajemen hak akses.

| # | Module | Isi | Melayani flow |
|---|---|---|---|
| 1 | **Dashboard** | Booking hari ini, omzet bulan berjalan, order belum lunas, tugas yang perlu ditindaklanjuti | Semua |
| 2 | **Katalog** | Produk & jasa, harga jual, HPP bahan per unit, kategori, aktif/nonaktif | 5.1–5.3 |
| 3 | **Customer** | Data customer, riwayat transaksi, sumber, catatan, tag | 5.6 |
| 4 | **POS** | Transaksi walk-in cepat, pilih item, diskon, bayar, nota | 5.1 |
| 5 | **Order & Booking** | Order studio & event, kalender jadwal, status kerja, link hasil foto | 5.2, 5.3 |
| 6 | **Pembayaran** | Catat DP/termin/pelunasan, daftar piutang, rekap metode bayar | 5.4 |
| 7 | **Biaya** | Biaya langsung per order + biaya operasional bulanan | 5.3, 5.7 |
| 8 | **Invoice** | Generate dari order, bagikan link/PDF, riwayat pengiriman | 5.5 |
| 9 | **Komunikasi** | Thank You mail, blast email, penyiapan blast WA, editor template | 5.5, 5.6 |
| 10 | **Laporan** | Laba rugi, omzet per lini, margin per lini, piutang, produk terlaris, customer teratas | 5.7 |

### Urutan pengerjaan yang disarankan

Bukan pemangkasan scope — semua module tetap dibangun. Ini soal urutan, supaya app bisa mulai dipakai (dan mulai mengumpulkan data) sebelum semuanya selesai:

1. **Fondasi** — Katalog, Customer, Order, Pembayaran, Biaya. Tanpa ini tidak ada yang bisa dicatat.
2. **Dipakai harian** — POS, Order & Booking, Dashboard. Titik ini app sudah bisa dipakai operasional.
3. **Menghadap customer** — Invoice, Komunikasi.
4. **Hasil** — Laporan. Ditaruh terakhir karena butuh data dari semua module sebelumnya untuk bisa diuji dengan angka nyata.

---

## 7. Perhitungan Laba Rugi

### Basis pengakuan pendapatan

Keputusan yang harus disepakati client di awal, karena mengubahnya belakangan mengubah seluruh angka historis.

| | Basis Kas | Basis Akrual |
|---|---|---|
| Omzet diakui saat | uang diterima | jasa selesai dikerjakan |
| DP wedding Januari untuk acara Maret | masuk omzet Januari | masuk omzet Maret |
| Kelebihan | Sesuai isi rekening, gampang dipahami | Lebih akurat menggambarkan kinerja |
| Kekurangan | Bulan dengan banyak DP terlihat bagus padahal kerjanya belum | Perlu disiplin, dan uang di laporan ≠ uang di rekening |

**Asumsi dokumen ini: basis kas.** Alasannya, ini yang cocok untuk UMKM dan yang paling gampang dicocokkan owner dengan mutasi rekening — kalau angka laporan tidak cocok dengan rekening, owner akan berhenti percaya pada app-nya. Kekurangannya ditutup dengan menyediakan layar terpisah: **order berjalan & sisa tagihan**, supaya owner tetap tahu ada pekerjaan yang belum dibayar penuh.

### Struktur laporan

```
OMZET (uang diterima pada periode ini)
   Retail / produk fisik
   Jasa studio
   Jasa event (wedding, prewed)
 = Total Omzet

BIAYA LANGSUNG
   HPP bahan produk         (HPP katalog × qty terjual)
   Biaya job                (fee crew, transport, sewa lokasi/alat)
 = Total Biaya Langsung

LABA KOTOR = Total Omzet − Total Biaya Langsung

BIAYA OPERASIONAL
   Sewa tempat, listrik, internet
   Gaji tetap (kalau ada)
   Iklan & marketing
   Lain-lain
 = Total Biaya Operasional

LABA BERSIH = Laba Kotor − Total Biaya Operasional
```

### Margin per lini

Tabel terpisah yang menampilkan omzet, biaya langsung, dan margin untuk masing-masing lini (retail / studio / event). Ini yang menjawab pertanyaan paling penting bagi owner: **lini mana yang sebenarnya menghasilkan uang.** Sering kali lini yang omzetnya paling besar justru marginnya paling tipis setelah fee crew dan transport dihitung — dan tanpa tabel ini, itu tidak akan pernah kelihatan.

### Soal HPP — jawaban atas pertanyaan di dokumen kebutuhan

Dokumen kebutuhan menanyakan "perlu menghitung HPP? riset dulu". Jawabannya: perlu, tapi ada **dua jenis HPP yang berbeda** dan sering tertukar.

**HPP produk fisik** — biaya bahan per unit. Keychain sekian rupiah, cetak 4R sekian, bingkai sekian. Diisi manual sekali di katalog, lalu ikut terhitung otomatis setiap penjualan. Ini yang paling sering bocor: produk terlihat untung karena harga bahannya tidak pernah dihitung.

**HPP jasa** — bukan biaya bahan, tapi **biaya langsung per job**: fee fotografer, videografer, MUA, transport, sewa lokasi, sewa alat, editor. Berbeda-beda tiap job, jadi tidak bisa ditaruh di katalog — harus dicatat per order lewat BiayaJob.

**Yang sengaja tidak dilakukan:** metode costing persediaan (FIFO / rata-rata) dan alokasi biaya overhead ke tiap job. Keduanya menambah kerumitan besar dengan manfaat yang tidak terasa di skala bisnis ini. Overhead cukup dicatat sebagai biaya operasional bulanan, tidak perlu dibagi-bagi ke tiap order.

---

## 8. Yang Sengaja Tidak Masuk

Bukan karena tidak berguna, tapi karena biayanya melebihi manfaatnya pada skala saat ini. Ditulis eksplisit supaya tidak diperdebatkan ulang di kemudian hari.

| Tidak dibangun | Alasan | Kapan ditinjau ulang |
|---|---|---|
| Penyimpanan & galeri foto di app | Biaya penyimpanan foto wedding besar, dan client sudah punya Google Drive. Cukup tempel link di Order | Kalau client minta customer bisa login lihat hasil sendiri |
| Portal login customer | Satu link Drive menyelesaikan masalah yang sama | Sama seperti di atas |
| Payment gateway | Pembayaran masih transfer manual, dan pencocokan manual masih ringan di volume ini | Kalau transaksi > 30/hari |
| Hak akses & peran pengguna | Penggunanya satu orang | Saat ada staff yang ikut input |
| Pelacakan stok bahan | HPP manual di katalog sudah cukup untuk laporan. Stok baru penting kalau sering kehabisan bahan | Kalau pernah kehilangan penjualan karena kehabisan stok |
| WhatsApp Business API | Lihat gotcha di 5.6 | Kalau customer > 1000 |
| Program loyalitas / poin | Belum ada basis customer untuk diloyalkan | Setelah ada customer berulang yang signifikan |
| Multi-cabang | Baru satu studio | Kalau buka cabang |

---

## 9. Langkah Berikutnya

1. Bawa **bagian 2 (Pertanyaan Terbuka)** ke client. Sembilan jawaban itu mengunci sisa desain.
2. Konfirmasi **basis kas vs akrual** (bagian 7) — ini keputusan yang paling mahal kalau diubah belakangan.
3. Minta client menyiapkan daftar produk, jasa, harga jual, dan harga bahan. Ini pekerjaan client, bukan pekerjaan developer, dan biasanya jadi penghambat terlama.
4. Setelah pertanyaan terjawab, dokumen ini direvisi jadi spesifikasi final sebelum masuk ke rencana teknis.
