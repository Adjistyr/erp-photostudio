<?php

namespace Modules\Asset\Controllers;

use App\Http\Controllers\Controller;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Asset\Enums\AssetPhotoKind;
use Modules\Asset\Enums\AssetStatus;
use Modules\Asset\Models\Asset;
use Modules\Asset\Models\AssetCategory;
use Modules\Asset\Models\AssetCheckout;
use Modules\Asset\Models\AssetMaintenance as MaintenanceRecord;
use Modules\Asset\Models\AssetPhoto;
use Modules\Asset\Requests\DisposeAssetRequest;
use Modules\Asset\Requests\StoreAssetMaintenanceRequest;
use Modules\Asset\Requests\StoreAssetRequest;
use Modules\Asset\Requests\UpdateAssetRequest;
use Modules\Asset\Requests\UpdateAssetStatusRequest;
use Modules\Finance\Actions\RecordInvestment;
use Modules\Finance\Enums\Fund;
use Modules\Finance\Models\Owner;
use Modules\Finance\Rules\OpenPeriod;
use Modules\Finance\Services\AssetMaintenance;
use Modules\Finance\Services\DueMaintenance;
use Modules\Finance\Services\Funds;
use Modules\Finance\Services\Periods;
use Modules\Finance\Services\ReplacementDue;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Modules\Shared\Enums\BusinessLine;
use Modules\Shared\Http\CsvResponse;
use Modules\Shared\Support\Money;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Aset & Maintenance (business-flow 8.9) — bonus di luar quotation Paket B.
 *
 * Satu-satunya pintu menambah aset. Menambah aset otomatis mencatat
 * investasinya (dan setoran modal kalau dibayar owner); alokasi dana
 * maintenance dihitung dari daftar ini — tidak ada angka maintenance yang
 * diketik tangan (di sheet client, angka ketik tangan itu salah Rp 97.350).
 */
class AssetController extends Controller
{
    public function __construct(
        private readonly AssetMaintenance $maintenance,
        private readonly Periods $periods,
    ) {}

    /**
     * Ekspor daftar aset (spek 4.5) — untuk asuransi/pajak. Aset dilepas ikut
     * (dengan alasan & harga jual): riwayatnya tetap dibutuhkan. Nilai buku &
     * jadwal servis dari service yang sama dengan layar.
     */
    public function export(): StreamedResponse
    {
        $month = $this->periods->current();
        $rows = function () use ($month) {
            foreach (Asset::with(['maintenances', 'category'])->orderBy('id')->lazy(200) as $a) {
                $last = $a->maintenances->sortByDesc('performed_on')->first();
                $next = $a->isDisposed() ? null : $this->maintenance->nextMaintenance($a);
                yield [
                    $a->code,
                    $a->name,
                    $a->category->name,
                    $a->model,
                    $a->units,
                    $a->unit_price,
                    $a->purchaseTotal(),
                    $a->purchased_on->toDateString(),
                    $a->useful_life_months,
                    $this->maintenance->bookValue($a, $month),
                    $a->maintenance_percent,
                    $a->maintenance_interval_months,
                    $last?->performed_on->toDateString(),
                    $next?->toDateString(),
                    $a->status->value,
                    $a->status->label(),
                    $a->disposed_on?->toDateString(),
                    $a->disposal_reason,
                    $a->sale_price,
                    // Kolom register (spek 8.1) di akhir — urutan kolom lama tetap.
                    $a->brand,
                    $a->serial_number,
                    $a->warranty_until?->toDateString(),
                    $a->location,
                    $a->notes,
                ];
            }
        };

        return CsvResponse::stream('potrait-time-aset-'.today()->toDateString().'.csv', $rows(), [
            'kode', 'nama', 'kategori', 'model', 'unit', 'harga_unit', 'nilai_beli', 'tanggal_beli',
            'umur_bulan', 'nilai_buku', 'persen_maintenance', 'interval_bulan', 'servis_terakhir',
            'servis_berikutnya', 'status', 'status_label', 'dilepas_pada', 'alasan_lepas', 'harga_jual',
            'merek', 'nomor_seri', 'garansi_sampai', 'lokasi', 'catatan',
        ]);
    }

