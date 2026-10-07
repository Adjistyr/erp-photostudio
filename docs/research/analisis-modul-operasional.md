# Analisis Modul Operasional — UI, Backend, UX, dan Perbandingan dengan POS Lain

Investigasi per **7 Oktober 2026** (branch `develop`) atas lima modul yang dipakai harian: **POS, Order & Booking, Pembayaran, Katalog, Aset & Maintenance**. Dua sudut pandang:

- **Admin** — staf yang menginput di meja depan: melayani walk-in, mencatat booking, menagih, menerima transfer. *Hari ini peran ini belum ada di app* (hanya dua owner dengan akses penuh; hak akses ditunda sampai staf ikut input — business-flow bagian 6). Analisis ini menganggap admin adalah pemakai berikutnya.
- **Owner** — mengambil keputusan dari angka: margin, piutang, bagi hasil, alat.

Pembanding: POS retail Indonesia (**Moka, Majoo, Pawoon, Kasir Pintar, Qasir, Olsera**) dan aplikasi manajemen studio foto (**Studio Ninja, Sprout Studio, HoneyBook, Pixieset Studio Manager, Táve**). Fitur pembanding ditulis dari pengetahuan umum per pertengahan 2026 dan belum diverifikasi ulang per vendor — paket dan harga mereka berubah; yang relevan di sini adalah *pola fiturnya*, bukan detail.

Skala prioritas: **P1** = menghambat pemakaian harian atau merusak data; **P2** = mengurangi kerja manual yang sering; **P3** = bagus ada. Estimasi: **S** < 1 hari, **M** 1–3 hari, **L** > 3 hari.

---

## 0. Ringkasan

Kelima modul sudah **lengkap untuk alur utama** dan konsisten secara UX (satu pola: daftar → Sheet detail → dialog aksi, status turunan, tanpa edit riwayat). Yang kurang bukan fitur besar, tapi **jalan pintas harian** yang di POS lain dianggap dasar, dan **kelenturan koreksi** yang hilang karena prinsip "riwayat tidak diedit" diterapkan juga ke data yang bukan riwayat (jadwal, lokasi, item order).

Enam temuan paling penting:

| # | Temuan | Modul | Prioritas |
|---|---|---|---|
| 1 | **Order tidak bisa diubah** setelah dibuat — jadwal, jam, lokasi, item, customer. Reschedule = batalkan + buat baru, dan DP-nya "hangus" di order lama | Order | P1 |
| 2 | **Tidak ada struk / bukti bayar** setelah transaksi POS maupun pembayaran DP | POS, Pembayaran | P1 |
| 3 | **Tidak ada jejak siapa yang mencatat** (`created_by`) di order, pembayaran, biaya — begitu admin ikut input, selisih kas tidak bisa ditelusuri | Lintas modul | P1 |
| 4 | **Kategori katalog teks bebas** — jasa dengan kategori salah ketik (mis. "studio") **tidak muncul** di form Buat Order, tanpa pesan apa pun | Katalog → Order | P1 |
| 5 | Layar Pembayaran tidak punya **tombol tagih via WhatsApp** padahal template + link invoice sudah ada; owner harus ke Invoice → Lihat → Buka WhatsApp | Pembayaran | P2 |
| 6 | **Tanpa pencarian dan paginasi** di semua daftar — aman untuk < 10 transaksi/hari, tapi daftar order akan ratusan baris dalam beberapa bulan | Lintas modul | P2 |

Yang **sengaja tidak disarankan** (dan alasannya) ada di bagian 7.

---

## 1. POS

### Kondisi sekarang
- **Backend:** `GET pos`, `POST pos`. Hanya produk aktif; harga & HPP disalin dari katalog di server; diskon nominal di level transaksi (harus < subtotal); customer opsional (nama → cocokkan/buat); order lahir `delivered` + lunas satu pembayaran; satu transaksi DB.
- **UI:** grid produk + pencarian nama, keranjang dengan +/−, diskon, total, HPP & margin otomatis, nama customer, metode bayar (toggle), satu tombol *Simpan & Bayar*. Dua kolom, bukan wizard.
- **UX:** target "< 30 detik" tercapai untuk kasus normal. Keranjang reset setelah simpan.

