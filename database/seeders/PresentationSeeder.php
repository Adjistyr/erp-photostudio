<?php

namespace Database\Seeders;

use App\Models\User;
use Carbon\CarbonImmutable;
use Closure;
use Faker\Factory as FakerFactory;
use Faker\Generator;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\Asset\Enums\AssetStatus;
use Modules\Asset\Enums\MaintenanceType;
use Modules\Asset\Models\Asset;
use Modules\Asset\Models\AssetCategory;
use Modules\Asset\Models\AssetCheckout;
use Modules\Asset\Models\AssetMaintenance;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Catalog\Models\CatalogItem;
use Modules\Catalog\Models\CatalogItemVariant;
use Modules\Customer\Models\Customer;
use Modules\Expense\Models\OperatingExpense;
use Modules\Finance\Actions\RecordInvestment;
use Modules\Finance\Enums\ContributionDestination;
use Modules\Finance\Enums\ContributionKind;
use Modules\Finance\Enums\Fund;
use Modules\Finance\Models\FundWithdrawal;
use Modules\Finance\Models\OpeningBalance;
use Modules\Finance\Models\Owner;
use Modules\Finance\Models\OwnerContribution;
use Modules\Finance\Models\PeriodClosing;
use Modules\Finance\Models\ProfitShareRule;
use Modules\Finance\Services\Funds;
use Modules\Finance\Services\Periods;
use Modules\Finance\Services\ProfitAndLoss;
use Modules\Order\Actions\RecordOrderEvent;
use Modules\Order\Actions\ReplacePaymentSchedules;
use Modules\Order\Enums\OrderEventType;
use Modules\Order\Enums\PaymentMethod;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Modules\Order\Models\Payment;
use Modules\Shared\Enums\BusinessLine;

/**
 * Data presentasi ke client: enam bulan operasional studio yang terlihat
 * seperti produksi — ratusan order retail, studio, dan event lengkap dengan
 * termin, biaya job, peminjaman alat, biaya operasional, aset, dan tutup buku.
 *
 * Tanggal RELATIF ke hari ini, bukan dikunci seperti DemoSeeder: Dashboard
 * (jadwal hari ini/besok, piutang jatuh tempo, bulan berjalan) selalu terisi
 * kapan pun seeder dijalankan. DemoSeeder tidak bisa dipakai untuk ini —
 * angkanya dikunci test di 26 Agustus 2026.
 *
 * Acak tapi deterministik (seed tetap): dijalankan di hari yang sama →
 * data yang sama. Waktu dibuat tiap catatan (created_at, riwayat order)
 * dimundurkan ke saat kejadiannya lewat test-now Carbon, jadi riwayat order
 * dan penomoran ORD-xxxx urut seperti diinput sungguhan.
 *
 * Jalankan di DB kosong — bukan di produksi:
 *   php artisan migrate:fresh --seed --seeder=PresentationSeeder
 */
class PresentationSeeder extends Seeder
{
    private const SEED = 20260501;

    /** Bulan pertama app dipakai = 6 bulan sebelum bulan berjalan. */
    private const MONTHS_OF_HISTORY = 6;

    private CarbonImmutable $now;

    private CarbonImmutable $today;

    private CarbonImmutable $goLive;

    private Generator $faker;

    private User $agung;

    private User $raka;

    private ?User $admin = null;

    /** @var array<string, CatalogItem> */
    private array $catalog = [];

    /** @var array<string, list<CatalogItemVariant>> */
    private array $variants = [];

    /** @var list<Customer> */
    private array $customers = [];

    /** @var array<string, Asset> */
    private array $assets = [];

    /** @var list<array{at: CarbonImmutable, run: Closure(): void}> */
    private array $timeline = [];

    private bool $retailRefundDone = false;

    private bool $eventRefundDone = false;

    private bool $revertDone = false;

    public function run(): void
    {
        // Dataset utuh, bukan per baris: dijalankan ulang di DB berisi →
        // dilewati, bukan menumpuk ratusan order kedua.
        if (CatalogItem::query()->exists()) {
            $this->command->warn('PresentationSeeder dilewati: katalog sudah berisi data. Jalankan lewat migrate:fresh.');

            return;
        }

        $this->call(DatabaseSeeder::class);

        mt_srand(self::SEED);
        $this->faker = FakerFactory::create('id_ID');
        $this->faker->seed(self::SEED);

        $this->now = CarbonImmutable::now();
        $this->today = $this->now->startOfDay();
        $this->goLive = $this->today->startOfMonth()->subMonths(self::MONTHS_OF_HISTORY);
        $this->agung = User::where('email', 'agung@potraittime.test')->sole();
        $this->raka = User::where('email', 'raka@potraittime.test')->sole();

        // Satu transaksi: ±7.000 insert jauh lebih cepat, dan gagal di tengah
        // tidak meninggalkan dataset setengah jadi.
        try {
            DB::transaction(function () {
                $owners = $this->owners();
                $this->catalog();
                $this->assets($owners);
                $this->admin();
                $this->planOrders();
                $this->runTimeline();
                $this->overdueCheckout();
                $this->operatingExpenses();
                $this->maintenance();
                $this->coverLosses();
                $this->closings();
                $this->reserveWithdrawal();
            });
        } finally {
            Auth::forgetUser();
        }
    }

    // ── Pemilik, bagi hasil, saldo awal ────────────────────────────────

    /** @return array{agung: Owner, raka: Owner} */
    private function owners(): array
    {
        $opening = $this->goLive->subMonth();

        return $this->at($opening->setTime(9, 0), $this->agung, function () use ($opening) {
            $agung = Owner::create(['name' => 'Agung', 'user_id' => $this->agung->id]);
            $raka = Owner::create(['name' => 'Raka', 'user_id' => $this->raka->id]);

            $rule = ProfitShareRule::create(['effective_month' => $opening->format('Y-m'), 'reserve_percent' => 10]);
            $rule->owners()->attach([$agung->id => ['percent' => 70], $raka->id => ['percent' => 30]]);

            // Bulan pertama usaha berjalan sebelum app dipakai — angkanya dari
            // sheet client (business-flow 8.8), rugi karena baru buka.
            OpeningBalance::create([
                'month' => $opening->format('Y-m'), 'revenue' => 6_250_000, 'net_profit' => -1_350_000,
                'source' => 'Sheet HPP & pembagian hasil (sebelum pakai app)',
            ]);
            OwnerContribution::create([
                'owner_id' => $agung->id, 'contributed_on' => $opening->endOfMonth()->toDateString(), 'amount' => 1_500_000,
                'kind' => ContributionKind::Loan, 'destination' => ContributionDestination::Cash,
                'note' => 'Menutup kekurangan kas bulan pertama',
            ]);

            return ['agung' => $agung, 'raka' => $raka];
        });
    }