    public function index(Funds $funds): Response
    {
        $month = $this->periods->current();
        $today = today()->toImmutable();
        // Sampul (foto alat pertama, spek 8.2) untuk thumbnail di daftar.
        $assets = Asset::with([
            'category', 'maintenances', 'photos' => fn ($q) => $q->where('kind', AssetPhotoKind::Item),
            // Peminjaman yang belum kembali (spek 8.4) — status "Dipinjam" & peringatan lewat jadwal.
            'checkouts' => fn ($q) => $q->whereNull('returned_on')->with('order'),
        ])
            ->orderByRaw('disposed_on IS NOT NULL') // dilepas di bawah — tetap tampil sebagai riwayat
            ->orderBy('id')
            ->get();
        $owned = $assets->reject(fn (Asset $a) => $a->isDisposed());

        return Inertia::render('asset::index', [
            'month' => $month,
            'today' => $today->toDateString(),
            'summary' => [
                'units' => $owned->sum('units'),
                'kinds' => $owned->count(),
                'purchase_value' => $owned->sum(fn (Asset $a) => $a->purchaseTotal()),
                'book_value' => $owned->sum(fn (Asset $a) => $this->maintenance->bookValue($a, $month)),
                'allocation' => $this->maintenance->allocationForMonth($month),
            ],
            'due' => array_map(fn (DueMaintenance $d) => [
                'asset_id' => $d->asset->id,
                'name' => $d->asset->name,
                'model' => $d->asset->brandModel(),
                'days_until' => $d->daysUntil,
            ], $this->maintenance->dueSoon()),
            'assets' => $assets->map(fn (Asset $a) => [
                ...$this->assetProps($a, $month, $today),
                'photo_url' => ($cover = $a->photos->first()) ? $cover->toProps()['thumb_url'] : null,
                'units_out' => (int) $a->checkouts->sum('quantity'),
            ])->values()->all(),
            'overdue_checkouts' => $assets->flatMap(fn (Asset $a) => $a->checkouts)
                ->filter(fn (AssetCheckout $c) => $c->isOverdue($today))
                ->map(fn (AssetCheckout $c) => [
                    'asset_id' => $c->asset_id,
                    'name' => $assets->firstWhere('id', $c->asset_id)?->name,
                    'quantity' => $c->quantity,
                    'holder' => $c->holder,
                    'due_back_on' => $c->due_back_on?->toDateString(),
                ])->values()->all(),
            'categories' => AssetCategory::orderBy('position')->get()->map(fn (AssetCategory $c) => ['id' => $c->id, 'name' => $c->name])->all(),
            // Ringkasan per kategori (spek 8.3) — aset dimiliki saja; totalnya = kartu di atas.
            'by_category' => $owned->groupBy(fn (Asset $a) => $a->category->name)
                ->map(fn ($group, string $name) => [
                    'name' => $name,
                    'kinds' => $group->count(),
                    'units' => (int) $group->sum('units'),
                    'purchase_value' => (int) $group->sum(fn (Asset $a) => $a->purchaseTotal()),
                    'book_value' => (int) $group->sum(fn (Asset $a) => $this->maintenance->bookValue($a, $month)),
                    'allocation' => (int) $group->sum(fn (Asset $a) => $this->maintenance->allocationFor($a, $month)),
                ])
                ->sortByDesc('purchase_value')->values()->all(),
            'replacements' => $this->replacementProps($funds, $today),
        ]);
    }

    /**
     * Proyeksi penggantian 6 bulan (spek 6.2 / 8.3): perkiraan dari harga
     * beli dibanding dana maintenance — pos yang disisihkan per aset.
     *
     * @return array{items: list<array<string, mixed>>, total_estimate: int, maintenance_balance: int, shortfall: int}
     */
    private function replacementProps(Funds $funds, CarbonImmutable $today): array
    {
        $due = $this->maintenance->replacementsDue($today);
        $total = array_sum(array_map(fn (ReplacementDue $r) => $r->estimate, $due));
        $balance = $funds->balance(Fund::Maintenance);

        return [
            'items' => array_map(fn (ReplacementDue $r) => [
                'asset_id' => $r->asset->id,
                'name' => $r->asset->name,
                'model' => $r->asset->brandModel(),
                'due_on' => $r->dueOn->toDateString(),
                'months_until' => $r->monthsUntil,
                'estimate' => $r->estimate,
            ], $due),
            'total_estimate' => $total,
            'maintenance_balance' => $balance,
            'shortfall' => max(0, $total - $balance),
        ];
    }

