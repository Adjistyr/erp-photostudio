# Flow Bisnis — Web App Photo Studio

Dokumen: 22 Agustus 2026
Revisi: 28 September 2026 — modal, pos dana & bagi hasil (bagian 8), dari sheet [HPP & pembagian hasil](./original-template/hpp-pembagaian-hasil-potraittime.md) client
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

**Pengguna app:** dua owner — Agung dan Raka — dengan akses penuh ke semua module. Keduanya tidak digaji; penghasilan owner hanya dari bagi hasil (bagian 8). Staf yang digaji (marketing, tim desain) belum ikut input. Volume transaksi masih sepi (< 10/hari).

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
| 4 | Harga paket jasa: fixed dari katalog atau custom per deal? | Fixed dari katalog, plus **item custom** (nama + harga deal, tanpa HPP) untuk studio maupun event sejak spek 1.3. Retail (POS) tetap katalog saja |
| 5 | Crew (fotografer, videografer, MUA): karyawan tetap atau freelance per job? | **Terjawab:** belum ada crew tetap. Freelance, transport, dan sewa lokasi/alat dicatat per job sebagai biaya langsung — ini inti yang client mau lihat, jadi Biaya Job diprioritaskan |
| 6 | Kebijakan pembatalan & refund DP? | Belum ada. Order bisa dibatalkan, DP dicatat sebagai hangus. Diputuskan 2026-10-06: margin order batal = uang yang diterima − biaya job (bukan total order), dan biaya job yang sudah keluar boleh dicatat ke order batal |
| 7 | Laporan pakai basis kas atau akrual? | Basis kas (lihat bagian 7) |
| 8 | Perlu nomor invoice resmi berurutan untuk pajak? | Belum. Nomor internal saja |
| 9 | Sesi studio bisa walk-in (customer datang langsung tanpa booking, kalau slot kosong) atau wajib booking dulu? | Bisa walk-in. Ditangani sebagai Order `studio` yang langsung berstatus **Dikerjakan** tanpa melewati **Booking** — tidak butuh flow baru |
| 10 | Satu botol tinta cukup untuk berapa lembar cetak? | Belum diketahui. Tinta dicatat sebagai biaya operasional dulu (bagian 7, Soal HPP) |
| 11 | Ada kesepakatan rasio bagi hasil berubah setelah modal owner kembali? | Belum diketahui. Tidak menghambat — perubahan rasio selalu manual (bagian 8) |
| 12 | Aturan rugi bulanan: dibawa ke bulan berikutnya? | Dibawa ke bulan berikutnya, dikompensasi sebelum laba dibagi (bagian 8) |

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

Owner ──< SetoranOwner      (uang masuk dari owner: pinjaman / modal — bukan omzet)
  └────< RasioBagiHasil     (persen per owner, berlaku mulai bulan tertentu)

PosDana ──< MutasiDana      (dana maintenance & cadangan: alokasi masuk, pemakaian keluar)

Aset ──< ServisAset         (daftar alat → alokasi maintenance otomatis; riwayat perawatan)

