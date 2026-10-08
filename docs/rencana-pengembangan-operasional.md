# Rencana Pengembangan Modul Operasional — Fase & Spesifikasi

Turunan dari `docs/research/analisis-modul-operasional.md` (7 Oktober 2026). Dokumen itu menjawab *apa yang kurang dan kenapa*; dokumen ini menjawab *apa yang dibangun, dalam urutan apa, dan kapan dianggap selesai*. Setiap item = satu PR ke `develop`, kecuali ditandai "satu PR" untuk beberapa item.

**Spek per item ada di `docs/specs/`** — lebih rinci dan sudah diverifikasi terhadap kode; kalau dokumen ini dan spek berbeda, spek yang menang.

Kode di bawah mengikuti struktur yang sudah ada (`Modules/<Domain>/…`, `resources/js/modules/<domain>/…`, route bernama, Wayfinder, Form Request, status turunan, `OpenPeriod`, `ConfirmDelete`). Nama tabel/kolom/route adalah **usulan** — boleh diubah saat implementasi asal konsisten dengan konvensi `docs/development.md` bagian 4.

## Definisi selesai (berlaku semua item)

1. Feature test di `Modules/<Modul>/Tests/Feature/` — jalur utama + minimal tiga kasus error/tepi (validasi, periode tertutup, data orang lain/404).
2. `vendor/bin/pint --dirty`, `vendor/bin/phpstan --memory-limit=1G`, `npx vp check --fix`, `npm test` hijau.
3. `php artisan wayfinder:generate --with-form` setelah route berubah.
4. Dokumen ikut di PR yang sama: tabel/kolom baru → `docs/database.md` (glosarium); pola/aturan baru → `docs/development.md`; keputusan bisnis baru → `docs/business-flow.md`.
5. Seeder demo (`DemoSeeder`) diperbarui kalau fitur butuh data contoh agar terlihat di demo.
6. Pesan error dan label dalam bahasa Indonesia (`attributes()` di request, `lang/id`).

## Peta fase

| Fase | Tema | Item | Est. total | Prasyarat |
|---|---|---|---|---|
| **0** | Fondasi jejak | 0.1 `created_by` · 0.2 `order_events` | M | — |
| **1** | Data order yang bisa dikoreksi | 1.1 Kategori jasa · 1.2 Edit order · 1.3 Item custom · 1.4 Status mundur | L | Fase 0 |
| **2** | Bukti ke customer | 2.1 HP di POS · 2.2 Struk setelah POS · 2.3 Bukti bayar setelah catat bayar · 2.4 Tagih via WA · 2.5 Transaksi hari ini | M | — (paralel dengan Fase 1) |
| **3** | Skala & jalan pintas harian | 3.1 Pencarian + paginasi · 3.2 Filter piutang · 3.3 Kas harian per metode · 3.4 Customer baru dari form order · 3.5 Jadwal besok + ingatkan · 3.6 Margin % katalog | M–L | Fase 1 (3.4 butuh 1.2 pola form) |
| **4** | Kenyamanan transaksi | 4.1 Diskon persen · 4.2 Retur/void retail · 4.3 Hold keranjang · 4.4 Split payment · 4.5 Ekspor CSV · 4.6 Layar sempit | L | Fase 2 |
| **5** | Saat admin mulai input | 5.1 Peran & hak akses · 5.2 Shift kasir | L | Fase 0; owner memastikan ada staf yang akan input |
| **6** | Aset & lainnya (P3) | 6.1 Serial + garansi · 6.2 Proyeksi penggantian · 6.3 Bundel · 6.4 Termin · 6.5 Riwayat harga · 6.6 Sumber lead · 6.7 Lampiran bukti transfer | per item S–L | sesuai kebutuhan |

Fase 1 dan 2 bisa dikerjakan paralel (modul berbeda, tidak saling menyentuh). Fase 5 **jangan** dimulai sebelum owner memastikan ada staf yang akan input.

## Keputusan sementara (rekomendasi dev — berlaku sampai owner mengubah)

Ditetapkan 7 Oktober 2026 supaya tidak ada fase yang menunggu. Owner bisa mengubah; kalau berubah **sebelum** item terkait dikerjakan, cukup edit tabel ini dan spek itemnya. Kalau berubah **sesudah**, jadi PR perubahan.

