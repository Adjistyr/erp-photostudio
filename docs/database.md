# Database — Skema & Rumus

PostgreSQL. Skema mengikuti entitas di [business-flow.md](./business-flow.md) bagian 3 dan 8. Kode memakai **bahasa Inggris**; dokumen bisnis dan UI memakai bahasa Indonesia — glosarium di bawah menjembatani keduanya.

---

## 1. Glosarium

| Istilah bisnis (dokumen/UI) | Kode (model · tabel) |
|---|---|
| Katalog (produk / jasa) | `CatalogItem` · `catalog_items` (`type`: product / service; `category` produk teks bebas, jasa wajib `ServiceCategory` Studio/Event/Add-on) |
| HPP bahan per unit | `unit_cost` (null untuk jasa **dan** item custom) |
| Profil publik item (company profile, spek 7.1) | `catalog_items.description` (nullable, ≤ 2000) · `catalog_items.is_public` (default false; tidak memengaruhi POS/form order) |
| Galeri foto item | `CatalogItemPhoto` · `catalog_item_photos` (`path` WebP ≤ 1600 px, `thumb_path` WebP 400×400, `position` terkecil = sampul, maks 8 per item; file di disk `public`, `catalog/{item}/`) |
| Customer | `Customer` · `customers` (index pencarian `customers_name_lower_idx` = `LOWER(name)` dan `customers_phone_idx`; `phone` disimpan ternormalisasi `62…` lewat `Modules\Customer\Support\Phone::normalise()` sejak spek 2.1; data lama `08…` tetap valid — pencocokan dari POS: HP → nama, HP yang sudah ada tidak ditimpa) |
| Order | `Order` · `orders` |
| Lini (retail / studio / event) | `business_line` → `BusinessLine` |
| Status kerja | `work_status` → `WorkStatus` (booking, scheduled, in_progress, done, delivered, cancelled) |
| Status bayar | `Order::paymentStatus()` — **tidak disimpan** |
| Tanggal sesi / acara / transaksi (sekaligus jatuh tempo) | `service_date` + `service_time` |
| Item order | `OrderItem` · `order_items` (`catalog_item_id` null = item custom: nama & harga deal dari input, spek 1.3; props `is_custom`) |
| Pembayaran (DP / termin / pelunasan) | `Payment` · `payments` |
| Biaya job (biaya langsung) | `JobCost` · `job_costs` |
| Biaya operasional | `OperatingExpense` · `operating_expenses` |
| Owner (pihak bagi hasil) | `Owner` · `owners` |
| Aturan / rasio bagi hasil | `ProfitShareRule` · `profit_share_rules` + pivot `owner_profit_share_rule` (`percent`) |
| Dana cadangan (%) | `reserve_percent` |
| Saldo awal (bulan sebelum go-live) | `OpeningBalance` · `opening_balances` |
| Setoran owner (pinjaman / modal) | `OwnerContribution` · `owner_contributions` (`kind`: loan / equity) |
| Investasi | `Investment` · `investments` |
| Pos dana (maintenance / cadangan) | `Fund` (enum: maintenance / reserve) |
| Pemakaian dana | `FundWithdrawal` · `fund_withdrawals` |
| Aset | `Asset` · `assets` |
| Servis / perawatan aset | `AssetMaintenance` · `asset_maintenances` (`type`: routine / repair) |
| Tutup buku (bulan final) | `PeriodClosing` · `period_closings` (`month`, `closed_at/by`, `reopened_at/by`; aktif = belum dibuka kembali) |
| Template pesan (promo, terima kasih, reminder H-1, tagihan) | `MessageTemplate` · `message_templates` (`key` primary: `promo`, `thank_you`, `reminder`, `billing`; baris hanya untuk template yang sudah diedit owner — default di `MessageTemplate::defaults()`). Placeholder: semua `{nama}`; `thank_you` `{link}` hasil foto; `billing` `{nomor}`, `{sisa}`, `{jatuh_tempo}`, `{link}` invoice. Nama studio & rekening ditanam ke default dari `config/studio.php` |
| Pencatat (siapa yang menginput) | `created_by` → `users` di semua tabel transaksi (order, pembayaran, biaya job/operasional, aset, servis, setoran, pemakaian dana, investasi); trait `Modules\Shared\Models\Concerns\RecordsCreator`. `null` = sebelum pencatatan atau user sudah dihapus |
| Riwayat perubahan order | `OrderEvent` · `order_events` (`type` → `OrderEventType`; `changes` jsonb hanya field yang berubah `{field: {from, to}}`; `user_id` nullable; hanya `created_at`). Ditulis hanya lewat `Modules\Order\Actions\RecordOrderEvent`, tidak pernah diedit/dihapus |
| Pengembalian uang (retur, DP dikembalikan) | `Refund` · `refunds` (`refunded_on` tanggal uang keluar, `amount`, `method`, `reason`, `created_by`) — mengurangi omzet bulan `refunded_on` dan `Order::margin()`; `Order::balance()`/status bayar tetap bruto |
| Laba rugi | `Modules\Finance\Services\ProfitAndLoss` |
| Piutang | `Modules\Finance\Services\Receivables` |
| Bagi hasil | `Modules\Finance\Services\ProfitSharing` |
| Mutasi pos dana | `Modules\Finance\Services\Funds` |
| Alokasi maintenance, nilai buku, jadwal perawatan | `Modules\Finance\Services\AssetMaintenance` |