Investasi                   (renovasi, beli alat — di luar laba rugi, dibiayai SetoranOwner modal; beli alat juga membuat Aset)
```

Entitas di blok bawah dijelaskan di bagian 8.

**Customer** — nama, no HP, email, sumber tahu (IG / teman / lewat depan studio), catatan, tanggal pertama transaksi.

**Katalog** — dua jenis dalam satu daftar:
- *Produk* (keychain, cetak 4R, bingkai): punya HPP bahan per unit yang diisi manual.
- *Jasa* (paket studio 1 jam, paket prewed, paket wedding): punya harga jual, tapi HPP-nya tidak tetap — dicatat per job lewat BiayaJob. Kategorinya **tiga nilai tetap** — Studio (muncul di order sesi studio), Event (order event), Add-on (keduanya) — karena kategori inilah yang menentukan paket mana yang ditawarkan form Buat Order. Kategori produk tetap bebas.

**Order** — satu tabel untuk semua jenis transaksi, dibedakan oleh field `tipe`: `retail` / `studio` / `event`. Menyimpan customer, tanggal transaksi, jadwal (kalau ada), lokasi, total, diskon, link hasil foto, catatan.

**OrderItem** — baris item: referensi ke katalog, qty, harga satuan saat itu. Item custom (harga nego di luar katalog) tidak punya referensi katalog dan tidak punya HPP — biaya nyatanya dicatat sebagai biaya job.

**Payment** — tanggal, nominal, metode (tunai / transfer / QRIS), keterangan (DP / pelunasan / termin 2).

**BiayaJob** — biaya langsung yang nempel ke satu order: fee fotografer, fee MUA, transport, sewa lokasi, sewa alat, bahan tambahan.

**BiayaOperasional** — biaya bulanan yang tidak bisa dinisbatkan ke order tertentu: sewa tempat, listrik, internet, langganan software, iklan, gaji staf. Kategori berupa saran, bukan daftar tertutup — kalau nanti owner mulai digaji, cukup dicatat dengan kategori "Gaji Owner" tanpa fitur baru.

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

Status kerja maju satu langkah per klik. Salah klik dikoreksi dengan **mundur satu langkah** ("Kembalikan ke …", dengan konfirmasi) — tercatat di riwayat order, pembayaran dan link hasil tidak berubah. **Batal** tetap final.

**Mengubah order (studio/event).** Reschedule, ganti jam/lokasi, tambah add-on, atau koreksi customer dilakukan lewat **Ubah** di detail order — bukan batalkan lalu buat ulang (pembatalan hanya untuk customer yang benar-benar batal; DP-nya baru dianggap hangus di situ). Harga item yang sudah ada tetap harga deal walau katalog naik; total baru tidak boleh di bawah yang sudah dibayar. Setelah **Diserahkan**, hanya catatan dan customer yang bisa diubah — jadwal dan item terkunci (keputusan K1). Order retail dan order batal tidak bisa diubah. Setiap perubahan tercatat di riwayat order.

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
4. **Customer bersifat opsional.** Kalau customer mau nomornya dicatat (misal untuk dikirimi file foto), isi nama + HP (HP hanya tersimpan bersama nama; nama yang sudah ada dicocokkan lewat HP dulu, lalu nama). Kalau tidak, transaksi tetap bisa disimpan sebagai walk-in tanpa customer.
5. Pilih metode bayar → simpan.
6. Setelah simpan muncul ringkasan transaksi dengan **struk**: cetak (kertas 80 mm), kirim via WA (kalau customer punya HP), atau salin link. Struk = halaman invoice publik untuk order retail (lunas). Panel **Hari ini** di bawah keranjang menampilkan transaksi POS hari ini (jumlah, total, 50 terbaru) dan bisa membuka ulang struknya.

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

Setelah pembayaran dicatat, app menawarkan **bukti bayar** untuk customer: kirim via WA (nominal diterima, sisa + jatuh tempo, atau "Lunas") atau salin link. Buktinya adalah link invoice yang sama — selalu memuat pembayaran terbaru, tidak ada kwitansi terpisah.

Dari sini muncul satu layar yang paling sering dibuka owner: **daftar piutang** — semua order yang status bayarnya belum Lunas, diurutkan berdasarkan tanggal acara atau umur tagihan. Tanpa layar ini, tagihan yang belum ditagih akan terlupakan, dan ini kebocoran paling umum di bisnis jasa. Tiap baris punya tombol **Tagih via WA**: pesannya dari template *Tagihan* di Komunikasi (bisa diubah owner; dipakai juga tombol WhatsApp di Invoice), pengiriman tetap manual.

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

1. Owner mencatat biaya operasional bulan berjalan (sewa, listrik, internet, iklan, gaji staf). Form diisi otomatis dari bulan lalu — sebagian besar barisnya sama tiap bulan, owner tinggal mengoreksi yang berubah.
2. Buka laporan laba rugi periode tersebut.
3. Cek breakdown margin per lini — ini output paling berharga bagi owner.
4. Cek daftar piutang yang masih menggantung.
5. Cek bagian bawah laporan: alokasi dana maintenance & cadangan, kompensasi rugi bulan lalu, dan bagian tiap owner (bagian 8). Angka ini dihitung, bukan diinput.

---

## 6. Daftar Module

Sepuluh module, mencakup seluruh kebutuhan di dokumen kebutuhan awal. Karena penggunanya dua owner dengan akses penuh dan volumenya kecil, setiap module bisa dibuat versi tipis — tidak perlu POS berkecepatan tinggi. Manajemen peran & hak akses tetap ada di kontrak (quotation deliverable 16), tapi ditunda sampai staf ikut input.

| # | Module | Isi | Melayani flow |
|---|---|---|---|
| 1 | **Dashboard** | Booking hari ini, omzet bulan berjalan, order belum lunas, tugas yang perlu ditindaklanjuti | Semua |
| 2 | **Katalog** | Produk & jasa, harga jual, HPP bahan per unit, kategori, aktif/nonaktif | 5.1–5.3 |
| 3 | **Customer** | Data customer, riwayat transaksi, sumber, catatan, tag | 5.6 |
| 4 | **POS** | Transaksi walk-in cepat, pilih item, diskon, bayar, nota | 5.1 |
| 5 | **Order & Booking** | Order studio & event, kalender jadwal, status kerja, link hasil foto | 5.2, 5.3 |
| 6 | **Pembayaran** | Catat DP/termin/pelunasan, daftar piutang, rekap metode bayar | 5.4 |
| 7 | **Biaya** | Biaya langsung per order + biaya operasional bulanan + pos dana (maintenance, cadangan), setoran owner, pengeluaran investasi | 5.3, 5.7, 8 |
| — | **Aset & Maintenance** (bonus, di luar quotation) | Daftar alat, alokasi maintenance otomatis, nilai buku, jadwal perawatan, riwayat servis, lepas/jual aset | 8.9 |
| 8 | **Invoice** | Generate dari order, bagikan link/PDF, riwayat pengiriman | 5.5 |
| 9 | **Komunikasi** | Thank You mail, blast email, penyiapan blast WA, editor template | 5.5, 5.6 |
| 10 | **Laporan** | Laba rugi, omzet per lini, margin per lini, piutang, produk terlaris, customer teratas, bagi hasil owner, progress balik modal, **kas harian** (penerimaan per hari × metode — untuk mencocokkan laci kas dan mutasi rekening tiap tutup hari; penerimaan saja) | 5.7, 8 |

### Urutan pengerjaan yang disarankan

Bukan pemangkasan scope — semua module tetap dibangun. Ini soal urutan, supaya app bisa mulai dipakai (dan mulai mengumpulkan data) sebelum semuanya selesai:

1. **Fondasi** — Katalog, Customer, Order, Pembayaran, Biaya. Tanpa ini tidak ada yang bisa dicatat. Di dalam Biaya, **biaya job** (transport, sewa lokasi, fee freelance, sewa alat) dikerjakan lebih dulu — itu yang client paling ingin lihat.
2. **Dipakai harian** — POS, Order & Booking, Dashboard. Titik ini app sudah bisa dipakai operasional.
3. **Menghadap customer** — Invoice, Komunikasi.
4. **Hasil** — Laporan. Ditaruh terakhir karena butuh data dari semua module sebelumnya untuk bisa diuji dengan angka nyata. Bagi hasil paling akhir di dalamnya, karena bergantung pada laba bersih yang sudah benar.

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
   Gaji staf (marketing, tim desain) — owner tidak digaji
   Tinta (sementara, sampai HPP per lembar diketahui)
   Iklan & marketing
   Lain-lain
 = Total Biaya Operasional

ALOKASI DANA MAINTENANCE    (dihitung dari daftar aset, bagian 8.9)

LABA BERSIH = Laba Kotor − Total Biaya Operasional − Alokasi Dana Maintenance

   − Kompensasi rugi bulan-bulan sebelumnya
 = LABA YANG DIBAGI (kalau > 0)
   → Dana cadangan     (% sesuai rasio yang berlaku)
   → Bagian tiap owner (% sesuai rasio yang berlaku)
```