| # | Keputusan | Alasan | Dipakai di |
|---|---|---|---|
| K1 | Order **Diserahkan**: hanya catatan & customer yang boleh diubah; jadwal dan item terkunci | Setelah diserahkan, jadwal adalah fakta historis; mengubah item mengubah omzet tanpa barang/jasa yang berubah. Koreksi harga setelah serah = retur (4.2) | 1.2 |
| K2 | Migrasi hanya menormalkan huruf/spasi (`studio` → `Studio`, `add on` → `Add-on`); kategori yang tidak cocok **dibiarkan** dan ditandai peringatan di Katalog | Data < 30 baris — owner memperbaiki manual dalam semenit; pemetaan tebakan bisa salah dan kesalahannya tidak terlihat | 1.1 |
| K3 | Refund **dibangun**, semua lini: nominal bebas ≤ (dibayar − sudah direfund), alasan wajib, bertanggal hari refund (`OpenPeriod`), basis kas — mengurangi omzet **bulan refund**, bukan bulan bayar. Order batal: DP tetap hangus secara default; kalau owner memutuskan mengembalikan, catat refund | Tidak pernah menyentuh bulan yang sudah tutup buku; satu mekanisme untuk retur retail dan pengembalian DP | 4.2, 3.3 |
| K4 | **Admin** tidak melihat margin/HPP, Laporan, Modal & Bagi Hasil, dan angka finansial Dashboard; tidak boleh **menghapus** pembayaran/biaya/servis (koreksi = owner); boleh mencatat order, POS, pembayaran, biaya job, customer, servis aset, komunikasi. Tambah/lepas aset dan semua aksi modal = owner | Hapus adalah satu-satunya koreksi uang di app ini — satu pintu (owner) membuat selisih kas selalu bisa ditelusuri | 5.1 |
| K5 | Pesan tagihan jadi template `billing` yang bisa diubah di Komunikasi, dipakai bersama oleh Invoice dan Pembayaran | Owner sudah terbiasa mengubah tiga template yang ada; satu sumber teks mencegah dua versi pesan | 2.4 |

---|---|---|---|
| K1 | Order yang sudah **Diserahkan** boleh diedit? (mis. salah customer ketahuan belakangan) | 1.2 | Tidak — hanya catatan & customer; item/jadwal terkunci |
| K2 | Jasa yang kategorinya tidak dikenal saat migrasi (bukan Studio/Event/Add-on) dipetakan ke mana? | 1.1 | Dibiarkan, ditandai peringatan di Katalog; owner memperbaiki manual |
| K3 | Kebijakan **refund**: uang kembali penuh / potong biaya / tidak ada refund? Dicatat sebagai uang keluar bulan refund (basis kas)? | 4.2 | Belum dibangun sampai dijawab |
| K4 | Admin boleh melihat **margin & HPP**? Boleh **menghapus** pembayaran/biaya? | 5.1 | Tidak dan tidak |
| K5 | Pesan tagihan boleh diubah owner (jadi template) atau cukup teks tetap? | 2.4 | Jadi template `billing`, bisa diubah di Komunikasi |

---

## Fase 0 — Fondasi jejak

### 0.1 `created_by` di tabel transaksi

**Tujuan.** Setiap catatan uang/operasional tahu siapa yang mencatat. Prasyarat admin ikut input; tanpa ini selisih kas tidak bisa ditelusuri.

**Backend**
- Migrasi `add_created_by_to_transaction_tables`: kolom `created_by` `foreignId()->nullable()->constrained('users')->nullOnDelete()` di `orders`, `payments`, `job_costs`, `operating_expenses`, `asset_maintenances`, `assets`, `owner_contributions`, `fund_withdrawals`, `investments`. Data lama tetap `null` = "sebelum pencatatan".
- Trait `Modules\Shared\Models\Concerns\RecordsCreator`: `static::creating(fn ($m) => $m->created_by ??= auth()->id())`. Dipasang di model-model di atas — satu tempat, bukan di tiap controller. Relasi `creator(): BelongsTo<User>`.
- Props yang sudah mengirim riwayat (order detail payments/jobCosts, capital ledgers, asset maintenances) menambah `created_by_name` (nullable).

**Frontend**
- Di Sheet detail (Order, Aset, Modal) baris riwayat menampilkan "· oleh Agung" kecil abu-abu; `null` → tidak ditampilkan (bukan "—", supaya data lama tidak terlihat rusak).

**Test minimal.** Simpan pembayaran sebagai user A → `created_by = A`; seeder/factory tanpa auth → `null`; hapus user → kolom jadi `null`, baris tetap ada; props detail memuat `created_by_name`.

**Catatan.** Tidak ada `updated_by`: prinsip "riwayat tidak diedit" membuat update jarang; yang diedit (order, katalog, customer) dicatat lewat 0.2 / tidak perlu.

### 0.2 Riwayat perubahan order (`order_events`)

**Tujuan.** Jawaban untuk "siapa yang mengubah jadwal ini / kapan status diturunkan". Dipakai 1.2, 1.4, 4.2.

**Backend**
- Tabel `order_events`: `id`, `order_id` FK cascade, `user_id` FK users nullable nullOnDelete, `type` string (`created`, `updated`, `advanced`, `reverted`, `cancelled`, `payment_recorded`, `payment_deleted`, `result_link`, `refunded`), `changes` json nullable (`{field: {from, to}}`), `created_at` saja (tanpa `updated_at` — event tidak diubah).
- `Modules\Order\Actions\RecordOrderEvent::execute(Order, string $type, array $changes = [])` — satu pintu. Dipanggil dari `OrderController` (store/advance/cancel/updateResultLink), `OrderPaymentController` (store/destroy), `PosController@store`.
- `orderProps()` menambah `events: [{type, changes, user_name, at}]` urut terbaru.