### POV Admin
- Setelah *Simpan & Bayar* **tidak ada apa-apa** yang bisa diberikan ke customer — tidak ada struk cetak, tidak ada struk WA, tidak ada nomor transaksi di layar (toast hilang dalam beberapa detik). Di POS lain ini langkah terakhir yang selalu ada.
- **Tidak ada daftar "transaksi hari ini"** di layar POS. Untuk cek "tadi yang Rp 80 ribu sudah tercatat belum?" admin harus ke Order & Booking dan memfilter Retail.
- Hanya **nama** customer yang bisa dicatat, tanpa nomor HP → walk-in yang mau dikirimi struk/promo tidak bisa dihubungi. Padahal nomor HP adalah data CRM yang paling berguna (Komunikasi memakainya).
- Diskon hanya **nominal total**. Diskon per item dan persen (mis. "diskon 10% cetak 4R") harus dihitung di kepala.
- Tidak ada **hold/parkir keranjang** (customer A belum selesai memilih, customer B mau bayar dulu).
- Tidak ada **split payment** (sebagian tunai, sebagian QRIS). Di studio foto skala ini jarang, tapi bukan tidak pernah.
- Tidak ada **void/retur** khusus retail: barang salah cetak lalu diganti → satu-satunya jalan adalah *Batalkan Order* (DP "hangus", padahal uangnya dikembalikan) atau *Hapus pembayaran* lalu order menggantung sebagai piutang.

### POV Owner
- Omzet retail per hari, per metode bayar (tunai vs transfer vs QRIS) **tidak ada di satu layar** — perlu untuk mencocokkan laci kas dan mutasi rekening tiap tutup hari. Laporan Penjualan per bulan, bukan per hari.
- Tidak ada **buka/tutup kasir (shift)**: saldo awal laci, penjualan tunai, setoran, selisih. Selama hanya owner yang memegang kas ini tidak terasa; begitu ada admin, selisih kas tidak bisa dibuktikan.
- Tanpa `created_by`, tidak bisa tahu transaksi siapa.

### Pembanding
Moka, Majoo, Pawoon, Kasir Pintar, Qasir — semuanya punya: struk (cetak thermal Bluetooth + kirim WA/email), diskon per item & persen, hold bill, split payment, void dengan alasan, shift kasir + laporan kas harian, PIN per karyawan, stok, dan mode offline. Yang **tidak** relevan untuk Potrait Time: stok (keputusan business-flow), barcode (item sedikit), multi-outlet, program loyalti, offline.

### Gap & usulan
| Usulan | Prio | Est. | Catatan |
|---|---|---|---|
| **Struk setelah transaksi**: layar/Sheet ringkasan dengan nomor order, tombol *Cetak* (print browser, format 58 mm) dan *Kirim WA* (butuh nomor HP) | P1 | M | Memakai halaman publik seperti invoice (`/i/{order}` sudah ada — struk = invoice retail yang lunas). Jadi sebagian besar sudah ada; tinggal alur "setelah simpan, tampilkan link" |
| **Nomor HP opsional di POS** di samping nama | P1 | S | Mencocokkan customer juga lebih aman lewat HP daripada nama |
| **Panel "Transaksi hari ini"** di layar POS (nomor, jam, item, total, metode) dengan tombol buka struk | P2 | S | Data sudah ada (order retail hari ini) |
| **Diskon per item + persen** | P2 | M | Skema: `order_items.discount` atau tetap total — perlu keputusan. Persen di level total paling murah: S |
| **Laporan kas harian** (per metode bayar, per hari; untuk tutup hari) | P2 | M | Bisa jadi tab di Laporan Penjualan atau kartu di Dashboard |
| **Retur/void retail** dengan alasan — status baru `refunded`, uang keluar tercatat | P2 | M | Perlu keputusan kebijakan refund (business-flow pertanyaan 6 masih "belum ada") |
| Hold/parkir keranjang | P3 | S | State lokal browser; hilang saat refresh — cukup untuk kasus 2 customer bergantian |
| Split payment | P3 | M | Skema pembayaran sudah banyak-ke-satu; yang kurang hanya UI POS |
| Shift kasir / buka-tutup laci | P3 | L | Baru berarti saat ada > 1 pemegang kas; jangan dibangun sebelum admin ada |

---

## 2. Order & Booking

