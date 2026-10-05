# Database — Skema & Rumus

PostgreSQL. Skema mengikuti entitas di [business-flow.md](./business-flow.md) bagian 3 dan 8. Kode memakai **bahasa Inggris**; dokumen bisnis dan UI memakai bahasa Indonesia — glosarium di bawah menjembatani keduanya.

---

## 1. Glosarium

| Istilah bisnis (dokumen/UI) | Kode (model · tabel) |
|---|---|
| Katalog (produk / jasa) | `CatalogItem` · `catalog_items` (`type`: product / service) |
| HPP bahan per unit | `unit_cost` (null untuk jasa) |
| Customer | `Customer` · `customers` |
| Order | `Order` · `orders` |
| Lini (retail / studio / event) | `business_line` → `BusinessLine` |
| Status kerja | `work_status` → `WorkStatus` (booking, scheduled, in_progress, done, delivered, cancelled) |
| Status bayar | `Order::paymentStatus()` — **tidak disimpan** |
| Tanggal sesi / acara / transaksi (sekaligus jatuh tempo) | `service_date` + `service_time` |
| Item order | `OrderItem` · `order_items` |
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
| Template pesan (promo, terima kasih, reminder H-1) | `MessageTemplate` · `message_templates` (`key` primary; baris hanya untuk template yang sudah diedit owner — default di `MessageTemplate::defaults()`) |
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

Mengedit aturan bagi hasil yang sudah dipakai, atau menghapus aset, adalah **blocker** — must fix before merge.

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