**Frontend**
- Bagian baru "Riwayat" di Sheet detail order (`index.tsx`), paling bawah, teks kecil: "7 Okt 14:02 · Agung · Jadwal 12 Okt → 19 Okt". Label per `type` dan per field di `types.ts`.

**Test minimal.** Buat order → 1 event `created`; advance → `advanced` dengan `{work_status: {from, to}}`; hapus pembayaran → `payment_deleted` dengan jumlah; event tidak ikut terhapus saat user dihapus.

---

## Fase 1 — Data order yang bisa dikoreksi

### 1.1 Kategori jasa terstruktur

**Tujuan.** Paket tidak "hilang" dari Buat Order karena kategori salah ketik.

**Backend**
- Enum `Modules\Catalog\Enums\ServiceCategory: string { Studio = 'Studio'; Event = 'Event'; AddOn = 'Add-on' }` + `label()`. Nilai string disamakan dengan data yang ada supaya tidak perlu mengubah `create.tsx` lebih dari mengganti literal dengan konstanta.
- `CatalogItemRequest`: `category` → `Rule::in(ServiceCategory::values())` **saat `type = service`**; produk tetap teks bebas (`max:100`, default "Lain-lain").
- Migrasi data `normalise_service_categories`: `UPDATE catalog_items SET category = <canonical> WHERE type = 'service' AND lower(trim(category)) IN ('studio','event','add-on','addon','add on')`. Yang tidak cocok dibiarkan (K2).
- `CatalogItemController@index` props menambah `unknown_category: bool` per jasa; `OrderController@create` memfilter dengan `whereIn('category', ServiceCategory::values())` — jasa tak dikenal tidak dikirim (sama seperti sekarang, tapi sekarang terlihat kenapa).

**Frontend**
- Form Katalog: saat jenis = Jasa, field kategori jadi `Select` tiga pilihan dengan keterangan "Menentukan di mana paket muncul saat Buat Order: Studio / Event / keduanya (Add-on)". Jenis = Produk tetap input teks.
- Baris jasa dengan `unknown_category` → badge "Kategori tidak dikenal — tidak muncul di Buat Order" + tombol Ubah.
- `create.tsx` `categoryMatches()` memakai `ServiceCategory` dari `@/types/domain`.

**Test minimal.** Simpan jasa kategori "studio" → 422; "Studio" → OK; produk kategori bebas → OK; migrasi menormalkan "add on" → "Add-on" dan membiarkan "Wedding".

### 1.2 Edit order

**Tujuan.** Reschedule, ganti jam/lokasi/catatan/customer, ubah item — tanpa batalkan + buat baru.

**Aturan bisnis**
- Berlaku untuk lini **studio & event**. Retail (POS) tidak diedit — koreksi retail = hapus pembayaran / retur (4.2); itemnya sudah diserahkan saat itu juga.
- Order **Batal** tidak bisa diedit sama sekali.
- Order **Diserahkan**: hanya `notes` dan `customer_id` (K1).
- Item boleh diubah selama status < Diserahkan **dan** total baru ≥ total sudah dibayar (tidak boleh lunas-lebih; kalau mau mengurangi di bawah DP, hapus pembayarannya dulu — konsisten dengan pola koreksi).
- Perubahan `service_date` **tidak** menyentuh uang → tidak terkena `OpenPeriod`. Pembayaran tetap di tanggal bayarnya.
- Item baru menyalin harga/HPP katalog saat ini (snapshot); item lama yang dipertahankan **tidak** disalin ulang — harga deal tidak berubah karena katalog naik.
- Nomor order tidak berubah.

**Backend**
- Route: `GET orders/{order}/edit` → `orders.edit`, `PUT orders/{order}` → `orders.update`.
- `UpdateOrderRequest`: rules sama dengan `StoreOrderRequest` minus `business_line`, `dp`, `dp_method`; `after()` closures (konvensi `StoreOrderRequest::after()`, bukan `withValidator`) menolak bila order retail/batal (`422`, pesan "Order retail/batal tidak bisa diubah"), menolak perubahan selain notes/customer bila Diserahkan, menolak total baru < `totalPaid()` (pesan menyebut nominal DP).
- `OrderController@edit` memakai props `create()` + `order` (bentuk `orderProps`), `@update` dalam `DB::transaction`: hitung diff field, sinkronkan item (hapus yang hilang, update qty yang ada, tambah yang baru), `RecordOrderEvent('updated', $changes)`. Redirect `orders.index` dengan flash.

**Frontend**
- Halaman `modules/order/pages/edit.tsx` memakai komponen form yang **diekstrak** dari `create.tsx` ke `components/order-form.tsx` (props `mode: 'create' | 'edit'`, `locked: {items: bool, schedule: bool}`). Bagian DP disembunyikan di mode edit.
- Tombol "Ubah" di Sheet detail (di `PageActions`-nya), disembunyikan bila batal/retail. Di mode terkunci, field menampilkan keterangan kenapa ("Order sudah diserahkan").
- Ringkasan kanan menampilkan "Sudah dibayar Rp X · sisa Rp Y" dan memerah bila total < dibayar.