### Kondisi sekarang
- **Backend:** daftar, buat (studio/event: item dari katalog, DP opsional, status awal Booking/Dijadwalkan), `advance` satu langkah, `cancel` (alasan ke catatan, DP tetap omzet), `result-link`, kalender per bulan, pembayaran (tambah/hapus), link invoice bertanda tangan. Margin per order; order batal dihitung dari uang masuk.
- **UI:** tabel dengan tab lini, dua dimensi status (progres kerja + badge bayar), Sheet detail lengkap (item, pembayaran, biaya job, margin, link hasil, aksi), form Buat Order halaman penuh dengan ringkasan di kanan, kalender bulanan.
- **UX:** status kerja hanya maju satu langkah (tidak bisa mundur), semua aksi uang dari Sheet, konfirmasi batal menyebut konsekuensi DP.

### POV Admin
- **Tidak ada edit order.** Customer menggeser jadwal, ganti jam, ganti lokasi, menambah add-on, atau ternyata salah pilih customer → tidak ada jalan selain *Batalkan* (DP tercatat hangus, padahal customer tidak membatalkan) lalu *Buat Order* baru dan mencatat ulang DP (yang bertanggal mundur dan bisa tertolak kalau bulannya sudah tutup buku). Ini kasus **mingguan** di studio foto. Ini gap terbesar di seluruh app.
- Catatan order tidak bisa diedit (hanya ditambah lewat pembatalan).
- **Status tidak bisa mundur.** Salah klik "Lanjut ke Selesai Dikerjakan" permanen.
- Tidak ada **pencarian** (nomor order, nama customer) dan **filter status** ("yang belum diserahkan", "yang jadwalnya minggu ini"). Tab hanya per lini.
- **Item harus dari katalog**, harga katalog. Paket event hasil nego (hampir selalu) tidak bisa dicatat dengan harga deal; `order_items.catalog_item_id` sudah nullable untuk item custom, tapi form belum memakainya (prototype juga mencatat ini sebagai pertanyaan terbuka).
- Form Buat Order tidak bisa **membuat customer baru** di tempat — harus ke menu Customer dulu, lalu kembali (POS justru bisa dari nama).
- Tidak ada **daftar "besok"** untuk reminder H-1: template ada di Komunikasi, tapi untuk tahu siapa yang harus diingatkan admin membuka kalender lalu mencari nomor HP di Customer.

### POV Owner
- Detail order sudah menjawab pertanyaan utama owner: margin per job (termasuk order batal).
- Tidak ada **riwayat perubahan** order (siapa mengubah status, kapan). Begitu ada edit order (usulan di atas), riwayat ini jadi wajib.
- Tidak ada **sumber lead per order** (dari Instagram? referensi?) — ada di Customer (`source`), tidak di order. Untuk studio dengan iklan, konversi per kanal adalah angka yang dicari; P3 selama marketing belum terstruktur.

### Pembanding
Studio Ninja, Sprout Studio, HoneyBook, Táve: pipeline lead → quote → kontrak (tanda tangan elektronik) → invoice → galeri; reminder & workflow otomatis (email/SMS); form booking online dengan ketersediaan; kuesioner klien. Semuanya **berbayar bulanan dan berorientasi fotografer solo di pasar Barat**; bagian yang cocok untuk Potrait Time hanya: edit/reschedule order, item custom, dan reminder H-1 yang semi-otomatis. Kontrak e-sign dan booking online belum dibutuhkan (deal lewat chat).

### Gap & usulan
| Usulan | Prio | Est. | Catatan |
|---|---|---|---|
| **Edit order**: jadwal, jam, lokasi, catatan, customer; item (tambah/hapus/qty) **selama belum ada pembayaran yang membuatnya lunas**; dicatat ke riwayat perubahan | P1 | L | Harga item tetap snapshot. Perubahan jadwal ke bulan lain tidak menyentuh uang (basis kas), jadi aman terhadap tutup buku. Perlu `order_events` (siapa, kapan, apa) — sekaligus menjawab audit |
| **Item custom** (nama + harga bebas, tanpa katalog) di Buat Order, ditandai "custom" | P1 | M | Kolom sudah nullable. Margin lini tetap benar (biaya job tetap per order) |
| **Status mundur satu langkah** ("Kembalikan ke …") dengan konfirmasi, tercatat | P2 | S | Hanya `delivered → done` dan seterusnya; `cancelled` tetap final |
| **Pencarian + filter** (nomor/nama, status kerja, status bayar, rentang tanggal) + paginasi | P2 | M | Server-side; sekaligus menyelesaikan "semua order sekaligus" |
| **Panel "Jadwal besok"** di Dashboard/Order dengan tombol *Ingatkan via WA* (template Reminder H-1 terisi) | P2 | S | Template + `keNomorWa` sudah ada |
| Buat customer baru dari form Buat Order (nama + HP) | P2 | S | Pola sudah ada di POS |
| Riwayat perubahan order di Sheet (`order_events`) | P2 | M | Bagian dari edit order |
| Sumber lead per order | P3 | S | Hanya kalau mulai beriklan |

