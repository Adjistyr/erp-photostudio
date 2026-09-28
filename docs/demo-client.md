# Naskah Demo Prototype ke Client

Dokumen: 29 September 2026
Untuk: presentasi prototype `web/` ke client, sekaligus mengumpulkan jawaban atas pertanyaan terbuka di [business-flow.md](./business-flow.md) bagian 2.

---

## 1. Sebelum Demo

**Menjalankan:** `cd web && npm run dev`, buka `http://localhost:5173`.

**Kondisi data di prototype:**

| Hal | Nilai |
|---|---|
| "Hari ini" | 26 Agustus 2026 — semua umur tagihan dan jadwal relatif ke tanggal ini |
| Agustus | 12 order contoh (retail, studio, event), satu order Batal ber-DP |
| Juli | Saldo awal dari contoh sheet client (omzet Rp 10.000.000), bukan order |
| Modal awal | **Contoh** — Agung Rp 15.809.000 (total alat di sheet maintenance). Data asli belum ada |

**Gotcha:** data hanya tersimpan di memori browser. Pembayaran, biaya, atau setoran yang dicatat saat demo **hilang saat halaman di-refresh**. Justru bisa dipakai: kalau ada salah input saat demo, refresh untuk kembali ke kondisi awal.

**Framing ke client:** ini prototype untuk mengunci alur dan angka, bukan aplikasi jadi. Setiap asumsi di bawah dipilih dari praktik umum UMKM dan **bisa diubah** — tujuan demo adalah mendapat jawaban client untuk tiap asumsi itu.

---

## 2. Alur Demo

Urutannya mengikuti perjalanan uang: transaksi masuk → ditagih → biaya keluar → laba → dibagi. Tiap layar berisi apa yang ditunjukkan, asumsi yang dipakai prototype, dan pertanyaan yang dilempar.

### 2.1 Dashboard

**Tunjukkan:** booking hari ini, omzet Agustus Rp 5.790.000, piutang Rp 8.050.000 (lebih besar dari omzet sebulan), kartu **titik impas** — laba kotor baru menutup 48% biaya tetap, kurang Rp 2.894.950. Peringatan printer perlu dirawat (lewat 25 hari) — dibahas di 2.6.

**Tanya:** angka apa yang paling ingin dilihat pertama kali setiap buka app?

### 2.2 POS — walk-in retail

**Tunjukkan:** jual Cetak 4R + Keychain tanpa isi customer. Transaksi selesai < 30 detik.

| Asumsi prototype (umum UMKM) | Tanya client |
|---|---|
| POS hanya dipakai di studio | POS juga dipakai saat job outdoor? |
| Point of Sale saja, stok tidak dilacak | "Pendataan pos barang" maksudnya kasir atau stok barang? |
| Customer opsional, default "Umum" | Nomor customer walk-in perlu dicatat untuk kirim file? |

### 2.3 Order & Booking + Kalender

**Tunjukkan:** daftar order dengan **dua status terpisah** — status kerja (titik progres) dan status bayar (badge). Buka ORD-0011 (wedding 18 Okt, DP Rp 2.500.000). Buka Kalender untuk cek slot kosong. Order Batal ORD-0004 tampil pudar, DP-nya tetap tercatat.

| Asumsi prototype | Tanya client |
|---|---|
| DP nominal bebas, nego per deal | DP persentase tetap (mis. 30%) atau nego? |
| Harga studio dari katalog, event custom | Harga paket event selalu nego? |
| Order batal → DP hangus | Ada kebijakan refund DP? Berapa hari sebelum acara? |
| Sesi studio bisa walk-in tanpa booking | Studio wajib booking dulu? |

### 2.4 Pembayaran & Piutang

**Tunjukkan:** catat pelunasan untuk salah satu order → badge berubah dari DP ke Lunas **tanpa mengubah status manual**. ORD-0008 lewat jatuh tempo 14 hari tampil merah.

**Tanya:** biasanya menagih lewat apa? Perlu pengingat otomatis untuk tagihan lewat jatuh tempo?

### 2.5 Biaya