**Test minimal.** Ubah tanggal → tersimpan + event `updated` berisi `service_date`; ubah item sampai total < DP → 422; edit order retail → 422; edit order batal → 422; Diserahkan ubah jam → 422, ubah catatan → OK; item lama harga tetap meski katalog berubah.

### 1.3 Item custom di Buat/Edit Order

**Tujuan.** Paket event hasil nego tercatat dengan harga deal, bukan dipaksa ke katalog.

**Backend**
- `StoreOrderRequest`/`UpdateOrderRequest`: `items.*.catalog_item_id` → `nullable`; `items.*.name` `required_without:items.*.catalog_item_id|string|max:255`; `items.*.unit_price` `required_without:…|integer|min:0`. Bila `catalog_item_id` terisi, `name`/`unit_price` **diabaikan** (server tetap menyalin dari katalog — mencegah harga katalog dimanipulasi dari klien).
- Trait `ResolvesCatalogLines::lines()` menghasilkan baris custom dengan `catalog_item_id = null`, `unit_cost = null`.
- `SalesReport` (Laporan Penjualan) menambah baris agregat "Item custom" di bagian jasa supaya omzetnya tidak hilang dari laporan.
- POS **tidak** menerima item custom (retail = katalog).

**Frontend**
- Di daftar item form order: tombol "+ Item custom" membuka baris dengan input nama + harga; badge "Custom" di tabel item (Sheet detail, invoice).

**Test minimal.** Order dengan satu item custom → total benar, `catalog_item_id` null; custom tanpa harga → 422; `catalog_item_id` terisi + `unit_price` 1 → harga dari katalog; laporan penjualan memuat baris "Item custom".

### 1.4 Status mundur satu langkah

**Backend**
- `WorkStatus::previous(): ?self` — kebalikan `next()`; `Booking` dan `Cancelled` → `null`.
- Route `PATCH orders/{order}/revert` → `orders.revert`. Menolak bila `previous()` null (422). Mundur dari `Done`/`Delivered` ke sebelumnya **tidak** menghapus `result_link` (link tetap ada, hanya disembunyikan oleh `allowsResultLink()`).
- `RecordOrderEvent('reverted', ['work_status' => [from, to]])`.
- Ubah komentar di `WorkStatus::next()` yang menyatakan "tidak ada mundur".

**Frontend**
- Di Sheet detail, di samping "Lanjut ke …", tautan kecil "Kembalikan ke <label>" membuka `AlertDialog` konfirmasi ("Status kembali ke Dikerjakan. Tercatat di riwayat."). Tidak tampil untuk Booking/Batal.

**Test minimal.** Delivered → Done OK + event; Booking → 422; Cancelled → 422; result_link tetap tersimpan setelah mundur.

---

## Fase 2 — Bukti ke customer

Satu mekanisme untuk tiga titik: halaman publik invoice bertanda tangan (`invoices.public`) sudah mencerminkan kondisi terkini; yang kurang adalah *menawarkannya* di akhir setiap alur uang.

### 2.1 Nomor HP di POS

**Backend**
- `StorePosSaleRequest`: `customer_phone` `nullable|string|max:30`, hanya berarti bila `customer_name` terisi (`prohibited_if:customer_name,null`… cukup `nullable`; diabaikan bila nama kosong).
- `PosController::customerFor(name, phone)`: cocokkan **HP dulu** (dinormalkan: hanya digit, `08…` → `628…`, helper `Modules\Customer\Support\Phone::normalise()` — dipakai juga 2.4), lalu nama case-insensitive, lalu buat baru dengan HP. Customer cocok lewat nama tapi `phone` null → isi HP-nya (melengkapi, bukan menimpa).

**Frontend**
- Input HP di bawah nama, placeholder "08… (opsional, untuk kirim struk)".

**Test minimal.** HP cocok nama beda → pakai customer HP; nama cocok tanpa HP → HP terisi; HP format `+62 812-…` dinormalkan; nama kosong + HP terisi → walk-in tanpa customer.

### 2.2 Struk setelah transaksi POS

**Backend**
- `PosController@store` redirect ke `pos.index` dengan flash `receipt: {order_id, number, total, invoice_url, customer_phone}` (bukan prop tetap — hilang saat refresh, sesuai sifat struk).
- Halaman publik invoice: untuk order retail, judul "Struk" bukan "Invoice", dan tambah `@media print { @page { size: 80mm auto } }` di layout khusus retail. Satu halaman, dua gaya — tidak ada route baru.