    private function admin(): void
    {
        // Staf admin mulai kerja bulan kedua; sejak itu kasir POS lebih sering dia.
        $this->admin = $this->at($this->goLive->addMonth()->setTime(9, 0), $this->agung, fn () => User::factory()->admin()->create([
            'name' => 'Admin Studio', 'email' => 'admin@potraittime.test',
        ]));
    }

    // ── Katalog ────────────────────────────────────────────────────────

    private function catalog(): void
    {
        $this->at($this->goLive->subDays(3)->setTime(10, 0), $this->agung, function () {
            $product = CatalogItemType::Product;
            $service = CatalogItemType::Service;
            // [kode, nama, tipe, harga, HPP, kategori, tampil di profil, deskripsi]
            $rows = [
                ['PRINT-4R', 'Cetak 4R', $product, 5_000, 1_500, 'Cetak', false, null],
                ['STRIP', 'Photostrip 3 Pose', $product, 20_000, 6_000, 'Cetak', true, 'Tiga pose dalam satu strip, langsung jadi.'],
                ['PASFOTO', 'Pas Foto (1 set)', $product, 35_000, 5_000, 'Cetak', true, 'Ukuran 2x3, 3x4, 4x6 — background merah/biru.'],
                ['FRAME-10R', 'Cetak 10R + Bingkai', $product, 85_000, 32_000, 'Cetak', true, 'Cetak 10R dengan bingkai pilihan.'],
                ['KEYCHAIN', 'Keychain Foto Akrilik', $product, 25_000, 8_000, 'Merchandise', true, 'Gantungan kunci akrilik dua sisi.'],
                ['MAGNET', 'Magnet Kulkas Foto', $product, 15_000, 4_000, 'Merchandise', false, null],
                ['ALBUM-MINI', 'Album Mini 20 Halaman', $product, 175_000, 70_000, 'Album', true, 'Album hard cover 15x15 cm.'],
                ['STUDIO-1', 'Paket Studio 1 Jam', $service, 350_000, null, 'Studio', true, 'Sesi 1 jam, maks. 3 orang, 15 file edit.'],
                ['STUDIO-FAM', 'Paket Studio Keluarga 2 Jam', $service, 650_000, null, 'Studio', true, 'Sesi 2 jam, maks. 8 orang, 30 file edit.'],
                ['STUDIO-GRAD', 'Paket Wisuda Studio', $service, 450_000, null, 'Studio', true, 'Sesi 45 menit dengan properti toga, 20 file edit.'],
                ['STUDIO-MAT', 'Paket Maternity', $service, 750_000, null, 'Studio', true, 'Sesi 90 menit, 2 kostum, 25 file edit.'],
                ['STUDIO-PRINT', 'Paket Studio + Cetak', $service, 525_000, null, 'Studio', true, 'Sesi 1 jam + cetak 10R berbingkai + 5 lembar 4R.'],
                ['ADD-EDIT', 'Add-on Editing Lanjutan', $service, 150_000, null, 'Add-on', false, null],
                ['ADD-PERSON', 'Add-on Tambahan Orang', $service, 50_000, null, 'Add-on', false, null],
                ['EVT-PREWED', 'Paket Prewedding Outdoor', $service, 2_500_000, null, 'Event', true, 'Satu lokasi outdoor, 4 jam, 40 file edit.'],
                ['EVT-ENGAGE', 'Paket Lamaran / Engagement', $service, 3_500_000, null, 'Event', true, 'Foto + video highlight acara lamaran.'],
                ['EVT-WEDDING', 'Paket Wedding Full Day', $service, 8_500_000, null, 'Event', true, 'Akad + resepsi, 2 fotografer, 1 videografer, album.'],
                ['EVT-DOC', 'Dokumentasi Acara 4 Jam', $service, 2_000_000, null, 'Event', true, 'Ulang tahun, gathering kantor, seminar.'],
            ];
            foreach ($rows as [$code, $name, $type, $price, $cost, $category, $public, $description]) {
                $this->catalog[$code] = CatalogItem::create([
                    'name' => $name, 'type' => $type, 'price' => $price, 'unit_cost' => $cost, 'category' => $category,
                    'is_public' => $public, 'description' => $description,
                ]);
            }

            $variants = [
                'KEYCHAIN' => [['Bulat', 25_000, 8_000], ['Kotak', 25_000, 8_000], ['Love', 30_000, 10_000]],
                'FRAME-10R' => [['Kayu Natural', 85_000, 32_000], ['Hitam Minimalis', 85_000, 32_000], ['Putih Doff', 95_000, 36_000]],
            ];
            foreach ($variants as $code => $list) {
                foreach ($list as $i => [$name, $price, $cost]) {
                    $this->variants[$code][] = CatalogItemVariant::create([
                        'catalog_item_id' => $this->catalog[$code]->id, 'name' => $name, 'price' => $price,
                        'unit_cost' => $cost, 'position' => $i + 1,
                    ]);
                }
                $this->catalog[$code]->syncPriceFromVariants();
            }

            $this->catalog['STUDIO-PRINT']->components()->attach([
                $this->catalog['FRAME-10R']->id => ['quantity' => 1],
                $this->catalog['PRINT-4R']->id => ['quantity' => 5],
            ]);
        });

        // Kenaikan harga di bulan keempat — order lama tetap harga deal-nya.
        $this->timeline[] = ['at' => $this->goLive->addMonths(3)->setTime(8, 0), 'run' => function () {
            $this->at($this->goLive->addMonths(3)->setTime(8, 0), $this->agung, fn () => $this->catalog['STUDIO-1']->update(['price' => 375_000]));
        }];
    }

    // ── Aset & investasi ───────────────────────────────────────────────

