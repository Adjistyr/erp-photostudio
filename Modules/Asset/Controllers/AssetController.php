<?php

namespace Modules\Asset\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Asset\Enums\AssetStatus;
use Modules\Asset\Models\Asset;
use Modules\Asset\Models\AssetMaintenance as MaintenanceRecord;
use Modules\Asset\Requests\DisposeAssetRequest;
use Modules\Asset\Requests\StoreAssetMaintenanceRequest;
use Modules\Asset\Requests\StoreAssetRequest;
use Modules\Asset\Requests\UpdateAssetStatusRequest;
use Modules\Finance\Actions\RecordInvestment;
use Modules\Finance\Enums\Fund;
use Modules\Finance\Models\Owner;
use Modules\Finance\Services\AssetMaintenance;
use Modules\Finance\Services\DueMaintenance;
use Modules\Finance\Services\Funds;
use Modules\Finance\Services\Periods;
use Modules\Shared\Support\Money;

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

    public function index(Funds $funds): Response
    {
        $month = $this->periods->current();
        $today = today()->toImmutable();
        $assets = Asset::with(['investment.contribution.owner', 'maintenances'])
            ->orderByRaw('disposed_on IS NOT NULL') // dilepas di bawah — tetap tampil sebagai riwayat
            ->orderBy('id')
            ->get();
        $owned = $assets->reject(fn (Asset $a) => $a->isDisposed());

        return Inertia::render('asset::index', [
            'month' => $month,
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
                'model' => $d->asset->model,
                'days_until' => $d->daysUntil,
            ], $this->maintenance->dueSoon()),
            'assets' => $assets->map(function (Asset $a) use ($month, $today) {
                $next = $a->isDisposed() ? null : $this->maintenance->nextMaintenance($a);
                $owner = $a->investment?->contribution?->owner;

                return [
                    'id' => $a->id,
                    // Kode tampil, bukan kolom: urutan id = urutan dibuat.
                    'code' => sprintf('AST-%02d', $a->id),
                    'name' => $a->name,
                    'model' => $a->model,
                    'category' => $a->category,
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
                    'funded_by' => $owner !== null ? "Modal {$owner->name}" : ($a->investment !== null ? 'Kas usaha' : null),
                    'maintenances' => $a->maintenances->sortBy('performed_on')->map(fn (MaintenanceRecord $m) => [
                        'id' => $m->id,
                        'performed_on' => $m->performed_on->toDateString(),
                        'type' => $m->type->value,
                        'description' => $m->description,
                        'cost' => $m->cost,
                    ])->values()->all(),
                ];
            })->values()->all(),
            'owners' => Owner::orderBy('id')->get(['id', 'name']),
            'categories' => Asset::CATEGORIES,
            'maintenance_balance' => $funds->balance(Fund::Maintenance),
            'today' => $today->toDateString(),
        ]);
    }

    /**
     * Aset + investasi (+ setoran modal kalau dibayar owner) dalam satu
     * transaksi — aset tanpa investasi membuat modal di Bagi Hasil tidak
     * cocok dengan daftar alat, dan sebaliknya.
     */
    public function store(StoreAssetRequest $request, RecordInvestment $recordInvestment): RedirectResponse
    {
        $data = $request->validated();
        $amount = $data['unit_price'] * $data['units'];
        $name = trim($data['name']);
        $description = $data['units'] > 1 ? "{$name} × {$data['units']}" : $name;
        $owner = isset($data['paid_by']) ? Owner::findOrFail($request->integer('paid_by')) : null;

        DB::transaction(function () use ($recordInvestment, $data, $amount, $name, $description, $owner) {
            $investment = $recordInvestment->execute($description, $amount, $data['purchased_on'], $owner);
            Asset::create([
                'name' => $name,
                'category' => $data['category'],
                'model' => trim((string) ($data['model'] ?? '')) ?: null,
                'units' => $data['units'],
                'unit_price' => $data['unit_price'],
                'purchased_on' => $data['purchased_on'],
                'maintenance_percent' => $data['maintenance_percent'],
                'useful_life_months' => $data['useful_life_months'],
                'maintenance_interval_months' => $data['maintenance_interval_months'] ?? null,
                'status' => AssetStatus::Active,
                'investment_id' => $investment->id,
            ]);
        });

        $source = $owner === null ? 'investasi dari kas usaha' : "investasi dan modal {$owner->name}";
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$name} tercatat — juga sebagai {$source}."]);

        return to_route('assets.index');
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

        return to_route('assets.index');
    }

    public function updateStatus(UpdateAssetStatusRequest $request, Asset $asset): RedirectResponse
    {
        $status = AssetStatus::from($request->string('status')->value());
        $asset->update(['status' => $status]);

        $label = $status === AssetStatus::Broken ? 'ditandai rusak' : 'ditandai aktif kembali';
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$asset->name} {$label}. Alokasi maintenance tetap berjalan selama aset dimiliki."]);

        return to_route('assets.index');
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

        return to_route('assets.index');
    }
}