**Frontend**
- `pos.tsx` membaca `flash.receipt` → membuka `Sheet` "Transaksi tersimpan" dengan nomor (font mono besar), total, tombol **Cetak** (buka `print_url` tab baru — URL bertanda tangan tidak bisa ditambahi `?print=1` di klien, jadi `Order::invoiceUrl(print: true)` menandatangani varian cetaknya; halaman memanggil `window.print()` saat load), **Kirim WA** (bila HP; pesan `whatsappMessage` varian struk: "Terima kasih, struk: {link}"), **Salin link**, **Transaksi baru** (tutup Sheet, keranjang sudah kosong).
- Sheet ini juga memperbaiki keluhan toast hilang: ringkasan tetap sampai ditutup.

**Test minimal.** Store POS → flash `receipt` berisi `invoice_url` valid (signed); halaman publik retail memuat kata "Struk"; `?print=1` menyisipkan skrip print; order non-retail tetap "Invoice".

### 2.3 Bukti bayar setelah catat bayar

**Backend**
- `OrderPaymentController@store` menambah flash `receipt` yang sama (order_id, number, balance, invoice_url, customer_phone, payment_status).
- Props `receivables.index` menambah `customer_phone` dan `invoice_url` per baris (dipakai 2.4 juga).

**Frontend**
- `PaymentDialog`: setelah `onSuccess`, bukan langsung tutup — tampilkan langkah "Tercatat. DP 60% · sisa Rp X" dengan tombol **Kirim bukti via WA** / **Salin link** / **Selesai**. Pesan: "Pembayaran Rp X diterima {tanggal}. Sisa Rp Y, jatuh tempo {tanggal}. Rincian: {link}".
- Berlaku di kedua pemanggil `PaymentDialog` (Order detail, Pembayaran) tanpa perubahan tambahan — Dashboard tidak memakainya.

**Test minimal.** Catat bayar → flash `receipt.balance` benar; lunas → `payment_status = paid` dan pesan tanpa "sisa"; props receivables memuat `invoice_url`.

### 2.4 Tagih via WA dari layar Pembayaran

**Backend**
- (K5) Template baru `billing` di `MessageTemplate::defaults()` dengan placeholder `{nama}`, `{nomor}`, `{sisa}`, `{jatuh_tempo}`, `{link}`; metode baru `MessageTemplate::fillPlaceholders(string $body, array $values)`; `personalise($body, $name, $link)` tetap ada sebagai pembungkus (dipakai email blast). `ReceivableController@index` mengirim `billing_template: string` (resolved).
- `whatsappMessage()` di `invoice-document.tsx` beralih memakai template yang sama (dikirim sebagai prop `billing_template` di halaman Invoice) — satu sumber teks tagihan.

**Frontend**
- Kolom aksi Pembayaran: tombol ikon **WA** (disabled + tooltip "Belum ada nomor HP" bila kosong) di samping *Catat Bayar*. Pesan diisi `personalise(template, row)` di klien (fungsi kecil di `lib/format.ts`: ganti `{key}`).
- Baris lewat jatuh tempo → tombol WA varian `destructive` outline supaya terlihat prioritas.

**Test minimal.** Props memuat `billing_template` dengan nama studio; template bisa diubah via Komunikasi dan tercermin di Pembayaran; Vitest `personalise()` mengganti semua placeholder dan membiarkan yang tidak dikenal.

### 2.5 Panel "Transaksi hari ini" di POS

**Backend**
- `PosController@index` menambah `today_sales: [{id, number, time (created_at H:i), items_summary, total, method, invoice_url}]` — order retail dengan `service_date = today`, urut terbaru, maksimal 50.

**Frontend**
- Di bawah keranjang (kolom kanan) `Collapsible` "Hari ini · 7 transaksi · Rp 1.250.000", isi tabel ringkas dengan tombol struk per baris (membuka Sheet 2.2 dengan data baris).

**Test minimal.** Dua penjualan hari ini + satu kemarin → `today_sales` berisi 2; total ringkasan benar.

---

## Fase 3 — Skala & jalan pintas harian

### 3.1 Pencarian + paginasi server-side

**Cakupan.** Order & Booking, Customer, Invoice. (Biaya, Kalender, Laporan sudah per bulan; Katalog & Aset < 50 baris — cukup pencarian klien, lihat 3.6.)

**Backend**
- Query string: `q` (nomor order ILIKE / nama customer ILIKE / HP), `line`, `status` (work), `pay` (`unpaid|partial|paid`), `from`, `to` (service_date), `page`. `pay` difilter **setelah** memuat halaman karena status bayar turunan — **tidak**: itu merusak paginasi. Pakai subquery `COALESCE(SUM(payments.amount),0)` vs total item sebagai `withSum`/`selectSub` supaya filter bayar di SQL. Dicatat sebagai gotcha di `development.md`.
- `Modules\Shared\Http\ListQuery` (value object dari request: `q`, `page`, filter) + `->paginate(25)->withQueryString()`. Props: `orders: {data, current_page, last_page, total}`, `filters: {...}`. Tab lini yang sekarang di klien dipindah ke `line`.
- Index default: `orders(service_date)` sudah ada; tambah index `customers(phone)` dan `lower(customers.name)` (PostgreSQL expression index via `DB::statement`).