**Tunjukkan:** tab Biaya Job (fee crew, transport, sewa per order) dan Biaya Operasional (sewa, listrik, iklan). Buka dialog Catat Biaya — tunjukkan petunjuk bahwa beli alat dan servis alat **bukan** dicatat di sini.

| Asumsi prototype | Tanya client |
|---|---|
| Crew freelance dicatat per job | Sudah benar — konfirmasi kategori: fee freelance, transport, sewa lokasi, sewa alat, lain-lain? |
| Tinta = biaya operasional bulanan | Satu botol tinta cukup untuk berapa lembar cetak? |
| HPP Cetak 4R di prototype Rp 1.500 (contoh). Dari sheet, kertasnya saja Rp 780/lembar (Rp 39.000 isi 50) | Harga kertas masih segitu? Berapa HPP cetak 4R sebenarnya setelah tinta dihitung? |

### 2.6 Aset & Maintenance — bonus

**Tunjukkan:** daftar enam alat dari sheet maintenance client. Alokasi maintenance Rp 790.450 **dihitung dari daftar ini**, bukan diketik — tunjukkan baris baterai (2 unit × Rp 120.000 × 5% = Rp 12.000). Printer ditandai merah: perawatan lewat 25 hari. Klik printer → Catat Servis head cleaning Rp 0 → jadwal bergeser ke bulan depan, peringatan hilang. Klik lighting → riwayat servis ganti kipas Rp 150.000 dibanding dana yang sudah disisihkan.

Sampaikan bahwa modul ini **bonus di luar quotation**.

| Asumsi prototype (umum UMKM) | Tanya client |
|---|---|
| Maintenance 5% harga alat per bulan, tetap diambil saat rugi | 5% per bulan artinya dana setara harga alat terkumpul dalam 20 bulan — sesuai maksudnya? |
| Umur ekonomis: kamera/lensa/lighting 4 tahun, printer 3 tahun, aksesori 2 tahun | Biasanya alat diganti setelah berapa lama? |
| Printer dirawat tiap bulan, kamera tiap 6 bulan, lighting & lensa tiap 12 bulan | Selama ini alat diservis kapan saja? Di mana? |
| Hasil jual alat bekas masuk dana maintenance | Setuju, atau hasil jual dibagi ke owner? |
| Nilai buku hanya informasi, tidak masuk Laba Rugi | Perlu laporan nilai aset untuk bank / pajak? |
| Alat dibeli owner = modal owner itu | Alat yang ada sekarang dibeli siapa? |

### 2.7 Laporan Laba Rugi

**Tunjukkan:** alert **basis kas** di atas. Alur angka: omzet → biaya langsung → laba kotor 47% → biaya operasional → **alokasi dana maintenance** → laba bersih −Rp 2.894.950. Di bawahnya blok bagi hasil: Agustus tidak ada bagi hasil, rugi dibawa ke September.

Jelaskan kenapa rugi: laba kotor sehat, yang berat adalah biaya tetap sebulan penuh di bisnis yang baru mulai.

| Asumsi prototype | Tanya client |
|---|---|
| **Basis kas** — omzet diakui saat uang diterima | Setuju? DP wedding Agustus untuk acara Oktober masuk omzet Agustus. **Ini keputusan paling mahal kalau diubah belakangan** |
| Dana maintenance 5% harga alat per bulan = **Rp 790.450** | Sheet menulis Rp 693.100 — lupa dikali jumlah unit (baterai, memory, lighting 2 unit). Setuju dikoreksi? |

### 2.8 Margin per Lini

**Tunjukkan:** Event 69% omzet tapi margin 30%; Retail 5% omzet tapi margin 67%. Ini output paling berharga — lini dengan omzet terbesar belum tentu paling untung.

**Tanya:** apakah hasil ini sesuai perasaan owner selama ini?

### 2.9 Modal & Bagi Hasil