Blok setelah laba bersih — kompensasi rugi, cadangan, dan bagian owner — dijelaskan di bagian 8. Setoran owner, pemakaian pos dana, dan pengeluaran investasi **tidak muncul** di laporan ini sama sekali.

### Margin per lini

Tabel terpisah yang menampilkan omzet, biaya langsung, dan margin untuk masing-masing lini (retail / studio / event). Ini yang menjawab pertanyaan paling penting bagi owner: **lini mana yang sebenarnya menghasilkan uang.** Sering kali lini yang omzetnya paling besar justru marginnya paling tipis setelah fee crew dan transport dihitung — dan tanpa tabel ini, itu tidak akan pernah kelihatan.

### Soal HPP — jawaban atas pertanyaan di dokumen kebutuhan

Dokumen kebutuhan menanyakan "perlu menghitung HPP? riset dulu". Jawabannya: perlu, tapi ada **dua jenis HPP yang berbeda** dan sering tertukar.

**HPP produk fisik** — biaya bahan per unit. Keychain sekian rupiah, cetak 4R sekian, bingkai sekian. Diisi manual sekali di katalog, lalu ikut terhitung otomatis setiap penjualan. Ini yang paling sering bocor: produk terlihat untung karena harga bahannya tidak pernah dihitung.

**HPP jasa** — bukan biaya bahan, tapi **biaya langsung per job**: fee fotografer, videografer, MUA, transport, sewa lokasi, sewa alat, editor. Berbeda-beda tiap job, jadi tidak bisa ditaruh di katalog — harus dicatat per order lewat BiayaJob.