**Frontend**
- Komponen bersama `components/list-toolbar.tsx` (input cari dengan debounce 300 ms, filter `Select`, tombol reset) dan `components/pagination.tsx` (prev/next + "Hal. 2 dari 7"). Navigasi `router.get(url, params, {preserveState: true, preserveScroll: true, replace: true})`. Nilai filter dari props `filters` supaya URL bisa dibagikan.
- `KosongTabel` menyesuaikan kalimat: "Tidak ada hasil untuk 'x'" vs kosong total.

**Test minimal.** `?q=ORD-0012` → 1 hasil; `?q=budi` cocok nama case-insensitive; `?pay=partial` hanya DP; 30 order → `last_page = 2`; filter dipertahankan di `links`; Vitest debounce toolbar.

### 3.2 Filter piutang (klien)

Daftar piutang kecil (semua dimuat) → filter di klien saja: tab **Semua / Lewat jatuh tempo / Jatuh tempo ≤ 7 hari**, `Select` lini, input cari nama/nomor memakai `list-toolbar.tsx` mode klien (`onChange` lokal, tanpa `router`). Kartu total tetap untuk seluruh data (bukan hasil filter) — dijelaskan di caption. Vitest fungsi filter. **S**.

### 3.3 Kas harian per metode

**Backend**
- `ReportController@cash` → `GET reports/cash?month=` (`reports.cash`). Service `Modules\Finance\Services\CashReceipts::forMonth(month)`: grup `payments` per `paid_on` × `method` → `days: [{date, cash, transfer, qris, total, count}]`, `totals` per metode, `by_method_share`. Setelah 4.2, refund dikurangkan per metode.
- Tambah ke `ReportNav` sebagai "Kas Harian".

**Frontend**
- `modules/finance/pages/reports/cash.tsx`: `MonthNav`, tiga kartu total per metode, tabel per hari (hari tanpa transaksi disembunyikan), baris hari ini disorot. Tombol "Ekspor CSV" dipasang di 4.5.

**Test minimal.** Dua pembayaran tunai + satu QRIS di hari sama → satu baris, kolom benar; pembayaran bulan lain tidak ikut; bulan kosong → tabel kosong tanpa error.

### 3.4 Customer baru dari form order

**Backend**
- `StoreOrderRequest`/`UpdateOrderRequest`: `customer_id` `required_without:new_customer.name`; `new_customer.name` `required_without:customer_id|string|max:255`; `new_customer.phone` `nullable`. `OrderController@store` membuat customer dalam transaksi yang sama; dedup HP seperti 2.1 (pakai `Phone::normalise()`).

**Frontend**
- Pemilih customer sekarang `Select` biasa (tanpa cari) → ganti `Combobox` dari registry shadcn base (`npx shadcn add combobox`; belum ada di `components/ui/`) dengan input cari, menampilkan opsi terakhir "Buat customer '<ketikan>'" → menampilkan field HP inline. Mengganti kebutuhan bolak-balik ke menu Customer.

**Test minimal.** Order dengan `new_customer` → customer dibuat + order terhubung; `new_customer` dengan HP yang sudah ada → pakai yang lama (tidak duplikat); keduanya kosong → 422.

### 3.5 Jadwal besok + ingatkan

**Backend**
- `DashboardController` menambah `bookings_tomorrow` (bentuk sama `bookings_today` + `customer_phone`, `service_time`, `location`) dan `reminder_template` (resolved dari `MessageTemplate` `reminder`; placeholder `{nama}`, `{tanggal}`, `{jam}`, `{lokasi}` — perluas `personalise()`).

**Frontend**
- Kartu "Besok" di Dashboard di bawah "Hari ini": tiap baris tombol WA berisi pesan reminder terisi. Tanpa HP → disabled + tooltip. Kosong → "Tidak ada jadwal besok" nada netral.

**Test minimal.** Booking besok muncul, lusa tidak; order batal tidak muncul; template placeholder terganti.

### 3.6 Katalog: penanda margin rendah + pencarian klien

Katalog **sudah** menampilkan HPP, Margin, dan Margin % per produk (koreksi atas analisis). Yang ditambahkan: pewarnaan `destructive` pada margin % di bawah ambang `config('studio.low_margin_ratio')` (default 0.2, dijelaskan di tooltip header), dan input cari nama memakai `list-toolbar.tsx` mode klien untuk Katalog dan Aset. **S**.

---

## Fase 4 — Kenyamanan transaksi

### 4.1 Diskon persen di POS

Tetap satu kolom `orders.discount` nominal. UI POS: toggle `Rp | %`; mode % menghitung nominal di klien (`Math.round(subtotal × p / 100)`) dan menampilkan "10% = Rp 8.000"; yang dikirim tetap `discount` nominal → **tanpa perubahan backend**. Diskon per item **tidak** dibangun (perlu kolom di `order_items`, mengubah laporan margin produk; nilai tambah kecil di volume ini). Vitest kalkulasi pembulatan. **S**.

### 4.2 Retur / void retail