---

## 3. Pembayaran (piutang)

### Kondisi sekarang
- **Backend:** `GET receivables` dari `Finance\Receivables` (order belum lunas, bukan batal, urut sisa terbesar); `POST/DELETE orders/{order}/payments` dipakai bersama Detail Order; `back()` ke layar asal.
- **UI:** tiga kartu (total, lewat jatuh tempo, belum jatuh tempo), peringatan konsentrasi > 50% di satu customer, tabel dengan umur tagihan, tombol *Catat Bayar* per baris → dialog dengan pratinjau status ("jadi Lunas / DP 60%").
- **UX:** status bayar diturunkan — tidak ada field status yang bisa salah input. Order lunas hilang dari daftar.

### POV Admin
- Menagih = **buka WhatsApp secara manual**: layar ini tidak punya tombol *Tagih via WA*. Yang ada di Invoice (Lihat → Buka WhatsApp) — dua layar jauhnya untuk pekerjaan yang dilakukan tiap hari.
- Tidak ada **bukti bayar** untuk customer setelah mencatat DP/pelunasan (kwitansi). Link invoice sudah mencerminkan pembayaran terbaru, jadi secara teknis bukti ada; tapi tidak ditawarkan di akhir dialog *Catat Bayar* ("Kirim bukti ke customer").
- Tidak ada **lampiran bukti transfer** (foto mutasi). Owner yang mencocokkan rekening harus mencari manual.
- Jatuh tempo = tanggal acara. Untuk event besar dengan **termin** (DP – 50% H-7 – pelunasan H-1) tidak ada jadwal tagihan; umur tagihan hanya satu titik.

### POV Owner
- Tiga angka di kartu sudah tepat sasaran. Laporan Piutang melengkapi dengan umur dan konsentrasi.
- Tidak ada **penerimaan kas per hari / per metode** untuk rekonsiliasi rekening (sama dengan temuan POS). Pembayaran transfer yang dicatat "26 Agu" tapi masuk rekening "27 Agu" tidak bisa dicocokkan tanpa ekspor.
- Tidak ada **ekspor** (CSV/Excel) untuk diserahkan ke pihak luar (akuntan, pajak).

### Pembanding
POS retail: laporan kas harian per metode, rekonsiliasi, tutup kasir. Aplikasi studio: jadwal pembayaran (payment plans) dengan reminder otomatis dan **link bayar online** (kartu/VA). Di Indonesia padanannya Midtrans/Xendit — biaya per transaksi dan onboarding merchant; untuk volume < 10 transaksi/hari **belum sepadan**, transfer manual + QRIS statis sudah cukup.

### Gap & usulan
| Usulan | Prio | Est. | Catatan |
|---|---|---|---|
| **Tombol *Tagih via WA*** per baris: pesan dari template (sisa, jatuh tempo, link invoice) | P2 | S | Semua bahan ada: `whatsappMessage()` di invoice, `keNomorWa`, HP customer |
| Setelah *Catat Bayar* berhasil: tawarkan **Kirim bukti** (link invoice via WA) | P2 | S | Sama dengan struk POS — satu mekanisme |
| **Filter**: hanya lewat jatuh tempo / per lini / per customer | P2 | S | |
| **Penerimaan kas harian** per metode (tab di Laporan Penjualan) | P2 | M | Query `payments` per `paid_on` + `method` — sederhana; UI tab |
| Ekspor CSV pembayaran & piutang | P3 | S | `fputcsv` streaming; tanpa paket |
| Lampiran bukti transfer | P3 | M | Butuh storage; nilai tambah kecil selama volume kecil |
| Jadwal termin per order | P3 | L | Hanya kalau event besar jadi rutin |
| Payment gateway | — | — | Tidak disarankan sekarang: biaya per transaksi > manfaat di volume ini |

---

## 4. Katalog

### Kondisi sekarang
- **Backend:** CRUD tanpa hapus (`toggle-active`), `type` product/service, HPP wajib untuk produk & dilarang untuk jasa, kategori **teks bebas** (default "Lain-lain").
- **UI:** tabel dengan tab Semua/Produk/Jasa, badge nonaktif, dialog tambah/ubah, aksi lewat menu baris.
- **UX:** aturan HPP dijelaskan di form; harga & HPP di-snapshot ke order.