    /** Detail aset (spek 8.1) — pengganti Sheet: identitas, keuangan, riwayat servis. */
    public function show(Asset $asset, Funds $funds): Response
    {
        $month = $this->periods->current();
        $today = today()->toImmutable();
        $asset->load(['category', 'investment.contribution.owner', 'maintenances.creator', 'photos']);
        // Peminjaman (spek 8.4): semua yang belum kembali + 10 riwayat terakhir.
        $open = $asset->checkouts()->whereNull('returned_on')->with('order.customer')->get();
        $history = $asset->checkouts()->whereNotNull('returned_on')->with('order.customer')->limit(10)->get();
        $owner = $asset->investment?->contribution?->owner;

        return Inertia::render('asset::show', [
            'asset' => [
                ...$this->assetProps($asset, $month, $today),
                'funded_by' => $owner !== null ? "Modal {$owner->name}" : ($asset->investment !== null ? 'Kas usaha' : null),
                // Foto alat & nota (spek 8.2) — URL ber-auth, bukan publik.
                'photos' => $asset->photos->map(fn (AssetPhoto $p) => $p->toProps())->values()->all(),
                'checkouts' => $open->concat($history)->map(fn (AssetCheckout $c) => $c->toProps($today))->values()->all(),
                'available_units' => $asset->units - (int) $open->sum('quantity'),
                'maintenances' => $asset->maintenances->sortBy('performed_on')->map(fn (MaintenanceRecord $m) => [
                    'id' => $m->id,
                    'performed_on' => $m->performed_on->toDateString(),
                    'type' => $m->type->value,
                    'description' => $m->description,
                    'cost' => $m->cost,
                    'created_by_name' => $m->creator?->name,
                ])->values()->all(),
            ],
            'maintenance_balance' => $funds->balance(Fund::Maintenance),
            'today' => $today->toDateString(),
            // Order studio/event yang bisa dikaitkan ke peminjaman (spek 8.4).
            'order_options' => Order::with('customer')
                ->whereIn('business_line', [BusinessLine::Studio, BusinessLine::Event])
                ->where('work_status', '!=', WorkStatus::Cancelled)
                ->whereDate('service_date', '>=', $today->subDays(30))
                ->orderBy('service_date')
                ->get()
                ->map(fn (Order $o) => [
                    'id' => $o->id, 'number' => $o->number, 'customer_name' => $o->customer?->name,
                    'service_date' => $o->service_date->toDateString(),
                ])->all(),
        ]);
    }

    /** Tambah = halaman penuh (spek 8.1), bukan dialog. */
    public function create(): Response
    {
        return Inertia::render('asset::form', ['asset' => null, ...$this->formProps()]);
    }

    public function edit(Asset $asset): Response
    {
        $asset->load('category');

        return Inertia::render('asset::form', [
            'asset' => $this->assetProps($asset, $this->periods->current(), today()->toImmutable()),
            ...$this->formProps(),
        ]);
    }

    /** Identitas saja — field keuangan terkunci (UpdateAssetRequest). */
    public function update(UpdateAssetRequest $request, Asset $asset): RedirectResponse
    {
        $data = $request->identityData();
        // Kode wajib ada untuk aset tersimpan; dikosongkan → tetap kode lama.
        $asset->update([...$data, 'code' => $data['code'] ?? $asset->code]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$asset->name} diperbarui."]);

        return to_route('assets.show', $asset);
    }

    /**
     * Aset + investasi (+ setoran modal kalau dibayar owner) dalam satu
     * transaksi — aset tanpa investasi membuat modal di Bagi Hasil tidak
     * cocok dengan daftar alat, dan sebaliknya.
     */
    public function store(StoreAssetRequest $request, RecordInvestment $recordInvestment): RedirectResponse
    {
        $data = $request->validated();
        $identity = $request->identityData();
        $amount = $data['unit_price'] * $data['units'];
        $name = $identity['name'];
        $description = $data['units'] > 1 ? "{$name} × {$data['units']}" : $name;
        $owner = isset($data['paid_by']) ? Owner::findOrFail($request->integer('paid_by')) : null;

        $asset = DB::transaction(function () use ($recordInvestment, $data, $identity, $amount, $description, $owner) {
            $investment = $recordInvestment->execute($description, $amount, $data['purchased_on'], $owner);

            return Asset::create([
                ...$identity,
                // Kode kosong → PREFIKS-NNN berikutnya untuk kategorinya.
                'code' => $identity['code'] ?? AssetCategory::findOrFail($identity['asset_category_id'])->nextCode(),
                'units' => $data['units'],
                'unit_price' => $data['unit_price'],
                'purchased_on' => $data['purchased_on'],
                'maintenance_percent' => $data['maintenance_percent'],
                'status' => AssetStatus::Active,
                'investment_id' => $investment->id,
            ]);
        });

        $source = $owner === null ? 'investasi dari kas usaha' : "investasi dan modal {$owner->name}";
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$name} tercatat — juga sebagai {$source}."]);