**Aturan bisnis (K3).** Retur = uang keluar bertanggal hari retur (basis kas), bukan menghapus pembayaran lama (bulan lama bisa sudah tutup buku). Order tetap `delivered`; status bayar turunan memperhitungkan refund. Barang pengganti = transaksi POS baru.

**Backend**
- Tabel `refunds`: `id`, `order_id` FK restrict, `refunded_on` date (`OpenPeriod`), `amount` ≤ `totalPaid − refunded`, `method` PaymentMethod, `reason` string, `created_by`. Route `POST orders/{order}/refunds`, `DELETE orders/{order}/refunds/{refund}` (scoped, `ConfirmDelete`).
- `Order::totalRefunded()`, `netPaid() = totalPaid − totalRefunded`; **hanya** `margin()` dan omzet Laba Rugi memakai `netPaid()` — `balance()`/`paymentStatus()` tetap bruto, kalau tidak order yang direfund penuh muncul lagi sebagai piutang di `Receivables::open()`; refund tampil sebagai badge "Retur"; `ProfitAndLoss` revenue bulan = pembayaran − refund bulan itu; `CashReceipts` (3.3) per metode negatif. `RecordOrderEvent('refunded')`.
- Semua lini (K3): pengembalian DP order batal memakai mekanisme yang sama — menggantikan "DP hangus" hanya ketika owner memutuskan mengembalikan.

**Frontend**
- Di Sheet detail bagian Pembayaran: tombol "Catat Retur" → dialog jumlah, metode, alasan (wajib). Baris refund tampil merah dengan tanda minus. Invoice publik menampilkan "Pengembalian" bila ada.

**Test minimal.** Refund > dibayar → 422; refund di bulan tertutup → 422; setelah refund penuh status bayar `unpaid` dan Laba Rugi bulan refund berkurang; hapus refund mengembalikan status.

### 4.3 Hold / parkir keranjang

Klien saja: `localStorage['pos.held']` array maks 5 `{label, lines, discount, customer}`; tombol "Tahan" (minta label, default nama customer/jam) dan daftar "Ditahan (2)" di atas keranjang untuk memulihkan. Hilang kalau browser dibersihkan — dijelaskan di tooltip. Vitest serialisasi. `// ponytail: localStorage; pindah ke server bila dua kasir berbagi antrean`. **S**.

### 4.4 Split payment di POS

`StorePosSaleRequest`: `payments` array 1–2 `{method, amount}`; `sum(amount) = total` (aturan di `after()`); `method`/`paid` lama dihapus setelah frontend pindah (tidak dua jalur). `PosController@store` membuat N baris `payments`. UI: baris metode kedua muncul lewat "+ Bagi pembayaran", sisa dihitung otomatis. Struk (2.2) menampilkan dua baris. **M**.

### 4.5 Ekspor CSV

Satu helper `Modules\Shared\Http\CsvResponse::stream(string $filename, iterable $rows, array $header)` memakai `response()->streamDownload` + `fputcsv` (tanpa paket). Route `GET orders/export` (filter sama 3.1), `GET reports/cash/export?month=`, `GET assets/export`. Tanggal `Y-m-d`, uang integer rupiah tanpa format (untuk spreadsheet). Tombol "Ekspor CSV" di toolbar masing-masing. Test: header baris pertama benar, filter diterapkan, UTF-8 BOM untuk Excel. **S**.

### 4.6 Layar sempit — POS & Pembayaran

Tanpa framework baru: breakpoint `md`. POS → grid produk 2 kolom, keranjang jadi `Sheet` bawah dengan tombol melayang "Keranjang (3) · Rp 120.000". Pembayaran → `md:hidden` daftar kartu (nomor, customer, sisa, umur, dua tombol) menggantikan tabel; tabel `hidden md:table`. Verifikasi Playwright viewport 390×844 di kedua halaman (skenario manual di PR, bukan test otomatis). **M**.

---

## Fase 5 — Saat admin mulai input

### 5.1 Peran & hak akses

**Backend**
- Kolom `users.role` string enum `UserRole { Owner = 'owner'; Admin = 'admin' }`, default `owner` untuk data lama. Tidak ada tabel permission — dua peran, aturan tetap, `Gate` cukup. `// ponytail: dua peran hard-coded; tabel permission kalau peran ketiga muncul`.
- Gate: `view-finance` (Laporan, Modal & Bagi Hasil, Dashboard bagian omzet/BEP, margin & HPP di Order/Katalog/POS), `manage-catalog` (ubah harga/HPP), `delete-money` (hapus pembayaran/biaya/servis), `close-period`, `manage-users`, plus `manage-assets`, `manage-templates`, `record-operating-expense` supaya K4 tercakup penuh — tabel route × gate lengkap di spek 5.1. Admin: hanya `null` dari semuanya kecuali mencatat (order, POS, pembayaran, biaya job, customer). Dipasang sebagai middleware `can:` di route group Finance dan `authorize()` di request yang relevan.
- Props yang memuat angka finansial (`margin`, `unit_cost`, `direct_cost`) **dihilangkan** di server untuk admin (bukan disembunyikan di klien).
- Undangan user: registrasi Fortify sudah mati (`config/fortify.php` tanpa `Features::registration()`) → owner membuat user admin dari halaman Settings → "Pengguna" (`users.index/store/update` role & reset sandi). Hanya owner.