### POV Admin
- **Kategori teks bebas berbahaya untuk jasa**: form Buat Order memfilter paket berdasarkan kategori persis `Studio` / `Event` / `Add-on`. Jasa berkategori "studio" (huruf kecil), "Event Wedding", atau "Lain-lain" **tidak akan pernah muncul** di Buat Order, dan tidak ada peringatan di Katalog maupun di form. Admin akan mengira paketnya hilang.
- Tidak ada pencarian/urut — belum masalah di < 30 item.
- Tidak ada **paket/bundel** (Paket Studio 1 Jam *termasuk* 5 cetak 4R): item paket dan isinya dicatat terpisah, HPP cetaknya tidak ikut ke paket.
- Tidak ada **varian** (ukuran cetak 4R/5R/10R sebagai satu produk) — dicatat sebagai item terpisah; masih wajar untuk katalog kecil.
- Tidak ada foto item — untuk POS internal tidak penting.

### POV Owner
- Margin per produk sudah tampil di dua tempat: Laporan Penjualan dan tabel Katalog (kolom HPP, Margin, Margin %). Yang belum ada hanya **penanda** produk bermargin rendah — owner harus membaca angkanya satu per satu. *(Koreksi 7 Okt: versi awal dokumen ini salah menyebut margin % belum ada di Katalog.)*
- Tidak ada riwayat perubahan harga (kapan harga naik). Order lama aman (snapshot); yang hilang hanya analisis.

### Pembanding
POS retail: kategori terstruktur, varian/modifier, stok & HPP otomatis dari pembelian, barcode, foto. Untuk Potrait Time: kategori terstruktur **ya**; varian, stok, barcode **tidak** (keputusan business-flow: stok tidak dilacak).

### Gap & usulan
| Usulan | Prio | Est. | Catatan |
|---|---|---|---|
| **Kategori jasa jadi pilihan tetap** (Studio / Event / Add-on) di form Katalog; kategori produk bebas; peringatan di Katalog untuk jasa yang kategorinya tidak dikenal | P1 | S | Validasi di `CatalogItemRequest` + Select di UI. Migrasi data: normalisasi kategori yang ada |
| Penanda margin rendah di tabel Katalog (di bawah ambang, mis. 20%) | P3 | S | Kolom margin % sudah ada; tinggal pewarnaan + ambang di `config/studio.php` |
| Pencarian nama | P3 | S | |
| Paket/bundel dengan komponen | P3 | L | Baru perlu kalau HPP bahan paket mau akurat; sekarang HPP bahan paket studio diabaikan |
| Riwayat harga | P3 | M | |

---

## 5. Aset & Maintenance

### Kondisi sekarang
- **Backend:** tambah aset (= investasi + setoran modal owner, satu transaksi), servis (dana maintenance dicek saldo; jadwal reset), status rusak/aktif, lepas (dijual/rusak total/hilang; hasil jual → dana maintenance), hapus servis.
- **UI:** empat kartu, peringatan perawatan, tabel (dilepas dipudarkan), Sheet detail dengan riwayat servis dan "servis vs dana yang disisihkan", tiga dialog.
- **UX:** default umur & interval dari kategori; alokasi otomatis — tidak ada angka ketik tangan.

### POV Admin
- Admin jarang menyentuh modul ini. Yang relevan: **jadwal perawatan** — hanya terlihat di Dashboard dan di layar Aset; tidak ada notifikasi keluar (WA ke owner) saat jatuh tempo. Cukup, selama Dashboard dibuka tiap hari.
- Tidak ada **nomor seri / foto** alat — untuk klaim garansi dan asuransi berguna; untuk operasional tidak.

### POV Owner
- Pertanyaan utama owner ("alat mana yang biaya servisnya melebihi dana yang disisihkan?") **sudah dijawab** di Sheet. Ini lebih dari yang ditawarkan POS mana pun.
- Tidak ada **ringkasan per kategori** (total nilai kamera vs lighting vs printer) dan tidak ada ekspor daftar aset (untuk asuransi/pajak).
- Tidak ada **rencana penggantian** (kapan printer habis umur ekonomis → butuh dana berapa). Data umur ekonomis sudah ada; tinggal proyeksi.

