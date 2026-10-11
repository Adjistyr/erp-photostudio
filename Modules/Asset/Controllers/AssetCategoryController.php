<?php

namespace Modules\Asset\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Asset\Models\AssetCategory;
use Modules\Asset\Requests\AssetCategoryRequest;

/**
 * Kategori aset dikelola owner (spek 8.1). Default umur & interval hanya
 * untuk aset baru; kategori yang masih dipakai tidak bisa dihapus.
 */
class AssetCategoryController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('asset::categories', [
            'categories' => AssetCategory::withCount('assets')->orderBy('position')->get()
                ->map(fn (AssetCategory $c) => [...$c->toProps(), 'assets_count' => $c->assets_count])->all(),
        ]);
    }

    public function store(AssetCategoryRequest $request): RedirectResponse
    {
        $category = AssetCategory::create([...$request->categoryData(), 'position' => (int) AssetCategory::max('position') + 1]);
        Inertia::flash('toast', ['type' => 'success', 'message' => "Kategori {$category->name} ditambahkan."]);

        return back();
    }

    public function update(AssetCategoryRequest $request, AssetCategory $assetCategory): RedirectResponse
    {
        $assetCategory->update($request->categoryData());
        Inertia::flash('toast', ['type' => 'success', 'message' => "Kategori {$assetCategory->name} diperbarui. Aset yang sudah ada tidak berubah."]);

        return back();
    }

    public function destroy(AssetCategory $assetCategory): RedirectResponse
    {
        $count = $assetCategory->assets()->count();
        if ($count > 0) {
            // Kunci `delete` — ConfirmDelete menampilkannya di dialog.
            throw ValidationException::withMessages(['delete' => "Masih dipakai {$count} aset — pindahkan asetnya ke kategori lain dulu."]);
        }
        $assetCategory->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => "Kategori {$assetCategory->name} dihapus."]);

        return back();
    }
}
