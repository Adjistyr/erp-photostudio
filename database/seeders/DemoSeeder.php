<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Modules\Asset\Enums\AssetStatus;
use Modules\Asset\Enums\MaintenanceType;
use Modules\Asset\Models\Asset;
use Modules\Asset\Models\AssetMaintenance;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Catalog\Models\CatalogItem;
use Modules\Customer\Models\Customer;
use Modules\Expense\Models\OperatingExpense;
use Modules\Finance\Enums\ContributionDestination;
use Modules\Finance\Enums\ContributionKind;
use Modules\Finance\Models\Investment;
use Modules\Finance\Models\OpeningBalance;
use Modules\Finance\Models\Owner;
use Modules\Finance\Models\OwnerContribution;
use Modules\Finance\Models\ProfitShareRule;
use Modules\Order\Enums\PaymentMethod;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Modules\Shared\Enums\BusinessLine;

/**
 * Dataset prototype (web/app/lib/dummy.ts) — "hari ini" 26 Agustus 2026.
 *
 * Angka di sini dikunci oleh test di tests/Feature/Finance: test PHP itu
 * porting dari test TypeScript prototype dengan angka yang sama persis
 * (omzet Agustus Rp 5.790.000, rugi −Rp 2.894.950, dst). Mengubah dataset ini
 * berarti mengubah spesifikasi — test harus jebol dulu, baru diperbarui.
 *
 * Satu perbedaan dari prototype: transaksi walk-in tanpa data customer
 * memakai customer_id null, bukan baris customer "Umum".
 *
 * Jalankan: php artisan db:seed --class=DemoSeeder (bukan di produksi).
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $catalog = $this->catalog();
        $customers = $this->customers();
        $this->orders($catalog, $customers);
        $this->operatingExpenses();
        $owners = $this->owners();
        $this->profitSharing($owners);
        $this->assets($owners);
    }

    /** @return array<string, CatalogItem> */
    private function catalog(): array
    {
        $rows = [
            'PRD-01' => ['Keychain Foto Akrilik', CatalogItemType::Product, 25_000, 8_000, 'Merchandise'],
            'PRD-02' => ['Cetak 4R', CatalogItemType::Product, 5_000, 1_500, 'Cetak'],
            'PRD-03' => ['Photostrip 3 Pose', CatalogItemType::Product, 20_000, 6_000, 'Cetak'],
            'PRD-04' => ['Cetak 10R + Bingkai', CatalogItemType::Product, 85_000, 32_000, 'Cetak'],
            'PRD-05' => ['Album Mini 20 Halaman', CatalogItemType::Product, 175_000, 70_000, 'Album'],
            'JSA-01' => ['Paket Studio 1 Jam', CatalogItemType::Service, 350_000, null, 'Studio'],
            'JSA-02' => ['Paket Studio Keluarga 2 Jam', CatalogItemType::Service, 650_000, null, 'Studio'],
            'JSA-03' => ['Add-on Editing Lanjutan', CatalogItemType::Service, 150_000, null, 'Add-on'],
            'JSA-04' => ['Paket Prewedding Outdoor', CatalogItemType::Service, 2_500_000, null, 'Event'],
            'JSA-05' => ['Paket Wedding Full Day', CatalogItemType::Service, 8_500_000, null, 'Event'],
        ];

        return array_map(fn (array $r) => CatalogItem::create([
            'name' => $r[0], 'type' => $r[1], 'price' => $r[2], 'unit_cost' => $r[3], 'category' => $r[4],
        ]), $rows);
    }

    /** @return array<string, Customer> */
    private function customers(): array
    {
        $rows = [
            'CUS-01' => ['Sinta Prameswari', '0812-3344-5566', 'sinta.p@gmail.com', 'Instagram', null],
            'CUS-02' => ['Budi Hartono', '0813-2211-9087', 'budihartono@gmail.com', 'Teman', null],
            'CUS-03' => ['Rani & Dimas', '0857-8899-1200', 'ranidimas.wedding@gmail.com', 'Instagram', 'Wedding 18 Okt, venue Hotel Tentrem'],
            'CUS-04' => ['Nadia Salsabila', '0896-1122-8899', 'nadia.salsa@gmail.com', 'Instagram', null],
            'CUS-05' => ['Yoga Pratama', '0821-7766-3344', null, 'Lewat depan studio', null],
            'CUS-06' => ['Dewi Anggraini', '0878-4455-2211', 'dewi.angg@gmail.com', 'Teman', null],
            'CUS-07' => ['Fajar Nugroho', '0819-6633-7788', null, 'Instagram', null],
        ];

        return array_map(fn (array $r) => Customer::create([
            'name' => $r[0], 'phone' => $r[1], 'email' => $r[2], 'source' => $r[3], 'notes' => $r[4],
        ]), $rows);
    }

    /**
     * @param  array<string, CatalogItem>  $catalog
     * @param  array<string, Customer>  $customers
     */
    private function orders(array $catalog, array $customers): void
    {
        // [nomor, customer, lini, tanggal, jam, status, lokasi, catatan, link,
        //  [[katalog, qty]], [[tgl, nominal, metode, ket]], [[tgl, kategori, ket, nominal]]]
        $rows = [
            ['ORD-0001', 'CUS-02', BusinessLine::Studio, '2026-08-15', null, WorkStatus::Delivered, 'Studio', null, 'https://drive.google.com/drive/folders/ord-0001',
                [['JSA-01', 1]], [['2026-08-15', 350_000, PaymentMethod::Cash, 'Pelunasan']], []],
            ['ORD-0002', 'CUS-01', BusinessLine::Retail, '2026-08-18', null, WorkStatus::Delivered, null, null, null,
                [['PRD-02', 9]], [['2026-08-18', 45_000, PaymentMethod::Qris, 'Pelunasan']], []],
            ['ORD-0003', null, BusinessLine::Retail, '2026-08-19', null, WorkStatus::Delivered, null, null, null,
                [['PRD-03', 4]], [['2026-08-19', 80_000, PaymentMethod::Cash, 'Pelunasan']], []],
            // Batal ber-DP: refund belum ada (business-flow 2, pertanyaan 6) —
            // DP tetap omzet, tapi order tidak masuk piutang maupun jasa terlaris.
            ['ORD-0004', 'CUS-07', BusinessLine::Event, '2026-08-15', null, WorkStatus::Cancelled, 'Kebun Raya', 'Dibatalkan customer H-7, DP hangus', null,
                [['JSA-04', 1]], [['2026-08-08', 500_000, PaymentMethod::Transfer, 'DP']], []],
            ['ORD-0005', 'CUS-06', BusinessLine::Studio, '2026-08-29', '10:00', WorkStatus::Booking, 'Studio', null, null,
                [['JSA-01', 1]], [], []],
            ['ORD-0006', null, BusinessLine::Retail, '2026-08-20', null, WorkStatus::Delivered, null, null, null,
                [['PRD-04', 1]], [['2026-08-20', 85_000, PaymentMethod::Cash, 'Pelunasan']], []],
            ['ORD-0007', 'CUS-05', BusinessLine::Studio, '2026-08-21', null, WorkStatus::Delivered, 'Studio', null, 'https://drive.google.com/drive/folders/ord-0007',
                [['JSA-01', 1]], [['2026-08-21', 350_000, PaymentMethod::Transfer, 'Pelunasan']], []],
            ['ORD-0008', 'CUS-04', BusinessLine::Event, '2026-08-12', null, WorkStatus::Done, 'Pantai Parangtritis', null, null,
                [['JSA-04', 1]], [['2026-08-05', 1_000_000, PaymentMethod::Transfer, 'DP']],
                [['2026-08-12', 'Crew', 'Fee fotografer', 600_000], ['2026-08-12', 'Crew', 'Fee MUA', 400_000], ['2026-08-12', 'Transport', 'Sewa mobil + BBM', 200_000]]],
            ['ORD-0009', 'CUS-02', BusinessLine::Studio, '2026-08-24', null, WorkStatus::Delivered, 'Studio', null, 'https://drive.google.com/drive/folders/ord-0009',
                [['JSA-02', 1]], [['2026-08-24', 650_000, PaymentMethod::Transfer, 'Pelunasan']], [['2026-08-24', 'Crew', 'Fee MUA', 200_000]]],
            ['ORD-0010', null, BusinessLine::Retail, '2026-08-26', null, WorkStatus::Delivered, null, null, null,
                [['PRD-01', 2], ['PRD-02', 6]], [['2026-08-26', 80_000, PaymentMethod::Cash, 'Pelunasan']], []],
            ['ORD-0011', 'CUS-03', BusinessLine::Event, '2026-10-18', null, WorkStatus::Scheduled, 'Hotel Tentrem', null, null,
                [['JSA-05', 1]], [['2026-08-14', 2_500_000, PaymentMethod::Transfer, 'DP']],
                [['2026-08-20', 'Crew', 'DP fee fotografer utama', 1_000_000], ['2026-08-22', 'Sewa alat', 'DP sewa lighting + drone', 600_000]]],
            ['ORD-0012', 'CUS-01', BusinessLine::Studio, '2026-08-26', '14:00', WorkStatus::InProgress, 'Studio', null, null,
                [['JSA-01', 1]], [['2026-08-26', 150_000, PaymentMethod::Transfer, 'DP']], []],
        ];

        foreach ($rows as [$number, $customer, $line, $date, $time, $status, $location, $notes, $link, $items, $payments, $jobCosts]) {
            $order = Order::create([
                'number' => $number,
                'customer_id' => $customer === null ? null : $customers[$customer]->id,
                'business_line' => $line,
                'service_date' => $date,
                'service_time' => $time,
                'work_status' => $status,
                'location' => $location,
                'notes' => $notes,
                'result_link' => $link,
                'discount' => 0,
            ]);
            foreach ($items as [$code, $qty]) {
                $item = $catalog[$code];
                $order->items()->create([
                    'catalog_item_id' => $item->id,
                    'name' => $item->name,
                    'quantity' => $qty,
                    'unit_price' => $item->price,
                    'unit_cost' => $item->unit_cost,
                ]);
            }
            foreach ($payments as [$paidOn, $amount, $method, $note]) {
                $order->payments()->create(['paid_on' => $paidOn, 'amount' => $amount, 'method' => $method, 'note' => $note]);
            }
            foreach ($jobCosts as [$incurredOn, $category, $description, $amount]) {
                $order->jobCosts()->create(['incurred_on' => $incurredOn, 'category' => $category, 'description' => $description, 'amount' => $amount]);
            }
        }
    }

    private function operatingExpenses(): void
    {
        foreach ([
            ['2026-08-01', 'Sewa tempat', 'Sewa ruko Agustus', 3_500_000],
            ['2026-08-05', 'Utilitas', 'Listrik + internet', 800_000],
            ['2026-08-10', 'Marketing', 'Iklan Instagram', 500_000],
        ] as [$spentOn, $category, $description, $amount]) {
            OperatingExpense::create(['spent_on' => $spentOn, 'category' => $category, 'description' => $description, 'amount' => $amount]);
        }
    }

    /** @return array{agung: Owner, raka: Owner} */
    private function owners(): array
    {
        // Ditautkan ke akun login kalau DatabaseSeeder sudah membuatnya.
        $owner = fn (string $name) => Owner::create([
            'name' => $name,
            'user_id' => User::where('email', strtolower($name).'@potraittime.test')->value('id'),
        ]);

        return ['agung' => $owner('Agung'), 'raka' => $owner('Raka')];
    }

    /** @param  array{agung: Owner, raka: Owner}  $owners */
    private function profitSharing(array $owners): void
    {
        $rule = ProfitShareRule::create(['effective_month' => '2026-07', 'reserve_percent' => 10]);
        $rule->owners()->attach([
            $owners['agung']->id => ['percent' => 70],
            $owners['raka']->id => ['percent' => 30],
        ]);

        // Contoh omzet Rp 10.000.000 di sheet client, maintenance terkoreksi:
        // 10.000.000 − 7.796.849 − 790.450 = 1.412.701 (business-flow 8.1).
        OpeningBalance::create([
            'month' => '2026-07', 'revenue' => 10_000_000, 'net_profit' => 1_412_701,
            'source' => 'Sheet HPP & pembagian hasil',
        ]);

        // Pinjaman Agung untuk menutup kas Agustus — dilunasi dari laba
        // berikutnya sebelum dibagi (8.5).
        OwnerContribution::create([
            'owner_id' => $owners['agung']->id, 'contributed_on' => '2026-08-25', 'amount' => 2_000_000,
            'kind' => ContributionKind::Loan, 'destination' => ContributionDestination::Cash,
            'note' => 'Menutup kekurangan kas Agustus',
        ]);
    }

    /**
     * Alat dari sheet maintenance client, 5% per bulan = Rp 790.450 (sheet
     * menulis Rp 693.100 karena lupa mengalikan unit). Modal awal Agung
     * adalah CONTOH — data asli belum ada (business-flow 8.7).
     *
     * @param  array{agung: Owner, raka: Owner}  $owners
     */
    private function assets(array $owners): void
    {
        $equity = OwnerContribution::create([
            'owner_id' => $owners['agung']->id, 'contributed_on' => '2026-07-01', 'amount' => 15_809_000,
            'kind' => ContributionKind::Equity, 'destination' => ContributionDestination::Investment,
            'note' => 'Modal awal — alat studio',
        ]);
        $investment = Investment::create([
            'invested_on' => '2026-07-01', 'description' => 'Kamera, printer, lighting & aksesori',
            'amount' => 15_809_000, 'owner_contribution_id' => $equity->id,
        ]);

        $asset = fn (string $name, string $category, string $model, int $units, int $price, int $life, ?int $interval) => Asset::create([
            'name' => $name, 'category' => $category, 'model' => $model,
            'units' => $units, 'unit_price' => $price, 'purchased_on' => '2026-07-01',
            'maintenance_percent' => 5, 'useful_life_months' => $life,
            'maintenance_interval_months' => $interval, 'status' => AssetStatus::Active,
            'investment_id' => $investment->id,
        ]);

        // Urutan pembuatan = urutan id = urutan tampil (AST-01 … AST-06).
        $asset('Kamera mirrorless', 'Kamera', 'Canon EOS M50', 1, 7_000_000, 48, 6);
        $asset('Baterai kamera', 'Aksesori', 'Kingma LP-E12', 2, 120_000, 24, null);
        $asset('Trigger flash', 'Aksesori', 'Godox X2T', 1, 565_000, 24, null);
        $asset('Memory card', 'Aksesori', 'SanDisk 32GB', 2, 477_000, 24, null);
        $lighting = $asset('Lighting studio', 'Lighting', 'Godox SK400 II', 2, 1_350_000, 48, 12);
        $asset('Printer foto', 'Printer', 'Epson L8050', 1, 4_350_000, 36, 1);

        AssetMaintenance::create([
            'asset_id' => $lighting->id, 'performed_on' => '2026-08-10',
            'type' => MaintenanceType::Repair, 'description' => 'Ganti kipas pendingin', 'cost' => 150_000,
        ]);
    }
}