**Tunjukkan:**
1. Tab Bagi Hasil — Juli (dari sheet): Agung Rp 890.002, Raka Rp 381.429, cadangan Rp 141.270. Agustus rugi → alert "laba ditahan dulu".
2. Tab Setoran Owner — Agung meminjamkan Rp 2.000.000 untuk menutup kas Agustus. Pinjaman dilunasi dari laba September **sebelum** dibagi, dan tidak dipotong dua kali dengan rugi.
3. Tab Pos Dana — saldo maintenance dan cadangan. Coba catat pemakaian cadangan Rp 200.000 → ditolak karena saldo tinggal Rp 141.270.
4. Tab Investasi — alat studio dicatat sebagai modal Agung, di luar laba rugi. Pembelian alat masuk otomatis dari menu Aset.
5. Tab Rasio — ubah 70/30 hanya menambah baris baru; bulan lalu tidak ikut berubah.

| Asumsi prototype (umum UMKM) | Tanya client |
|---|---|
| Rugi dibawa ke bulan berikutnya, ditutup dulu sebelum laba dibagi | Setuju? Atau rugi ditanggung bersama / ditutup dana cadangan? |
| Dana cadangan 10% dari laba yang dibagi, untuk pembelian mendesak | Dipakai untuk apa saja? Siapa yang boleh memakai? |
| Setoran owner saat rugi = **pinjaman**, dikembalikan sebelum laba dibagi | Setuju pinjaman? Atau dianggap tambahan modal? |
| Owner tidak digaji, hanya bagi hasil | Kapan owner mulai digaji? Owner biasa mengambil uang di tengah bulan? |
| Rasio 70/30 tetap sampai diubah manual | Ada kesepakatan rasio berubah setelah balik modal? Jadi berapa? |
| Progres balik modal dari hak bagi hasil | Modal awal masing-masing owner berapa, untuk apa saja? |

### 2.10 Invoice & Komunikasi

**Tunjukkan:** invoice dibuat otomatis dari order — satu invoice untuk DP sampai pelunasan. Tombolnya "Buka WhatsApp" dan "Salin Link", bukan "Kirim". Tab Blast WhatsApp: app menyiapkan daftar dan pesan, owner yang mengirim.

| Asumsi prototype | Tanya client |
|---|---|
| Nomor invoice internal, bukan faktur pajak | Perlu nomor invoice resmi berurutan untuk pajak? |
| Blast WA disiapkan app, dikirim manual | Customer sekarang berapa? (WA Business API baru masuk akal di ribuan customer — ada verifikasi Meta dan biaya per pesan) |

### 2.11 Katalog & Customer

**Tunjukkan:** HPP produk per unit; jasa tanpa HPP (dicatat per job). Customer terkumpul otomatis dari order.

**Tanya:** daftar produk, jasa, harga jual, dan harga bahan — kapan bisa disiapkan?

---

## 3. Data yang Diminta dari Client Setelah Demo

Tanpa data ini pengembangan bisa jalan, tapi app tidak bisa dipakai dengan angka nyata:

1. Daftar produk & jasa: nama, harga jual, harga bahan per unit (business-flow bagian 10)
2. Laba bersih per bulan sebelum app dipakai, dengan dana maintenance terkoreksi (8.8)
3. Pinjaman owner yang belum dikembalikan per tanggal go-live (8.8)
4. Modal awal per owner: renovasi & alat, siapa yang membayar, berapa (8.7)
5. Biaya operasional bulanan yang rutin: sewa, listrik, internet, gaji staf

---

## 4. Yang Belum Ada di Prototype

Supaya tidak ada harapan yang salah saat demo:

| Belum ada | Status |
|---|---|
| Login & multi-pengguna | Ada di kontrak (deliverable 16), ditunda sampai staf ikut input |
| Penyimpanan data | Prototype in-memory; versi jadi memakai database |
| Website company profile (Paket A) & Client Gallery (Paket C) | Produk terpisah |
| Payment gateway, stok bahan, WA Business API | Sengaja tidak dibangun — lihat business-flow bagian 9 |
| Kunci periode / pencatatan pencairan bagi hasil | Ditunda — lihat business-flow bagian 9 |

---

## 5. Setelah Demo

Jawaban client dicatat ke [business-flow.md](./business-flow.md) bagian 2 (kolom asumsi diganti **Terjawab:** …). Jawaban yang berbeda dari asumsi prototype ditandai — itu yang mengubah kode.