**Yang sengaja tidak dilakukan:** metode costing persediaan (FIFO / rata-rata) dan alokasi biaya overhead ke tiap job. Keduanya menambah kerumitan besar dengan manfaat yang tidak terasa di skala bisnis ini. Overhead cukup dicatat sebagai biaya operasional bulanan, tidak perlu dibagi-bagi ke tiap order.

**Istilah "HPP" di sheet client berbeda arti.** Di sheet [HPP & pembagian hasil](./original-template/hpp-pembagaian-hasil-potraittime.md), "HPP Operasional" dan "HPP Maintenance" sebenarnya overhead bulanan dan dana servis alat — bukan HPP dalam arti dokumen ini. Di app dipakai nama **Biaya Operasional** dan **Dana Maintenance**, supaya "HPP" hanya punya satu arti: biaya bahan per unit.

**Tinta & kertas.** Di sheet client keduanya masuk biaya bulanan tetap. Padahal pemakaiannya naik-turun mengikuti jumlah cetak — cetak 500 lembar sebulan butuh kertas 10× lipat, tapi sheet tetap mencatat Rp 39.000.
- **Kertas** dipindah ke HPP per unit di katalog: Rp 39.000 isi 50 = **Rp 780/lembar**.
- **Tinta** tetap di biaya operasional sampai jumlah lembar per botol diketahui. Ini normal di UMKM untuk bahan habis pakai yang sulit diukur per unit. Konsekuensinya margin retail tampil sedikit lebih tinggi dari kenyataan (± Rp 277.000/bulan tidak masuk HPP retail).
- Angka tinta bisa didapat dari app sendiri: catat tanggal buka botol baru, lalu saat habis bagi dengan jumlah lembar cetak yang terjual di POS pada rentang itu.
- **Gotcha:** begitu bahan masuk HPP per unit, **hapus dari biaya operasional**. Kalau tidak, biayanya terhitung dua kali.

---

## 8. Modal, Pos Dana & Bagi Hasil

Sumber bagian ini: sheet [HPP & pembagian hasil](./original-template/hpp-pembagaian-hasil-potraittime.md) yang dipakai client sekarang. Usaha ini dimiliki dua owner — Agung 70%, Raka 30% — yang tidak digaji dan hanya menerima bagi hasil. Rasio 70/30 kemungkinan cara agar modal yang disetor Agung lebih cepat kembali.

Laporan laba rugi (bagian 7) berhenti di laba bersih. Bagian ini mengatur apa yang terjadi **sesudahnya**, dan uang yang keluar-masuk **di luar** laba rugi.

### 8.1 Dari sheet client ke app

| Di sheet | Di app | Catatan |
|---|---|---|
| Biaya Bulanan (sewa, listrik, internet, gaji staf, VPS) | Biaya Operasional | Sudah ada di bagian 3 |
| Tinta & kertas di Biaya Bulanan | Kertas → HPP per unit, tinta → Biaya Operasional sementara | Bagian 7, Soal HPP |
| Biaya Maintenance (daftar alat, 5% harga per bulan) | **Daftar Aset** + **Pos Dana Maintenance** | 8.9, 8.2 |
| Dana cadangan 10% | **Pos Dana Cadangan** | 8.2 |
| Pembagian hasil 70/30 | **Rasio Bagi Hasil** | 8.5, 8.6 |
| HPP per hari (total ÷ 31) | KPI **titik impas** di Dashboard | Omzet bulan berjalan dibanding total biaya tetap bulanan. Angka harian hanya tampilan — pembaginya jumlah hari bulan itu, bukan 31 tetap |

**Koreksi angka sheet — perlu disampaikan ke client.** Total maintenance per bulan di sheet (Rp 693.100) tidak dikali jumlah unit, padahal baterai, memory card, dan lighting masing-masing 2 unit. Yang benar **Rp 790.450**. Kolom per harinya (Rp 25.498) sudah dikali jumlah unit, sehingga dua kolom itu tidak konsisten (Rp 277.010 × 31 = Rp 8.587.310, bukan Rp 8.489.949). Akibatnya laba di sheet terlalu tinggi Rp 97.350/bulan dan ikut terbagi ke owner.

Contoh sheet dengan angka terkoreksi (omzet Rp 10.000.000, belum termasuk HPP bahan dan biaya job):