        return to_route('assets.show', $asset);
    }

    /** Servis — biaya dari dana maintenance, tidak masuk Laba Rugi. */
    public function storeMaintenance(StoreAssetMaintenanceRequest $request, Asset $asset): RedirectResponse
    {
        $data = $request->validated();
        $asset->maintenances()->create([
            'performed_on' => $data['performed_on'],
            'type' => $data['type'],
            'description' => trim($data['description']),
            'cost' => $data['cost'],
        ]);

        $message = $data['cost'] > 0
            ? 'Servis '.Money::format($data['cost']).' dari dana maintenance tercatat.'
            : 'Servis tanpa biaya tercatat — jadwal perawatan dihitung ulang.';
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }

    public function updateStatus(UpdateAssetStatusRequest $request, Asset $asset): RedirectResponse
    {
        $status = AssetStatus::from($request->string('status')->value());
        $asset->update(['status' => $status]);

        $label = $status === AssetStatus::Broken ? 'ditandai rusak' : 'ditandai aktif kembali';
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$asset->name} {$label}. Alokasi maintenance tetap berjalan selama aset dimiliki."]);

        return back();
    }

    /** Hasil jual masuk dana maintenance lewat Funds (bukan omzet). */
    public function dispose(DisposeAssetRequest $request, Asset $asset): RedirectResponse
    {
        $salePrice = $request->salePrice();
        $asset->update([
            'status' => AssetStatus::Disposed,
            'disposed_on' => $request->validated('disposed_on'),
            'disposal_reason' => $request->validated('reason'),
            'sale_price' => $salePrice,
        ]);

        $message = $salePrice > 0
            ? "{$asset->name} dilepas — hasil jual ".Money::format($salePrice).' masuk dana maintenance.'
            : "{$asset->name} dilepas — riwayatnya tetap tersimpan.";
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }

    /** Hapus servis salah catat — biayanya kembali ke dana maintenance, jadwal dihitung ulang. */
    public function destroyMaintenance(Asset $asset, MaintenanceRecord $maintenance): RedirectResponse
    {
        OpenPeriod::ensureOpen($maintenance->performed_on);
        $maintenance->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => "Servis {$asset->name} dihapus."]);

        return back();
    }

    /**
     * Bentuk satu aset untuk daftar, detail, dan form — satu sumber.
     *
     * @return array<string, mixed>
     */
    private function assetProps(Asset $a, string $month, CarbonImmutable $today): array
    {
        $next = $a->isDisposed() ? null : $this->maintenance->nextMaintenance($a);

        return [
            'id' => $a->id,
            'code' => $a->code,
            'name' => $a->name,
            'asset_category_id' => $a->asset_category_id,
            'category' => $a->category->name,
            'brand' => $a->brand,
            'model' => $a->model,
            'serial_number' => $a->serial_number,
            'warranty_until' => $a->warranty_until?->toDateString(),
            'location' => $a->location,
            'notes' => $a->notes,
            'units' => $a->units,
            'unit_price' => $a->unit_price,
            'purchase_total' => $a->purchaseTotal(),
            'purchased_on' => $a->purchased_on->toDateString(),
            'maintenance_percent' => $a->maintenance_percent,
            'useful_life_months' => $a->useful_life_months,
            'maintenance_interval_months' => $a->maintenance_interval_months,
            'status' => $a->status->value,
            'disposed_on' => $a->disposed_on?->toDateString(),
            'disposal_reason' => $a->disposal_reason,
            'sale_price' => $a->sale_price,
            'allocation' => $this->maintenance->allocationFor($a, $month),
            'book_value' => $this->maintenance->bookValue($a, $month),
            'accumulated' => $this->maintenance->accumulated($a),
            'next_maintenance' => $next?->toDateString(),
            'days_until_next' => $next === null ? null : (int) $today->diffInDays($next, false),
        ];
    }

    /**
     * Pilihan form: kategori (dengan kode berikutnya), owner, dan saran merek
     * & lokasi dari yang sudah ada — supaya "Canon" tidak jadi dua ejaan.
     *
     * @return array<string, mixed>
     */
    private function formProps(): array
    {
        $distinct = fn (string $column) => Asset::whereNotNull($column)->distinct()->orderBy($column)->pluck($column)->all();

        return [
            'categories' => AssetCategory::orderBy('position')->get()->map(fn (AssetCategory $c) => $c->toProps())->all(),
            'owners' => Owner::orderBy('id')->get(['id', 'name']),
            'brands' => $distinct('brand'),
            'locations' => $distinct('location'),
            'today' => today()->toDateString(),
        ];
    }
}