    /** @param  array{agung: Owner, raka: Owner}  $owners */
    private function assets(array $owners): void
    {
        $opening = $this->goLive->subMonth();
        $investments = new RecordInvestment;

        // [kunci, nama, kategori, merek, model, unit, harga, umur, interval, %, tambahan]
        $agung = [
            ['camera', 'Kamera mirrorless', 'Kamera', 'Canon', 'EOS M50 Mark II', 1, 8_250_000, 48, 6, 5,
                ['serial_number' => '183052001234', 'warranty_until' => $opening->addYear()->toDateString(), 'location' => 'Lemari kamera']],
            ['battery', 'Baterai kamera', 'Aksesori', 'Kingma', 'LP-E12', 3, 120_000, 24, null, 5, ['location' => 'Lemari kamera']],
            ['trigger', 'Trigger flash', 'Aksesori', 'Godox', 'X2T', 1, 565_000, 24, null, 5, ['location' => 'Lemari kamera']],
            ['memory', 'Memory card', 'Aksesori', 'SanDisk', 'Extreme 64GB', 3, 285_000, 24, null, 5, ['location' => 'Lemari kamera']],
            ['lighting', 'Lighting studio', 'Lighting', 'Godox', 'SK400 II', 2, 1_350_000, 48, 12, 5, ['location' => 'Studio']],
            ['softbox', 'Softbox & stand', 'Lighting', 'Godox', 'SB-UBW 95cm', 2, 450_000, 48, null, 5, ['location' => 'Studio']],
            ['printer', 'Printer foto', 'Printer', 'Epson', 'L8050', 1, 4_350_000, 36, 1, 5,
                ['warranty_until' => $opening->addYear()->toDateString(), 'location' => 'Meja POS']],
            // Alat bawaan Agung sebelum usaha berdiri — umurnya habis, jadi
            // muncul di proyeksi penggantian.
            ['speedlite', 'Flash speedlite', 'Lighting', 'Godox', 'TT600', 1, 900_000, 24, null, 5,
                ['purchased_on' => $this->today->subMonths(25)->startOfMonth()->toDateString(), 'location' => 'Lemari kamera', 'notes' => 'Bawaan Agung, dibeli sebelum studio buka.']],
        ];
        $agungTotal = array_sum(array_map(fn (array $a) => $a[5] * $a[6], $agung));
        $this->at($opening->setTime(10, 0), $this->agung, function () use ($agung, $agungTotal, $owners, $investments, $opening) {
            $investment = $investments->execute('Modal awal — kamera, lighting, printer & aksesori', $agungTotal, $opening->toDateString(), $owners['agung']);
            $this->createAssets($agung, $investment->id, $opening);
        });

        $laptop = [['laptop', 'Laptop editing', 'Komputer', 'Apple', 'MacBook Air M2', 1, 12_500_000, 36, 12, 3, ['location' => 'Meja editing']]];
        $this->at($opening->addDays(2)->setTime(11, 0), $this->raka, function () use ($laptop, $owners, $investments, $opening) {
            $investment = $investments->execute('Laptop editing', 12_500_000, $opening->addDays(2)->toDateString(), $owners['raka']);
            $this->createAssets($laptop, $investment->id, $opening->addDays(2));
        });

        // Dibeli dari kas usaha (tanpa setoran owner) — alokasi maintenance naik sejak bulan ini.
        $lensOn = $this->goLive->addMonths(3)->addDays(11);
        $lens = [['lens', 'Lensa fix portrait', 'Lensa', 'Sigma', '30mm f/1.4 DC DN', 1, 4_350_000, 48, 12, 5, ['location' => 'Lemari kamera']]];
        $this->at($lensOn->setTime(14, 0), $this->agung, function () use ($lens, $investments, $lensOn) {
            $investment = $investments->execute('Lensa portrait untuk sesi studio', 4_350_000, $lensOn->toDateString(), null);
            $this->createAssets($lens, $investment->id, $lensOn);
        });

        $propsOn = $this->goLive->addMonths(4)->addDays(19);
        $props = [['props', 'Backdrop & properti studio', 'Properti & furnitur', 'Lokal', 'Backdrop kertas 3 warna + kursi', 1, 1_850_000, 36, null, 2, ['location' => 'Studio']]];
        $this->at($propsOn->setTime(13, 0), $this->raka, function () use ($props, $owners, $investments, $propsOn) {
            $investment = $investments->execute('Backdrop & properti studio', 1_850_000, $propsOn->toDateString(), $owners['raka']);
            $this->createAssets($props, $investment->id, $propsOn);
        });
    }

    /** @param  list<array{0: string, 1: string, 2: string, 3: string, 4: string, 5: int, 6: int, 7: int, 8: int|null, 9: int, 10: array<string, string>}>  $rows */
    private function createAssets(array $rows, int $investmentId, CarbonImmutable $purchasedOn): void
    {
        foreach ($rows as [$key, $name, $category, $brand, $model, $units, $price, $life, $interval, $percent, $extra]) {
            $cat = AssetCategory::where('name', $category)->sole();
            $this->assets[$key] = Asset::create([
                'name' => $name, 'asset_category_id' => $cat->id, 'code' => $cat->nextCode(), 'brand' => $brand, 'model' => $model,
                'units' => $units, 'unit_price' => $price, 'purchased_on' => $purchasedOn->toDateString(),
                'maintenance_percent' => $percent, 'useful_life_months' => $life, 'maintenance_interval_months' => $interval,
                'status' => AssetStatus::Active, 'investment_id' => $investmentId,
                ...$extra,
            ]);
        }
    }

    // ── Order: rencana per hari, dijalankan urut waktu dibuat ──────────

    private function planOrders(): void
    {
        $studioHorizon = $this->today->addDays(21);
        $eventHorizon = $this->today->addDays(80);

        for ($day = $this->goLive; $day->lte($eventHorizon); $day = $day->addDay()) {
            $weekend = $day->isWeekend();
            $daysAhead = (int) $this->today->diffInDays($day, false);
            // Usaha bertumbuh: ±30% volume di bulan pertama, penuh di bulan keenam.
            $growth = 0.3 + 0.7 * min(1.0, $this->goLive->diffInDays($day) / 165);

            if ($daysAhead <= 0) {
                $sales = $this->poisson(($weekend ? 3.8 : 2.2) * $growth);
                for ($i = 0; $i < $sales; $i++) {
                    $at = $day->setTime(mt_rand(9, 20), mt_rand(0, 59));
                    if ($daysAhead === 0 && $at->gt($this->now)) {
                        $at = $this->now->subMinutes(mt_rand(5, 120))->max($day->setTime(9, 0));
                    }
                    $this->timeline[] = ['at' => $at, 'run' => fn () => $this->retailSale($at)];
                }
            }

            if ($day->lte($studioHorizon)) {
                // Booking makin jarang makin jauh ke depan — belum semua orang pesan.
                $booked = $daysAhead <= 0 ? 1.0 : max(0.0, 1 - $daysAhead / 21);
                $sessions = $this->poisson(($weekend ? 1.5 : 0.55) * $growth * $booked);
                // Dashboard "Jadwal hari ini/besok" selalu terisi saat presentasi.
                if ($daysAhead === 0 || $daysAhead === 1) {
                    $sessions = max($sessions, 2);
                }
                $slots = ['09:00', '10:30', '13:00', '14:30', '16:00', '19:00'];
                shuffle($slots);
                foreach (array_slice($slots, 0, min($sessions, count($slots))) as $slot) {
                    $this->planStudio($day, $slot, guaranteed: $daysAhead === 0 || $daysAhead === 1);
                }
            }

            // Event pertama tiga minggu setelah go-live — acara sebelumnya
            // dipesan sebelum app dipakai, tidak tercatat.
            if ($weekend && $day->gte($this->goLive->addWeeks(3))) {
                $booked = $daysAhead <= 0 ? 1.0 : max(0.0, 1 - $daysAhead / 120);
                if ($this->chance(0.45 * $growth ** 1.5 * $booked)) {
                    $this->planEvent($day);
                }
            }
        }
    }

    private function runTimeline(): void
    {
        // usort stabil (PHP 8): kejadian di menit yang sama tetap urut rencana.
        usort($this->timeline, fn (array $a, array $b) => $a['at'] <=> $b['at']);
        foreach ($this->timeline as $entry) {
            ($entry['run'])();
        }
    }