```
Omzet                              10.000.000
− Biaya operasional                −7.796.849
− Alokasi dana maintenance           −790.450
= Laba bersih                       1.412.701
− Dana cadangan 10%                  −141.270
= Dibagi                            1.271.431
   Agung 70%                          890.002   (sheet: 951.332)
   Raka  30%                          381.429   (sheet: 407.714)
```

Titik impas dengan angka ini ± Rp 8.590.000/bulan.

### 8.2 Pos Dana — maintenance & cadangan

Dua dana yang disisihkan dari laba, dengan satu mekanisme yang sama:

| Pos | Alokasi masuk | Dipakai untuk |
|---|---|---|
| **Maintenance** | Dihitung dari daftar aset (sekarang Rp 790.450), diambil sebelum laba bersih — tetap diambil saat rugi. Ditambah hasil jual aset | Servis dan ganti alat |
| **Cadangan** | Persentase dari laba yang dibagi (sekarang 10%), hanya kalau laba > 0 | Pembelian mendesak |

**Saldo** = total alokasi − total pemakaian. Setiap pemakaian dicatat sebagai `MutasiDana`: tanggal, pos, nominal, keterangan, pencatat.

Aturan:
- **Pemakaian pos dana tidak masuk laba rugi.** Uangnya sudah dikurangi dari laba saat disisihkan. Kalau servis kamera dicatat juga sebagai biaya operasional, laba terpotong dua kali. Ini **blocker** — form pemakaian dana dan form biaya operasional harus terpisah jelas.
- **Saldo tidak boleh minus.** Kalau pemakaian melebihi saldo, app menolak dan meminta setoran owner dicatat lebih dulu (8.3). Pinjaman ini dikembalikan dari alokasi pos dana yang sama di bulan-bulan berikutnya, sebelum saldo bertambah.
- Maintenance **tidak berhenti** setelah 20 bulan (5% × 20). Ini dana servis untuk siklus ganti alat, bukan penyusutan akuntansi.
- Nominal maintenance **tidak diketik manual** — dihitung dari daftar aset (8.9). Aset punya tanggal beli dan tanggal lepas, jadi aset baru tidak mengubah laba bulan lalu.
- Pos dana adalah **peruntukan**, bukan rekening terpisah. Uangnya tetap di rekening usaha yang sama.

### 8.3 Setoran owner — pinjaman atau modal

Uang yang masuk dari owner ke usaha. **Bukan omzet** dan tidak memengaruhi laba. Dicatat sebagai `SetoranOwner`: owner, tanggal, nominal, jenis, tujuan (kas / pos dana / investasi), keterangan.

| | Pinjaman | Modal |
|---|---|---|
| Contoh | Menutup rugi, menutup kekurangan pos dana | Modal awal, renovasi, beli alat baru |
| Dikembalikan? | Ya — dari laba sebelum dibagi (8.5), atau dari alokasi pos dana kalau tujuannya pos dana (8.2) | Tidak dikembalikan langsung. Kembalinya lewat bagi hasil |
| Memengaruhi rasio? | Tidak | Tidak otomatis — perubahan rasio keputusan owner (8.6) |

**Kenapa pinjaman jadi default untuk menutup rugi, bukan modal:** kalau Agung menyetor dan Raka tidak, model modal membuat 70/30 tidak adil lagi dan rasio harus dinegosiasi ulang. Model pinjaman adil tanpa mengubah rasio — uang Agung kembali dulu, baru sisanya dibagi.

Pinjaman dari lebih dari satu owner dikembalikan berurutan berdasarkan tanggal setor.

### 8.4 Pengeluaran investasi

Renovasi, beli kamera, beli lighting — pengeluaran besar yang manfaatnya bertahun-tahun. Dicatat dengan kategori **Investasi**, **di luar laba rugi**, dan bisa ditautkan ke setoran modal owner yang membiayainya.

**Kenapa tidak dicatat sebagai biaya operasional:** renovasi Rp 20 juta di satu bulan membuat bulan itu rugi besar. Rugi itu dikompensasi dari laba bulan-bulan berikutnya (8.5), sehingga bagi hasil **kedua** owner tertahan berbulan-bulan — artinya modal Agung ikut "dikembalikan" dari bagian Raka. Itu bertentangan dengan tujuan rasio 70/30. Pencatatan sebagai Investasi adalah **blocker** — form biaya harus membedakannya.

Servis dan ganti alat yang rutin **bukan** Investasi — itu pemakaian Pos Dana Maintenance.

### 8.5 Kompensasi rugi & perhitungan bagi hasil

