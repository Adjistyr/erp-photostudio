<?php

namespace Modules\Asset\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Modules\Asset\Enums\AssetStatus;
use Modules\Asset\Models\Asset;
use Modules\Asset\Models\AssetCheckout;
use Modules\Asset\Requests\ReturnAssetCheckoutRequest;
use Modules\Asset\Requests\StoreAssetCheckoutRequest;

/**
 * Peminjaman alat ke event (spek 8.4). Bukan catatan uang — boleh dihapus
 * kapan saja bila salah catat.
 */
class AssetCheckoutController extends Controller
{
    public function store(StoreAssetCheckoutRequest $request, Asset $asset): RedirectResponse
    {
        $data = $request->validated();
        $asset->checkouts()->create([
            'quantity' => $data['quantity'],
            'holder' => trim($data['holder']),
            'order_id' => $data['order_id'] ?? null,
            'checked_out_on' => $data['checked_out_on'],
            'due_back_on' => $data['due_back_on'] ?? null,
            'note' => trim((string) ($data['note'] ?? '')) ?: null,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$data['quantity']} × {$asset->name} dibawa {$data['holder']}."]);

        return back();
    }

    public function return(ReturnAssetCheckoutRequest $request, Asset $asset, AssetCheckout $checkout): RedirectResponse
    {
        $broken = $request->boolean('broken');
        DB::transaction(function () use ($request, $asset, $checkout, $broken) {
            $checkout->update(['returned_on' => $request->validated('returned_on')]);
            if ($broken && ! $asset->isDisposed()) {
                $asset->update(['status' => AssetStatus::Broken]);
            }
        });

        $message = $broken
            ? "{$asset->name} kembali dalam keadaan rusak — ditandai Rusak."
            : "{$asset->name} sudah kembali.";
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }

    public function destroy(Asset $asset, AssetCheckout $checkout): RedirectResponse
    {
        $checkout->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => "Catatan peminjaman {$asset->name} dihapus."]);

        return back();
    }
}