    private function retailSale(CarbonImmutable $at): void
    {
        $products = ['PRINT-4R' => 30, 'STRIP' => 20, 'KEYCHAIN' => 18, 'PASFOTO' => 12, 'FRAME-10R' => 8, 'MAGNET' => 8, 'ALBUM-MINI' => 4];
        $qty = ['PRINT-4R' => [2, 20], 'STRIP' => [1, 4], 'KEYCHAIN' => [1, 3], 'PASFOTO' => [1, 2], 'FRAME-10R' => [1, 1], 'MAGNET' => [1, 4], 'ALBUM-MINI' => [1, 1]];
        $lines = [];
        $count = $this->pick([1, 1, 1, 1, 1, 1, 2, 2, 2, 3]);
        while (count($lines) < $count) {
            $code = $this->weighted($products);
            $lines[$code] = [$code, mt_rand(...$qty[$code])];
        }

        $cashier = $this->admin !== null && $this->chance(0.7) ? $this->admin : $this->pick([$this->agung, $this->raka]);
        $this->at($at, $cashier, function () use ($at, $lines) {
            $customer = $this->chance(0.3) ? $this->customer(repeatChance: 0.4) : null;
            $subtotal = $this->subtotal(array_values($lines));
            $discount = $this->chance(0.06) ? intdiv((int) ($subtotal * 0.05), 1000) * 1000 : 0;
            $order = $this->createOrder(BusinessLine::Retail, $customer, $at, null, WorkStatus::Delivered, array_values($lines), discount: $discount);
            $total = $order->total();

            $method = PaymentMethod::from($this->weighted(['cash' => 52, 'qris' => 40, 'transfer' => 8]));
            if ($total >= 40_000 && $this->chance(0.05)) {
                $second = intdiv($total, 2000) * 1000;
                $this->recordPayment($order, $total - $second, PaymentMethod::Cash, 'Pelunasan (1/2)');
                $this->recordPayment($order, $second, PaymentMethod::Qris, 'Pelunasan (2/2)');
            } else {
                $this->recordPayment($order, $total, $method, 'Pelunasan');
            }

            // Satu contoh refund retail di bulan lalu.
            $keychain = $order->items->first(fn ($item) => $item->catalog_item_id === $this->catalog['KEYCHAIN']->id);
            if (! $this->retailRefundDone && $keychain !== null && $this->happened($at->addDay()->setTime(11, 0)) && $at->gte($this->today->startOfMonth()->subMonth()->addDays(9))) {
                $this->retailRefundDone = true;
                $this->at($at->addDay()->setTime(11, 0), $this->agung, fn () => $this->recordRefund($order, $keychain->unit_price, $method, 'Akrilik retak, customer minta uang kembali'));
            }
        });
    }

    private function planStudio(CarbonImmutable $day, string $slot, bool $guaranteed): void
    {
        [$hour, $minute] = array_map('intval', explode(':', $slot));
        $session = $day->setTime($hour, $minute);
        $bookedAt = $session->subDays(mt_rand(1, 14))->setTime(mt_rand(9, 20), mt_rand(0, 59));
        $bookedAt = $bookedAt->max($this->goLive->setTime(9, mt_rand(0, 59)))->min($this->now->subMinutes(mt_rand(30, 600)));
        if ($bookedAt->gte($session)) {
            $bookedAt = $session->subHours(3);
        }
        $this->timeline[] = ['at' => $bookedAt, 'run' => fn () => $this->studioSession($session, $bookedAt, $guaranteed)];
    }

    private function studioSession(CarbonImmutable $session, CarbonImmutable $bookedAt, bool $guaranteed): void
    {
        $package = $this->weighted(['STUDIO-1' => 42, 'STUDIO-FAM' => 20, 'STUDIO-GRAD' => 14, 'STUDIO-MAT' => 9, 'STUDIO-PRINT' => 15]);
        $lines = [[$package, 1]];
        if ($this->chance(0.2)) {
            $lines[] = ['ADD-EDIT', 1];
        }
        if ($package === 'STUDIO-FAM' && $this->chance(0.35)) {
            $lines[] = ['ADD-PERSON', mt_rand(1, 3)];
        }
        if ($this->chance(0.15)) {
            $lines[] = ['FRAME-10R', 1];
        }
        $notes = $this->chance(0.15) ? $this->pick([
            'Tema baju putih-krem', 'Request background abu-abu', 'Bawa kucing peliharaan', 'Minta file mentah juga',
            'Datang 5 orang, 2 balita', 'Foto untuk lamaran kerja', 'Kejutan ulang tahun istri',
        ]) : null;

        $staff = $this->admin !== null && $this->chance(0.4) ? $this->admin : $this->pick([$this->agung, $this->raka]);
        $order = $this->at($bookedAt, $staff, function () use ($lines, $session, $notes) {
            $customer = $this->customer(repeatChance: 0.2);

            return $this->createOrder(BusinessLine::Studio, $customer, $session, $session->format('H:i'), WorkStatus::Booking, $lines, location: 'Studio', notes: $notes);
        });
        $total = $order->total();

        if ($this->chance(0.65)) {
            $deposit = intdiv($total, 100_000) * 50_000;
            $this->at($bookedAt->addMinutes(mt_rand(5, 90))->min($this->now), $staff, function () use ($order, $deposit) {
                $this->recordPayment($order, $deposit, PaymentMethod::from($this->weighted(['transfer' => 70, 'qris' => 30])));
                $this->advance($order, WorkStatus::Scheduled);
            });
        } elseif ($this->happened($bookedAt->addDay()) && $bookedAt->addDay()->lt($session) && $this->chance(0.5)) {
            $this->at($bookedAt->addDay(), $staff, fn () => $this->advance($order, WorkStatus::Scheduled));
        }

        if (! $guaranteed && $this->chance(0.05)) {
            $cancelAt = $bookedAt->addHours(mt_rand(6, max(6, (int) $bookedAt->diffInHours($session) - 2)));
            if ($this->happened($cancelAt)) {
                $this->at($cancelAt, $staff, fn () => $this->cancel($order, $this->pick(['Customer sakit', 'Jadwal bentrok, belum mau reschedule', 'Tidak ada kabar setelah booking'])));

                return;
            }
        }

        if ($session->startOfDay()->gte($this->today)) {
            return;
        }

        $this->at($session->subMinutes(10), $staff, function () use ($order) {
            if ($order->work_status === WorkStatus::Booking) {
                $this->advance($order, WorkStatus::Scheduled);
            }
            $this->advance($order, WorkStatus::InProgress);
        });
        if (in_array($lines[0][0], ['STUDIO-FAM', 'STUDIO-MAT'], true) && $this->chance(0.5)) {
            $this->at($session->addHour(), $this->raka, fn () => $order->jobCosts()->create([
                'incurred_on' => $session->toDateString(), 'category' => 'Crew', 'description' => 'Fee MUA', 'amount' => $this->pick([150_000, 200_000, 250_000]),
            ]));
        }

        $remaining = $total - (int) $order->payments()->sum('amount');
        if ($this->chance(0.88)) {
            $this->at($session->addMinutes(90), $staff, fn () => $this->recordPayment($order, $remaining, PaymentMethod::from($this->weighted(['cash' => 40, 'qris' => 35, 'transfer' => 25]))));
        } else {
            // Belum dilunasi saat sesi — dilunasi belakangan setelah ditagih.
            // Yang tanggal bayarnya belum tiba jadi piutang telat; piutang
            // berbulan-bulan tidak realistis di depan client.
            $lateAt = $session->addDays(mt_rand(2, 12))->setTime(mt_rand(10, 20), 0);
            if ($this->happened($lateAt)) {
                $this->at($lateAt, $staff, fn () => $this->recordPayment($order, $remaining, PaymentMethod::Transfer));
            }
        }

        $doneAt = $session->addDays(mt_rand(1, 4))->setTime(15, mt_rand(0, 59));
        if (! $this->happened($doneAt)) {
            return;
        }
        $this->at($doneAt, $this->raka, fn () => $this->advance($order, WorkStatus::Done));

        $deliveredAt = $doneAt->addDays(mt_rand(0, 2))->addHours(2);
        if (! $this->happened($deliveredAt) || $order->payments()->sum('amount') < $total) {
            return;
        }
        // Satu contoh koreksi salah klik di riwayat order (business-flow 4).
        if (! $this->revertDone && $session->gte($this->today->startOfMonth()->subMonth())) {
            $this->revertDone = true;
            $this->at($doneAt->addMinutes(3), $this->raka, fn () => $this->advance($order, WorkStatus::Delivered));
            $this->at($doneAt->addMinutes(5), $this->raka, fn () => $this->revert($order, WorkStatus::Done));
        }
        $this->at($deliveredAt, $this->raka, fn () => $this->deliver($order));
    }