---

## 2. Konvensi

### Uang dan persen disimpan sebagai bilangan bulat
Rupiah selalu `bigInteger` tanpa desimal (DESIGN.md R5), persen `unsignedTinyInteger`. Pecahan float tidak selalu berjumlah persis — 0.7 + 0.2 + 0.1 ≠ 1 — dan validasi "total rasio 100%" akan gagal untuk isian yang benar.

Menyimpan uang sebagai `decimal`/`float` adalah **blocker** — must fix before merge.

### Tanggal kalender pakai kolom `date`, bukan `timestamp`
Tanggal transaksi, jadwal, jatuh tempo, pembelian aset adalah tanggal kalender. `timestamp` yang dikonversi zona waktu bisa menggeser tanggal satu hari — bug yang pernah terjadi di prototype. Model memakai cast `immutable_date`.

Kolom tanggal kalender bertipe `timestamp` adalah **blocker** — must fix before merge.

### Enum sebagai string + cast PHP
Status dan kategori disimpan sebagai string dengan cast ke enum PHP (`Modules/<Modul>/Enums`), bukan tipe enum database. Bisnis masih muda; menambah status di enum database butuh migration.

Not a blocker — approve with comment suggesting string + PHP enum cast.

### Turunan tidak disimpan
Status bayar, laba rugi, piutang, bagi hasil, saldo pos dana, alokasi maintenance **dihitung ulang dari data mentah** setiap kali dibutuhkan. Tidak ada angka tersimpan yang bisa basi saat biaya bulan lalu diinput telat.

```php
// ❌ Salah — kolom yang bisa tidak sinkron dengan pembayaran
$order->update(['payment_status' => 'paid']);

// ✅ Benar — selalu diturunkan
$order->paymentStatus(); // dari total payments vs total order
```

Menyimpan nilai turunan sebagai kolom adalah **blocker** — must fix before merge.