Kalau satu bulan rugi, bulan itu tidak ada bagi hasil dan tidak ada alokasi cadangan. Rugi dibawa ke bulan berikutnya dan ditutup lebih dulu sebelum laba dibagi.

Rugi dan pinjaman owner sering berupa **uang yang sama** — owner meminjamkan uang justru karena rugi. Kalau keduanya dipotong terpisah, laba terpotong dua kali. Karena itu potongannya satu:

```
Potongan  = min( laba bersih,
                 max( akumulasi rugi belum tertutup,
                      sisa pinjaman owner ke kas ) )

Potongan dipakai:   1. melunasi pinjaman owner (urut tanggal setor)
                    2. sisanya tetap di kas
Akumulasi rugi dan sisa pinjaman sama-sama berkurang sebesar potongan.

Laba yang dibagi = laba bersih − potongan
   → Dana cadangan : % cadangan × laba yang dibagi
   → Tiap owner    : % owner × (laba yang dibagi − dana cadangan)
```

Contoh:

```
Bulan 1: rugi −2.000.000 → Agung setor pinjaman 2.000.000
Bulan 2: laba bersih 3.000.000
   Potongan = min(3 jt, max(2 jt, 2 jt)) = 2.000.000 → pinjaman Agung lunas
   Dibagi   = 1.000.000
   → Cadangan 100.000 · Agung 630.000 · Raka 270.000
```

Kalau tidak ada yang menyetor (rugi ditutup dari kas yang ada), potongannya sama — bedanya uang itu tetap di kas, tidak dibayarkan ke siapa pun.

Semua angka di bagian ini **dihitung dari riwayat setiap kali laporan dibuka**, bukan disimpan. Pada volume transaksi ini tidak ada masalah performa, dan tidak ada angka tersimpan yang bisa basi.

### 8.6 Rasio bagi hasil — berubah per periode

Rasio bisa berubah, misalnya setelah modal Agung kembali. Karena itu rasio **tidak** disimpan sebagai satu pengaturan yang diedit langsung — mengubah 70/30 jadi 60/40 akan diam-diam mengubah bagi hasil semua bulan lama.

`RasioBagiHasil`: berlaku mulai (bulan), persen per owner, dan persen dana cadangan. Alokasi maintenance tidak di sini — dihitung dari daftar aset (8.9). Satu baris memuat seluruh aturan satu periode, jadi validasi "total 100%" dicek per baris. Persen disimpan sebagai bilangan bulat — pecahan desimal tidak selalu berjumlah persis 100%.

- Mengubah rasio = **menambah baris baru** yang berlaku mulai bulan tertentu, bukan mengedit baris lama.
- Laporan bulan M memakai rasio terakhir yang berlaku mulai ≤ M.
- Total persen owner harus 100%. Baris yang sudah dipakai laporan tidak bisa diedit atau dihapus.
- Owner baru masuk = baris baru dengan rasio baru.
- **Tidak ada perubahan rasio otomatis.** Kalau ada kesepakatan "setelah balik modal, rasio jadi X", owner yang menambah barisnya saat waktunya tiba. Kesepakatan ini belum diketahui (bagian 2, pertanyaan 11) dan tidak menghambat pengembangan.

Ini **blocker** — rasio yang bisa diedit langsung mengubah angka historis tanpa jejak.

### 8.7 Progress balik modal

Per owner: total bagi hasil yang menjadi haknya dibanding total setoran modal. Contoh tampilan: "Agung — 62% balik modal". Yang dihitung adalah **hak** bagi hasil dari laporan, bukan uang yang benar-benar dicairkan — pencatatan pencairan tidak dibangun (bagian 9).

Butuh data **modal awal per owner** — renovasi dan alat yang sudah dibeli sebelum app dipakai, siapa yang membayar, berapa. Dicatat sebagai `SetoranOwner` jenis modal dengan tanggal sebelum go-live. Data ini **belum ada**. Selama belum diisi, widget ini **disembunyikan**, bukan ditampilkan 0% — angka 0% menyesatkan. Laba rugi, pos dana, dan bagi hasil tidak bergantung pada data ini.

### 8.8 Saldo awal saat go-live

Client sudah berjalan dengan sheet sebelum app dipakai. Bulan-bulan itu tidak punya order di app, jadi labanya tidak bisa diturunkan — tapi rumus di 8.5 butuh riwayatnya: rugi yang belum tertutup, pinjaman owner yang belum kembali, dan hak bagi hasil untuk progres balik modal.