    private function planEvent(CarbonImmutable $day): void
    {
        $type = $this->weighted(['EVT-WEDDING' => 18, 'EVT-PREWED' => 32, 'EVT-ENGAGE' => 20, 'EVT-DOC' => 30]);
        $daysAhead = (int) $this->today->diffInDays($day, false);
        $bookedAt = $day->subDays(mt_rand(21, 80))->setTime(mt_rand(10, 20), mt_rand(0, 59));
        // Dipesan sebelum go-live → dicatat di minggu-minggu awal, tidak menumpuk di hari pertama.
        $bookedAt = $bookedAt->max($this->goLive->addDays(mt_rand(0, 14))->setTime(mt_rand(10, 18), mt_rand(0, 59)));
        if ($daysAhead > 0) {
            $bookedAt = $bookedAt->min($this->now->subHours(mt_rand(2, 72)));
        }
        if ($bookedAt->gte($day)) {
            $bookedAt = $day->subDays(2)->setTime(10, 0);
        }
        $this->timeline[] = ['at' => $bookedAt, 'run' => fn () => $this->event($type, $day, $bookedAt)];
    }

    private function event(string $type, CarbonImmutable $day, CarbonImmutable $bookedAt): void
    {
        $time = ['EVT-WEDDING' => '07:00', 'EVT-PREWED' => $this->pick(['06:00', '15:30']), 'EVT-ENGAGE' => '10:00', 'EVT-DOC' => $this->pick(['10:00', '18:30'])][$type];
        $location = $this->pick(match ($type) {
            'EVT-WEDDING' => ['Royal Ambarrukmo', 'Hotel Tentrem', 'Pendopo Agung Ambarrukmo', 'Gedung Graha Sabha Pramana', 'Hyatt Regency Yogyakarta'],
            'EVT-PREWED' => ['Taman Sari', 'Candi Prambanan', 'Hutan Pinus Mangunan', 'Pantai Parangtritis', 'Kaliurang', 'Bukit Klangon'],
            'EVT-ENGAGE' => ['Rumah mempelai, Sleman', 'Rumah mempelai, Bantul', 'Rumah mempelai, Kota Yogyakarta'],
            default => ['Kantor BPD DIY', 'Jogja Expo Center', 'Rumah customer, Godean', 'Kafe Kopi Klotok', 'Sekolah Budi Mulia'],
        });
        $lines = [[$type, 1]];
        if ($type === 'EVT-WEDDING' && $this->chance(0.5)) {
            $lines[] = ['ALBUM-MINI', 2];
        }
        if (in_array($type, ['EVT-PREWED', 'EVT-ENGAGE'], true) && $this->chance(0.3)) {
            $lines[] = ['ADD-EDIT', 1];
        }
        // Item custom hasil nego — bukan dari katalog (business-flow 5.3).
        $custom = $type === 'EVT-WEDDING' && $this->chance(0.35) ? ['Sewa drone + pilot', 1, 750_000] : null;
        $discount = $this->chance(0.3) ? 250_000 : 0;

        $order = $this->at($bookedAt, $this->raka, function () use ($type, $lines, $day, $time, $location, $custom, $discount) {
            $customer = $type === 'EVT-DOC' ? $this->customer(repeatChance: 0.25) : $this->customer(repeatChance: 0.05, couple: true);

            return $this->createOrder(BusinessLine::Event, $customer, $day, $time, WorkStatus::Booking, $lines, discount: $discount, location: $location, custom: $custom);
        });
        $total = $order->total();

        // Termin untuk paket besar (spek 6.4): DP – H-14 – pelunasan H-1.
        $deposit = intdiv((int) ($total * 0.3), 50_000) * 50_000;
        $installments = [];
        if ($total >= 3_000_000) {
            $second = intdiv((int) ($total * 0.4), 50_000) * 50_000;
            $secondDue = $day->subDays(14)->max($bookedAt->addDays(3)->startOfDay());
            $installments = [
                ['due_on' => $bookedAt->toDateString(), 'amount' => $deposit, 'label' => 'DP'],
                ['due_on' => $secondDue->toDateString(), 'amount' => $second, 'label' => 'Termin 2'],
                ['due_on' => $day->subDay()->toDateString(), 'amount' => $total - $deposit - $second, 'label' => 'Pelunasan'],
            ];
            $this->at($bookedAt, $this->raka, fn () => (new ReplacePaymentSchedules)->execute($order, $installments));
        }

        $this->at($bookedAt->addMinutes(mt_rand(10, 120))->min($this->now), $this->raka, function () use ($order, $deposit) {
            $this->recordPayment($order, $deposit, PaymentMethod::Transfer);
            $this->advance($order, WorkStatus::Scheduled);
        });

        if ($this->chance(0.08)) {
            $cancelAt = $bookedAt->addDays(mt_rand(3, max(3, (int) $bookedAt->diffInDays($day) - 7)))->setTime(13, 0);
            if ($this->happened($cancelAt) && $cancelAt->lt($day)) {
                $this->at($cancelAt, $this->raka, function () use ($order, $deposit) {
                    if (! $this->eventRefundDone) {
                        $this->eventRefundDone = true;
                        $this->cancel($order, 'Acara diundur tanpa tanggal, refund 50% DP sesuai kesepakatan');
                        $this->recordRefund($order, intdiv($deposit, 2), PaymentMethod::Transfer, 'Refund 50% DP — batal lebih dari H-30');

                        return;
                    }
                    $this->cancel($order, 'Batal dari pihak customer, DP hangus');
                });

                return;
            }
        }

        // Termin berikutnya dibayar sekitar jatuh temponya; sesekali telat
        // (atau belum dibayar sama sekali → muncul di piutang jatuh tempo).
        $rest = $installments === [] ? [['due_on' => $day->toDateString(), 'amount' => $total - $deposit]] : array_slice($installments, 1);
        foreach ($rest as $installment) {
            $due = CarbonImmutable::parse($installment['due_on'])->setTime(mt_rand(9, 20), mt_rand(0, 59));
            $paidAt = $this->chance(0.12) ? $due->addDays(mt_rand(4, 15)) : $due->subDays(mt_rand(0, 3))->max($bookedAt->addDay());
            if (! $this->happened($paidAt)) {
                break;
            }
            $this->at($paidAt, $this->raka, fn () => $this->recordPayment($order, $installment['amount'], PaymentMethod::Transfer));
        }

        if ($day->gte($this->today)) {
            return;
        }

        $this->checkoutGear($order, $day);
        $this->at($day->setTime(6, 0), $this->raka, fn () => $this->advance($order, WorkStatus::InProgress));
        $this->at($day->setTime(22, 0), $this->raka, function () use ($order, $type, $day) {
            foreach ($this->eventCosts($type) as [$category, $description, $amount]) {
                $order->jobCosts()->create(['incurred_on' => $day->toDateString(), 'category' => $category, 'description' => $description, 'amount' => $amount]);
            }
        });

        $doneAt = $day->addDays(mt_rand(5, 14))->setTime(16, 0);
        if (! $this->happened($doneAt)) {
            return;
        }
        $this->at($doneAt, $this->raka, fn () => $this->advance($order, WorkStatus::Done));
        $deliveredAt = $doneAt->addDays(mt_rand(1, 3));
        if ($this->happened($deliveredAt) && $order->payments()->sum('amount') >= $total) {
            $this->at($deliveredAt, $this->raka, fn () => $this->deliver($order));
        }
    }