**Frontend**
- `usePage().props.auth.user.role`; `app-sidebar.tsx` menyaring grup Keluaran (Laporan, Modal) dan item yang tidak boleh; kolom Margin/HPP dirender kondisional berdasarkan **ada-tidaknya** field di props (bukan role) supaya satu sumber kebenaran.

**Test minimal.** Admin `GET reports/profit-loss` → 403; props order untuk admin tanpa `margin`; admin hapus pembayaran → 403; owner semua OK; sidebar admin tanpa "Laporan" (Vitest).

### 5.2 Shift kasir

**Backend**
- Tabel `cash_shifts`: `opened_by`, `opened_at`, `opening_cash`, `closed_at` nullable, `closed_by`, `expected_cash` (opening + tunai masuk − tunai refund), `counted_cash`, `difference`, `note`. Satu shift terbuka per waktu (unique partial index `closed_at IS NULL`).
- Route `POST shifts` (buka), `PATCH shifts/{shift}/close`. Pembayaran **tunai** (POS & catat bayar) membutuhkan shift terbuka → 422 "Buka kasir dulu"; transfer/QRIS tidak. Laporan Kas Harian (3.3) menampilkan shift & selisih.

**Frontend**
- Banner di POS "Kasir belum dibuka — Buka kasir" / "Shift Agung sejak 09:02 · tunai Rp 450.000 · Tutup kasir". Dialog tutup menampilkan ekspektasi vs hitungan, selisih berwarna.

**Test minimal.** Bayar tunai tanpa shift → 422; QRIS tanpa shift → OK; `expected_cash` benar setelah dua penjualan tunai + satu refund; dua shift terbuka → ditolak.

---

## Fase 6 — Aset & lainnya (P3, sesuai kebutuhan)

| Item | Spesifikasi ringkas | Est. |
|---|---|---|
| **6.1 Serial + garansi** | Kolom `assets.serial_number` nullable, `warranty_until` date nullable; dua field di dialog Tambah Aset & Sheet; badge "Garansi s/d …" (hijau bila masih berlaku) | S |
| **6.2 Proyeksi penggantian** | Kartu di Aset: aset dengan `purchased_on + useful_life_months` ≤ 6 bulan lagi; estimasi `unit_price × units` dibanding saldo dana maintenance (`Funds`); kalimat "Butuh Rp X lagi" | M |
| **6.3 Bundel katalog** | Tabel `catalog_bundle_items (bundle_id, component_id, quantity)`; HPP bundel = Σ HPP komponen (dihitung, bukan disimpan); saat masuk order, item tetap satu baris bundel dengan `unit_cost` hasil hitung — laporan margin produk tidak berubah | L |
| **6.4 Termin pembayaran** | Tabel `payment_schedules (order_id, due_on, amount)`; piutang menampilkan termin terdekat sebagai jatuh tempo; reminder tagihan (2.4) memakai termin | L |
| **6.5 Riwayat harga katalog** | Tabel `catalog_price_changes (catalog_item_id, price, unit_cost, changed_at, user_id)` diisi dari observer `updating`; tab "Riwayat" di dialog Ubah | M |
| **6.6 Sumber lead per order** | Kolom `orders.source` nullable (pilihan sama `customers.source`), default dari customer saat buat; agregat di Laporan Penjualan | S |
| **6.7 Lampiran bukti transfer** | Kolom `payments.proof_path`; upload gambar ≤ 2 MB ke disk `local` (bukan publik), tampil via route bertanda tangan `payments/{payment}/proof`; butuh storage di hosting — tunda sampai hosting diputuskan | M |

**Tidak dibangun** (alasan di analisis bagian 7): stok, barcode, offline, payment gateway, kontrak e-sign, booking online, notifikasi WA otomatis.

---

## Dampak ke dokumen lain saat implementasi

| Item | Dokumen |
|---|---|
| 0.1, 0.2, 4.2, 5.2, 6.x | `docs/database.md` glosarium + bagian "Riwayat tidak diedit" (tambahkan: order boleh diubah, perubahannya tercatat) |
| 1.2, 1.4, 4.2 | `docs/business-flow.md` bagian 4 (status) & pertanyaan 6 (refund) |
| 1.1 | `docs/business-flow.md` bagian katalog; `docs/development.md` gotcha "kategori jasa harus enum" |
| 2.x | `docs/development.md` pola "Halaman untuk customer" — tambah struk & bukti bayar |
| 3.1 | `docs/development.md` pola baru "Daftar dengan pencarian & paginasi" + gotcha filter status bayar di SQL |
| 5.1 | `docs/development.md` bagian peran; `docs/business-flow.md` bagian 6 (RBAC tidak lagi ditunda) |