Karena itu setiap bulan sebelum go-live dibawa sebagai **ringkasan bulanan**: bulan, omzet, laba bersih, sumber. Ini satu-satunya angka laba yang ditulis tangan — semua bulan sesudah go-live tetap diturunkan dari order. Pinjaman owner dan modal awal yang terjadi sebelum go-live dicatat sebagai `SetoranOwner` biasa dengan tanggal aslinya.

Yang perlu disiapkan client, sejajar dengan data master di bagian 10:
- Laba bersih per bulan sejak usaha berjalan, **dengan dana maintenance yang sudah dikoreksi** (8.1). Kalau memakai angka sheet lama, laba tiap bulannya terlalu tinggi Rp 97.350.
- Pinjaman owner yang belum dikembalikan per tanggal go-live.
- Modal awal per owner (8.7).

Di mockup, Juli 2026 memakai contoh omzet Rp 10.000.000 dari sheet client dengan angka yang sudah dikoreksi.

### 8.9 Aset & maintenance

Bonus di luar quotation Paket B. Sheet maintenance client pada dasarnya daftar aset — enam alat, jumlah unit, harga beli, 5% per bulan — dan selisih Rp 97.350 di sheet terjadi persis karena totalnya dihitung manual (unit lupa dikali). Karena itu alokasi dana maintenance **dihitung dari daftar aset**, bukan diketik.

`Aset`: kode, nama, kategori, merek/model, jumlah unit, harga satuan, tanggal beli, % maintenance per bulan, umur ekonomis, interval perawatan, status (aktif / rusak / dilepas), data lepas (tanggal, alasan, harga jual), investasi yang membelinya.

`ServisAset`: aset, tanggal, jenis (perawatan rutin / perbaikan), keterangan, biaya.

Aturan:

- **Alokasi maintenance bulan M** = Σ harga × unit × % untuk aset yang **dimiliki di akhir bulan M**. Aset yang dibeli September tidak mengubah Agustus; aset yang dijual 20 Agustus sudah tidak dihitung di Agustus. Pembulatan per aset, supaya angka per baris berjumlah persis sama dengan Laba Rugi.
- **Menambah aset selalu lewat investasi.** Satu aksi Tambah Aset mencatat aset, investasinya, dan setoran modal kalau dibayar owner. Pembelian alat tidak dicatat di Biaya maupun Investasi manual — kalau lewat jalur lain, alokasi maintenance-nya tidak ikut terhitung.
- **Biaya servis diambil dari dana maintenance** dan tunduk pada aturan saldo tidak boleh minus (8.2). Servis Rp 0 (dikerjakan sendiri) sah — tetap masuk riwayat dan mereset jadwal, tapi tidak menggerakkan dana.
- **Jadwal perawatan berikutnya** = servis terakhir (jenis apa pun) + interval, atau tanggal beli + interval. Yang lewat atau ≤ 14 hari lagi tampil di layar Aset dan Dashboard.
- **Nilai buku** garis lurus per umur ekonomis — **hanya informasi**, tidak masuk Laba Rugi. Keausan alat sudah dibebankan lewat alokasi maintenance; memasukkan penyusutan juga berarti membebankan hal yang sama dua kali. Ini **blocker**.
- **Aset dilepas, tidak dihapus.** Menghapus mengubah alokasi bulan-bulan saat aset masih dimiliki dan menghilangkan riwayat servisnya. Hasil jual masuk **dana maintenance** untuk membeli pengganti — bukan omzet, karena bukan penjualan.
- **Aset rusak tetap dialokasikan** — masih dimiliki, dan justru butuh dana servis.
- Per aset ditampilkan total biaya servis dibanding dana yang sudah disisihkan untuknya. Alat yang servisnya melebihi dana yang disisihkan adalah kandidat diganti, atau tanda persennya terlalu kecil.

Default per kategori — **praktik umum studio foto UMKM, bukan data client**, dan dikonfirmasi saat demo:

| Kategori | Umur ekonomis | Perawatan berkala |
|---|---|---|
| Kamera | 4 tahun | tiap 6 bulan (sensor & body cleaning) |
| Lensa | 4 tahun | tiap 12 bulan |
| Lighting | 4 tahun | tiap 12 bulan |
| Printer | 3 tahun | tiap bulan (head cleaning) |
| Aksesori (baterai, trigger, memory) | 2 tahun | tanpa jadwal |
| Komputer | 3 tahun | tiap 12 bulan |
| Properti & furnitur | 3 tahun | tanpa jadwal |

### Gaji owner di masa depan