    /** @return list<array{0: string, 1: string, 2: int}> */
    private function eventCosts(string $type): array
    {
        return match ($type) {
            'EVT-WEDDING' => [
                ['Crew', 'Fee fotografer kedua', 1_000_000], ['Crew', 'Fee videografer', 1_500_000],
                ['Crew', 'Fee asisten', 300_000], ['Transport', 'Sewa mobil + BBM', 350_000], ['Bahan', 'Cetak album kolase (vendor)', 650_000],
            ],
            'EVT-PREWED' => [
                ['Crew', 'Fee MUA', $this->pick([400_000, 450_000, 500_000])], ['Transport', 'BBM + parkir', $this->pick([150_000, 200_000, 300_000])],
                ['Sewa lokasi', 'Tiket & izin lokasi', $this->pick([100_000, 150_000, 350_000])],
            ],
            'EVT-ENGAGE' => [['Crew', 'Fee fotografer kedua', 600_000], ['Crew', 'Fee videografer', 750_000], ['Transport', 'BBM + parkir', 150_000]],
            default => [['Crew', 'Fee asisten', 300_000], ['Transport', 'BBM + parkir', 100_000]],
        };
    }

    /** Alat dibawa sehari sebelum acara, kembali sehari sesudahnya (kadang telat). */
    private function checkoutGear(Order $order, CarbonImmutable $day): void
    {
        $holder = $this->pick(['Dimas (fotografer)', 'Bayu (videografer)', 'Raka']);
        $out = $day->subDay();
        $dueBack = $day->addDay();
        $returned = $dueBack->addDays($this->chance(0.15) ? mt_rand(1, 2) : 0);
        $returnedOn = $this->happened($returned->setTime(10, 0)) ? $returned->toDateString() : null;

        foreach ([['lighting', 1], ['trigger', 1], ['battery', 2]] as [$key, $quantity]) {
            $asset = $this->assets[$key];
            $inUse = (int) AssetCheckout::where('asset_id', $asset->id)
                ->where('checked_out_on', '<=', $dueBack->toDateString())
                ->where(fn ($q) => $q->whereNull('returned_on')->orWhere('returned_on', '>=', $out->toDateString()))
                ->sum('quantity');
            if ($inUse + $quantity > $asset->units) {
                continue;
            }
            $this->at($out->setTime(16, 0), $this->raka, fn () => AssetCheckout::create([
                'asset_id' => $asset->id, 'order_id' => $order->id, 'quantity' => $quantity, 'holder' => $holder,
                'checked_out_on' => $out->toDateString(), 'due_back_on' => $dueBack->toDateString(),
                'returned_on' => $returnedOn,
            ]));
        }
    }

    /**
     * Peminjaman event terakhir yang sudah lewat rencana kembali dibiarkan
     * belum kembali — contoh "lewat rencana kembali" di Aset & Dashboard.
     * Dipilih setelah semua event dibuat, bukan saat event dibuat: urutan
     * pembuatan = urutan booking, bukan urutan tanggal acara.
     */
    private function overdueCheckout(): void
    {
        $latest = AssetCheckout::where('due_back_on', '<', $this->today->toDateString())->max('checked_out_on');
        if ($latest !== null) {
            AssetCheckout::where('checked_out_on', $latest)->update(['returned_on' => null]);
        }
    }

    // ── Operasional, servis aset, tutup buku ───────────────────────────

    private function operatingExpenses(): void
    {
        for ($month = $this->goLive; $month->lte($this->today); $month = $month->addMonth()) {
            $index = (int) $this->goLive->diffInMonths($month);
            $name = Periods::label($month->format('Y-m'));
            $rows = [
                [1, 'Sewa tempat', "Sewa ruko {$name}", 3_500_000],
                [5, 'Utilitas', 'Listrik PLN', $this->pick([450_000, 520_000, 580_000, 640_000])],
                [5, 'Utilitas', 'Internet IndiHome', 385_000],
                [10, 'Marketing', 'Iklan Instagram', 300_000 + 100_000 * $index],
                [15, 'Lain-lain', 'Tinta printer', $this->pick([180_000, 240_000, 320_000])],
                [20, 'Lain-lain', 'Air galon & kebersihan', 120_000],
            ];
            if ($index >= 1) {
                $rows[] = [25, 'Gaji tetap', 'Gaji admin studio', 1_800_000];
            }
            if ($index === 4) {
                $rows[] = [12, 'Marketing', 'Endorse selebgram lokal', 750_000];
            }
            foreach ($rows as [$day, $category, $description, $amount]) {
                $on = $month->setDay($day);
                if (! $this->happened($on->setTime(9, 0))) {
                    continue;
                }
                $this->at($on->setTime(mt_rand(9, 17), mt_rand(0, 59)), $this->agung, fn () => OperatingExpense::create([
                    'spent_on' => $on->toDateString(), 'category' => $category, 'description' => $description, 'amount' => $amount,
                ]));
            }
        }
    }