### Riwayat tidak diedit
- Aturan bagi hasil: perubahan rasio = **baris baru** dengan `effective_month` ≥ bulan berjalan. Validasi di `ProfitSharing::validateRule()`.
- Aset dilepas (`disposed_on`), **tidak dihapus** — menghapus mengubah alokasi bulan-bulan saat aset masih dimiliki.
- Harga dan HPP item order **disalin saat transaksi** — perubahan katalog tidak mengubah order lama.
- **Pengecualian: order & item order boleh diubah** lewat Ubah Order (spek 1.2) — jadwal, lokasi, catatan, customer, item (tambah/hapus/qty). Baris item lama tidak disalin ulang dari katalog (harga deal tetap); setiap simpan meninggalkan satu event `updated` di `order_events`. Uang tidak ikut berubah: pembayaran & biaya job tetap aturan di bawah.
- **Pengembalian uang = baris `refunds` baru bertanggal hari pengembalian**, bukan menghapus/mengubah pembayaran lama — pembayaran di bulan yang sudah tutup buku tetap utuh; omzet yang berkurang adalah omzet bulan pengembalian.
- Catatan uang (pembayaran, biaya job/operasional, servis aset, pemakaian dana, setoran owner) **tidak diedit**. Koreksi salah catat = **hapus lalu catat ulang** (keputusan 2026-10-06), dan hanya untuk tanggal di bulan yang **belum tutup buku** (`OpenPeriod::ensureOpen()`). Setoran yang sudah terpakai (membiayai investasi, pinjaman mulai dilunasi, uang pos dana sudah dipakai) tidak bisa dihapus.
- Setiap perubahan order (dibuat, status maju/batal, link hasil, pembayaran dicatat/dihapus) meninggalkan **event** di `order_events`, dicatat dalam transaksi yang sama — order boleh berubah, jejaknya tidak.
- Setiap catatan menyimpan **pencatatnya** (`created_by`, diisi otomatis saat baris dibuat, tidak pernah diubah) — jejak untuk menelusuri selisih kas begitu ada lebih dari satu pengguna yang menginput.

Mengedit aturan bagi hasil yang sudah dipakai, menghapus aset, atau menghapus/mengubah catatan uang di bulan yang sudah tutup buku adalah **blocker** — must fix before merge.

### Walk-in tanpa customer
Order walk-in yang customernya tidak dicatat memakai `customer_id = null`, bukan baris customer "Umum" seperti di prototype. Baris palsu ikut terhitung jumlah customer dan masuk daftar blast.

Not a blocker — approve with comment suggesting nullable `customer_id`.

---

## 3. Rumus inti

Detail dan alasan tiap aturan ada di business-flow bagian 7–8; ringkasnya:

| Rumus | Letak |
|---|---|
| Omzet basis kas = pembayaran yang diterima di bulan itu | `ProfitAndLoss::revenue()` |
| HPP bahan diakui di bulan order menerima pembayaran | `ProfitAndLoss::materialCosts()` |
| Laba bersih = omzet − (HPP + biaya job) − biaya operasional − alokasi maintenance | `ProfitAndLoss::forMonth()` |
| Alokasi maintenance = Σ harga × unit × % aset yang dimiliki di **akhir** bulan | `AssetMaintenance::allocationForMonth()` |
| Potongan bagi hasil = min(laba, max(akumulasi rugi, sisa pinjaman ke kas)) | `ProfitSharing::calculate()` |
| Alokasi pos dana hanya untuk bulan yang sudah tutup; pinjaman ke pos dana dilunasi dari alokasi pos itu | `Funds` |
| Nilai buku garis lurus — informasi saja, tidak masuk laba rugi | `AssetMaintenance::bookValue()` |

---

## 4. Dataset demo

`php artisan db:seed --class=DemoSeeder` mengisi dataset prototype (`web/app/lib/dummy.ts`): 12 order Agustus 2026, Juli sebagai saldo awal dari sheet client, 6 aset, setoran, servis. Owner ditautkan ke akun `agung@`/`raka@potraittime.test` kalau `DatabaseSeeder` sudah dijalankan.

Test di `tests/Feature/Finance` mengunci angka dataset ini — porting test TypeScript prototype dengan angka yang sama (omzet Agustus Rp 5.790.000, rugi −Rp 2.894.950, bagi hasil Juli Agung Rp 890.002, dst). Mengubah dataset berarti mengubah spesifikasi: test harus jebol dulu, baru diperbarui.

Jangan jalankan `DemoSeeder` di produksi.