Sekarang owner tidak digaji karena laba masih kecil. Kalau nanti digaji, **tidak perlu fitur baru**: catat sebagai biaya operasional kategori "Gaji Owner", dan bagi hasil otomatis dihitung dari sisa laba. Gaji tetap berjalan saat rugi — kalau kas tidak cukup, ujungnya setoran pinjaman (8.3).

Pengambilan uang owner di luar bagi hasil — misalnya ambil dulu di tengah bulan — tidak dicatat app (bagian 9). Kalau itu mulai sering terjadi, itu tanda sudah waktunya owner digaji.

---

## 9. Yang Sengaja Tidak Masuk

Bukan karena tidak berguna, tapi karena biayanya melebihi manfaatnya pada skala saat ini. Ditulis eksplisit supaya tidak diperdebatkan ulang di kemudian hari.

| Tidak dibangun | Alasan | Kapan ditinjau ulang |
|---|---|---|
| Penyimpanan & galeri foto di app | Biaya penyimpanan foto wedding besar, dan client sudah punya Google Drive. Cukup tempel link di Order | Kalau client minta customer bisa login lihat hasil sendiri |
| Portal login customer | Satu link Drive menyelesaikan masalah yang sama | Sama seperti di atas |
| Payment gateway | Pembayaran masih transfer manual, dan pencocokan manual masih ringan di volume ini | Kalau transaksi > 30/hari |
| Hak akses & peran pengguna | Penggunanya dua owner dengan akses penuh. Tetap ada di kontrak (quotation deliverable 16) — ditunda, bukan dibuang | Saat ada staff yang ikut input |
| Kunci periode / tutup buku | Tanpa kunci, biaya yang telat diinput ke bulan lalu ikut mengubah bagi hasil bulan itu. Diterima dulu: rasio sudah versi per periode (8.6), jadi satu-satunya sumber perubahan historis adalah input telat | Saat owner mulai mencairkan bagi hasil berdasarkan angka app, lalu angka bulan yang sudah dicairkan berubah |
| Pencatatan pencairan bagi hasil & pengambilan owner | App menghitung **hak** tiap owner, bukan uang yang benar-benar dicairkan. Pencairan terjadi di luar app | Bersamaan dengan kunci periode |
| Barcode, lokasi aset, dan notifikasi pengingat servis | Enam alat di satu studio. Jadwal perawatan cukup tampil di Dashboard dan layar Aset (8.9) | Kalau alat > 50 atau lebih dari satu lokasi |
| Penyusutan masuk Laba Rugi | Biaya aus alat sudah diwakili alokasi maintenance. Memasukkan penyusutan juga membebankan keausan yang sama dua kali (8.9) | Kalau client butuh laporan keuangan standar akuntansi (mis. untuk pajak badan atau bank) |
| Perubahan rasio otomatis setelah balik modal | Kesepakatannya belum ada, dan perubahan rasio jarang — menambah baris manual cukup (8.6) | Tidak perlu ditinjau |
| Pelacakan stok bahan | HPP manual di katalog sudah cukup untuk laporan. Stok baru penting kalau sering kehabisan bahan | Kalau pernah kehilangan penjualan karena kehabisan stok |
| WhatsApp Business API | Lihat gotcha di 5.6 | Kalau customer > 1000 |
| Program loyalitas / poin | Belum ada basis customer untuk diloyalkan | Setelah ada customer berulang yang signifikan |
| Multi-cabang | Baru satu studio | Kalau buka cabang |

---

## 10. Langkah Berikutnya

1. Bawa **bagian 2 (Pertanyaan Terbuka)** ke client. Jawaban yang belum terisi mengunci sisa desain.
2. Konfirmasi **basis kas vs akrual** (bagian 7) — ini keputusan yang paling mahal kalau diubah belakangan.
3. Minta client menyiapkan daftar produk, jasa, harga jual, dan harga bahan. Ini pekerjaan client, bukan pekerjaan developer, dan biasanya jadi penghambat terlama.
4. Sampaikan **koreksi dana maintenance** ke client: Rp 790.450/bulan, bukan Rp 693.100 (8.1).
5. Minta client menyiapkan **modal awal per owner** — renovasi dan alat yang sudah dibeli, siapa yang membayar, berapa nominalnya (8.7). Tidak menghambat pengembangan, hanya menunda tampilan progress balik modal.
6. Minta client menyiapkan **saldo awal** — laba bersih per bulan sebelum go-live dan pinjaman owner yang belum kembali (8.8).
7. Setelah pertanyaan terjawab, dokumen ini direvisi jadi spesifikasi final sebelum masuk ke rencana teknis.