    private function maintenance(): void
    {
        for ($month = $this->goLive; $month->lte($this->today); $month = $month->addMonth()) {
            $on = $month->setDay(5)->setTime(10, 0);
            if ($this->happened($on)) {
                $this->service('printer', $on, MaintenanceType::Routine, 'Head cleaning + nozzle check', 0);
            }
        }
        $this->service('lighting', $this->goLive->addMonths(3)->addDays(9)->setTime(14, 0), MaintenanceType::Repair, 'Ganti kipas pendingin', 150_000);
        $this->service('speedlite', $this->goLive->addMonths(4)->addDays(3)->setTime(11, 0), MaintenanceType::Repair, 'Ganti trigger coil', 300_000);
        $this->service('camera', $this->goLive->addMonths(5)->addDays(10)->setTime(13, 0), MaintenanceType::Routine, 'Sensor & body cleaning di service center', 250_000);

        // Speedlite tua akhirnya rusak — kandidat diganti di proyeksi penggantian.
        $brokenAt = $this->goLive->addMonths(5)->addDays(20)->setTime(16, 0);
        if ($this->happened($brokenAt)) {
            $this->at($brokenAt, $this->raka, fn () => $this->assets['speedlite']->update([
                'status' => AssetStatus::Broken, 'notes' => 'Bawaan Agung, dibeli sebelum studio buka. Sering misfire setelah diservis.',
            ]));
        }
    }

    private function service(string $asset, CarbonImmutable $at, MaintenanceType $type, string $description, int $cost): void
    {
        if (! $this->happened($at)) {
            return;
        }
        $this->at($at, $this->raka, fn () => AssetMaintenance::create([
            'asset_id' => $this->assets[$asset]->id, 'performed_on' => $at->toDateString(), 'type' => $type, 'description' => $description, 'cost' => $cost,
        ]));
    }

    /**
     * Bulan yang rugi ditutup pinjaman owner ke kas (business-flow 8.3),
     * bergantian Raka/Agung — dikembalikan otomatis dari laba berikutnya
     * (8.5). Dihitung dari laba rugi hasil seed, bukan dikunci ke bulan
     * tertentu: tanggal relatif membuat bulan rugi berbeda tiap dijalankan.
     */
    private function coverLosses(): void
    {
        $lenders = [$this->raka, $this->agung];
        $profitAndLoss = app(ProfitAndLoss::class);
        for ($month = $this->goLive; $month->lt($this->today->startOfMonth()); $month = $month->addMonth()) {
            $loss = -$profitAndLoss->forMonth($month->format('Y-m'))->netProfit;
            if ($loss <= 0) {
                continue;
            }
            $lender = $lenders[0];
            $lenders = array_reverse($lenders);
            $on = $month->endOfMonth()->setTime(19, 0);
            $this->at($on, $lender, fn () => OwnerContribution::create([
                'owner_id' => Owner::where('user_id', $lender->id)->sole()->id, 'contributed_on' => $on->toDateString(),
                'amount' => (int) ceil($loss / 500_000) * 500_000,
                'kind' => ContributionKind::Loan, 'destination' => ContributionDestination::Cash,
                'note' => 'Menutup kekurangan kas '.Periods::label($month->format('Y-m')),
            ]));
        }
    }

    /**
     * Bulan pertama (saldo awal) sampai dua bulan lalu sudah tutup buku.
     * Bulan lalu sengaja BELUM ditutup — Dashboard menampilkan pengingat
     * tutup buku, alur yang biasanya ditunjukkan di awal presentasi.
     */
    private function closings(): void
    {
        $lastOpen = $this->today->startOfMonth()->subMonth();
        for ($month = $this->goLive->subMonth(); $month->lt($lastOpen); $month = $month->addMonth()) {
            $at = $month->addMonth()->setDay(2)->setTime(20, 0);
            $this->at($at, $this->agung, fn () => PeriodClosing::create([
                'month' => $month->format('Y-m'), 'closed_at' => $at, 'closed_by' => $this->agung->id,
            ]));
        }
    }

    /** Pemakaian dana cadangan — hanya kalau saldonya cukup (aturan 8.2). */
    private function reserveWithdrawal(): void
    {
        $at = $this->today->startOfMonth()->subMonth()->addDays(15)->setTime(15, 0);
        if (app(Funds::class)->validateWithdrawal(Fund::Reserve, 300_000) !== null) {
            return;
        }
        $this->at($at, $this->agung, fn () => FundWithdrawal::create([
            'fund' => Fund::Reserve, 'withdrawn_on' => $at->toDateString(), 'amount' => 300_000, 'note' => 'Ganti payung reflektor robek (darurat sebelum wedding)',
        ]));
    }

    // ── Pembuat catatan ────────────────────────────────────────────────

    /**
     * @param  list<array{0: string, 1: int}>  $lines  [kode katalog, qty]
     * @param  array{0: string, 1: int, 2: int}|null  $custom  [nama, qty, harga] item non-katalog
     */
    private function createOrder(
        BusinessLine $line, ?Customer $customer, CarbonImmutable $date, ?string $time, WorkStatus $status, array $lines,
        int $discount = 0, ?string $location = null, ?string $notes = null, ?array $custom = null,
    ): Order {
        $order = Order::create([
            'number' => Order::nextNumber(),
            'customer_id' => $customer?->id,
            'business_line' => $line,
            'service_date' => $date->toDateString(),
            'service_time' => $time,
            'work_status' => $status,
            'location' => $location,
            'notes' => $notes,
            'source' => $line === BusinessLine::Retail ? null : $customer?->source,
            'discount' => $discount,
        ]);

        foreach ($lines as [$code, $quantity]) {
            $item = $this->catalog[$code];
            $variant = isset($this->variants[$code]) ? $this->pick($this->variants[$code]) : null;
            $components = $item->load('components')->componentsSnapshot();
            $order->items()->create([
                'catalog_item_id' => $item->id,
                'catalog_item_variant_id' => $variant?->id,
                'name' => $variant === null ? $item->name : CatalogItemVariant::label($item->name, $variant->name),
                'quantity' => $quantity,
                'unit_price' => $variant->price ?? $item->price,
                'unit_cost' => $variant->unit_cost ?? $item->bundleCost() ?? $item->unit_cost,
                'components' => $components,
            ]);
        }
        if ($custom !== null) {
            $order->items()->create(['catalog_item_id' => null, 'name' => $custom[0], 'quantity' => $custom[1], 'unit_price' => $custom[2], 'unit_cost' => null]);
        }

        $order->load('items');
        (new RecordOrderEvent)->execute($order, OrderEventType::Created, [
            'work_status' => ['from' => null, 'to' => $status->value],
            'total' => ['from' => null, 'to' => $order->total()],
        ]);

        return $order;
    }