### Pembanding
POS retail dan aplikasi studio **tidak punya modul ini**; padanannya alat asset-tracking umum (Snipe-IT, spreadsheet). Modul ini adalah pembeda, bukan kekurangan.

### Gap & usulan
| Usulan | Prio | Est. | Catatan |
|---|---|---|---|
| Nomor seri + catatan garansi (sampai tanggal) | P3 | S | Dua kolom + tampil di Sheet |
| Proyeksi penggantian: aset yang habis umur ekonomis dalam 6 bulan + estimasi dana | P3 | M | Dari `purchased_on + useful_life_months` vs saldo dana maintenance |
| Ekspor daftar aset (CSV) | P3 | S | |
| Notifikasi perawatan via WA ke owner | P3 | M | Butuh pengiriman otomatis (WA API) — bertentangan dengan keputusan "WA manual"; cukup Dashboard |

---

## 6. Lintas modul

| Temuan | POV | Prio | Est. | Usulan |
|---|---|---|---|---|
| **Tidak ada `created_by`/`updated_by`** di order, pembayaran, biaya, setoran, servis | Owner | **P1** | M | Kolom `created_by` (nullable FK users) di tabel transaksi + tampil "dicatat oleh" di Sheet. Prasyarat sebelum admin ikut input; tanpa ini selisih kas tidak bisa ditelusuri |
| **Hak akses per peran** (admin tidak boleh melihat bagi hasil, margin, modal) | Owner | P2 | L | Ada di quotation (deliverable 16); ditunda sampai staf ikut input — tepat. Tapi `created_by` harus lebih dulu |
| **Pencarian & paginasi** di semua daftar (order, customer, invoice, biaya) | Admin | P2 | M | Server-side (`?q=`, `?page=`); pola sama di semua modul |
| **Struk / bukti bayar / tagihan via WA** — tiga kebutuhan, satu mekanisme: halaman publik bertanda tangan + template pesan | Admin | P1 | M | Sudah ada untuk invoice; perlu diekspos di titik akhir alur (setelah simpan POS, setelah catat bayar, di baris piutang) |
| **Layar lebar** — tabel 8–10 kolom dirancang untuk laptop ≥ 1280 px; di tablet/HP admin sebagian kolom terpotong (scroll horizontal) | Admin | P2 | M | POS dan Pembayaran paling mungkin dipakai dari HP. Prioritaskan dua layar itu: kartu per baris di layar sempit |
| **Ekspor CSV** (order, pembayaran, biaya, aset) | Owner | P3 | S | Untuk akuntan/pajak; tanpa paket tambahan |
| **Pesan sukses hanya toast** (hilang ~4 detik) tanpa nomor/ID yang bisa disalin | Admin | P2 | S | Setelah simpan: tampilkan ringkasan tetap (nomor order, total) dengan tombol struk — menyatu dengan usulan struk |
| Offline mode | Admin | — | — | Tidak disarankan: studio punya internet; biaya kompleksitas (sinkronisasi, konflik nomor order) jauh melebihi manfaat |
| Stok barang | Owner | — | — | Tidak disarankan: keputusan business-flow (stok tidak dilacak); cetak dibuat sesuai pesanan |

---

## 7. Urutan yang disarankan

Dipilih yang **membuka pemakaian harian oleh admin** dan **melindungi data** sebelum fitur yang sekadar nyaman:

1. **Edit order + riwayat perubahan + `created_by`** (Order; P1, L) — satu paket karena riwayat perubahan dan jejak pencatat memakai tabel yang sama. Menyelesaikan temuan #1 dan #3.
2. **Kategori jasa terstruktur** (Katalog; P1, S) — kecil, mencegah paket "hilang".
3. **Struk & bukti bayar via halaman publik + Tagih via WA** (POS, Pembayaran; P1–P2, M) — satu mekanisme untuk tiga titik.
4. **Nomor HP di POS, item custom di Buat Order, status mundur** (P1–P2, S–M).
5. **Pencarian & paginasi, filter piutang, kas harian per metode** (P2, M).
6. Sisanya (P3) ketika kebutuhannya terbukti: shift kasir dan hak akses **setelah** admin mulai input; bundel, termin, proyeksi aset ketika volume naik.

Yang **tidak** disarankan dibangun sekarang: stok, barcode, offline, payment gateway, kontrak e-sign, booking online, notifikasi WA otomatis — masing-masing bertentangan dengan keputusan bisnis yang sudah ada atau biayanya melebihi manfaat di volume < 10 transaksi/hari.