    /** Keterangan seperti OrderPaymentController: menutup sisa = pelunasan. */
    private function recordPayment(Order $order, int $amount, PaymentMethod $method, ?string $note = null): void
    {
        if ($amount <= 0) {
            return;
        }
        $paid = (int) $order->payments()->sum('amount');
        $note ??= match (true) {
            $paid + $amount >= $order->total() => 'Pelunasan',
            $paid === 0 => 'DP',
            default => 'Termin',
        };
        $payment = $order->payments()->create(['paid_on' => now()->toDateString(), 'amount' => $amount, 'method' => $method, 'note' => $note]);
        (new RecordOrderEvent)->execute($order, OrderEventType::PaymentRecorded, Payment::eventChanges($payment, recorded: true));
    }

    private function recordRefund(Order $order, int $amount, PaymentMethod $method, string $reason): void
    {
        $refund = $order->refunds()->create(['refunded_on' => now()->toDateString(), 'amount' => $amount, 'method' => $method, 'reason' => $reason]);
        (new RecordOrderEvent)->execute($order, OrderEventType::Refunded, [
            'amount' => ['from' => null, 'to' => $refund->amount],
            'method' => ['from' => null, 'to' => $refund->method->value],
            'reason' => ['from' => null, 'to' => $refund->reason],
        ]);
    }

    private function advance(Order $order, WorkStatus $to): void
    {
        $from = $order->work_status;
        $order->update(['work_status' => $to]);
        (new RecordOrderEvent)->execute($order, OrderEventType::Advanced, ['work_status' => ['from' => $from->value, 'to' => $to->value]]);
    }

    private function revert(Order $order, WorkStatus $to): void
    {
        $from = $order->work_status;
        $order->update(['work_status' => $to]);
        (new RecordOrderEvent)->execute($order, OrderEventType::Reverted, ['work_status' => ['from' => $from->value, 'to' => $to->value]]);
    }

    private function cancel(Order $order, string $reason): void
    {
        $from = $order->work_status;
        $order->update(['work_status' => WorkStatus::Cancelled, 'notes' => trim(($order->notes ? $order->notes."\n" : '')."Dibatalkan: {$reason}")]);
        (new RecordOrderEvent)->execute($order, OrderEventType::Cancelled, [
            'work_status' => ['from' => $from->value, 'to' => WorkStatus::Cancelled->value],
            'reason' => ['from' => null, 'to' => $reason],
        ]);
    }

    /** Link hasil ditempel, lalu Diserahkan (business-flow 5.2 langkah 11). */
    private function deliver(Order $order): void
    {
        $link = 'https://drive.google.com/drive/folders/1'.$this->token(24);
        $order->update(['result_link' => $link]);
        (new RecordOrderEvent)->execute($order, OrderEventType::ResultLink, ['result_link' => ['from' => null, 'to' => $link]]);
        $this->advance($order, WorkStatus::Delivered);
    }

    private function customer(float $repeatChance, bool $couple = false): Customer
    {
        if ($this->customers !== [] && $this->chance($repeatChance)) {
            return $this->pick($this->customers);
        }

        $first = $this->faker->firstName();
        $name = $couple
            ? $this->faker->firstNameFemale().' & '.$this->faker->firstNameMale()
            : $first.' '.$this->faker->lastName();
        $prefix = $this->pick(['812', '813', '821', '822', '852', '853', '857', '877', '878', '881', '895', '896']);
        $customer = Customer::create([
            'name' => $name,
            'phone' => sprintf('0%s-%04d-%04d', $prefix, mt_rand(0, 9999), mt_rand(0, 9999)),
            'email' => $this->chance(0.45) ? Str::slug(strtok($name, ' ') ?: $name, '').'.'.mt_rand(10, 99).'@gmail.com' : null,
            'source' => $this->weighted(['Instagram' => 45, 'Teman' => 20, 'Lewat depan studio' => 15, 'Google Maps' => 15, 'Lainnya' => 5]),
            'notes' => $this->chance(0.08) ? $this->pick(['Langganan cetak', 'Minta invoice atas nama kantor', 'Alergi make-up tertentu', 'Pernah komplain hasil edit, puas setelah revisi']) : null,
        ]);
        $this->customers[] = $customer;

        return $customer;
    }

    /** @param  list<array{0: string, 1: int}>  $lines */
    private function subtotal(array $lines): int
    {
        // Perkiraan untuk diskon POS; total final dihitung dari item tersimpan.
        return array_sum(array_map(fn (array $l) => $this->catalog[$l[0]]->price * $l[1], $lines));
    }

    // ── Waktu & acak ───────────────────────────────────────────────────

    /**
     * Jalankan $fn seolah terjadi pada $moment oleh $user: created_at,
     * riwayat order, dan created_by terisi seperti input sungguhan. Test-now
     * sebelumnya dikembalikan — test yang memakai travelTo tetap utuh.
     *
     * @template T
     *
     * @param  Closure(): T  $fn
     * @return T
     */
    private function at(CarbonImmutable $moment, User $user, Closure $fn): mixed
    {
        $previous = Carbon::getTestNow();
        Carbon::setTestNow($moment);
        CarbonImmutable::setTestNow($moment);
        Auth::setUser($user);
        try {
            return $fn();
        } finally {
            Carbon::setTestNow($previous);
            CarbonImmutable::setTestNow($previous);
        }
    }

    private function happened(CarbonImmutable $moment): bool
    {
        return $moment->lte($this->now);
    }

    private function chance(float $probability): bool
    {
        return mt_rand() / mt_getrandmax() < $probability;
    }

    /**
     * @template T
     *
     * @param  list<T>  $items
     * @return T
     */
    private function pick(array $items): mixed
    {
        return $items[mt_rand(0, count($items) - 1)];
    }

    /** @param  array<string, int>  $weights */
    private function weighted(array $weights): string
    {
        $roll = mt_rand(1, array_sum($weights));
        foreach ($weights as $key => $weight) {
            $roll -= $weight;
            if ($roll <= 0) {
                return (string) $key;
            }
        }

        return (string) array_key_last($weights);
    }

    /** Knuth — cukup untuk λ kecil (< 10) seperti volume harian studio. */
    private function poisson(float $lambda): int
    {
        $limit = exp(-$lambda);
        $k = 0;
        $p = 1.0;
        do {
            $k++;
            $p *= mt_rand() / mt_getrandmax();
        } while ($p > $limit);

        return $k - 1;
    }

    private function token(int $length): string
    {
        $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';

        return implode('', array_map(fn () => $chars[mt_rand(0, strlen($chars) - 1)], range(1, $length)));
    }
}
