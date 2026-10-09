<?php

namespace Modules\Catalog\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Modules\Catalog\Actions\StoreCatalogPhoto;
use Modules\Catalog\Models\CatalogItem;
use Modules\Catalog\Models\CatalogItemPhoto;
use Modules\Catalog\Requests\StoreCatalogPhotosRequest;
use Throwable;

/**
 * Galeri foto item katalog (spek 7.1). Setiap aksi langsung tersimpan — tidak
 * menunggu tombol Simpan di dialog item.
 */
class CatalogPhotoController extends Controller
{
    public function store(StoreCatalogPhotosRequest $request, CatalogItem $catalogItem, StoreCatalogPhoto $action): RedirectResponse
    {
        /** @var list<UploadedFile> $files */
        $files = $request->file('photos');
        $stored = [];

        try {
            DB::transaction(function () use ($files, $catalogItem, $action, &$stored) {
                foreach ($files as $file) {
                    $stored[] = $action->execute($catalogItem, $file);
                }
            });
        } catch (Throwable $e) {
            // Satu gagal = semua batal: baris di-rollback, file yang sudah
            // tertulis dihapus supaya galeri tidak setengah jadi.
            foreach ($stored as $photo) {
                $photo->deleteFiles();
            }
            throw $e;
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => count($stored)." foto ditambahkan ke {$catalogItem->name}."]);

        return back();
    }

    public function destroy(CatalogItem $catalogItem, CatalogItemPhoto $photo): RedirectResponse
    {
        $photo->deleteFiles();
        $photo->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "Foto {$catalogItem->name} dihapus."]);

        return back();
    }

    /** Pindahkan ke depan; urutan foto lain tidak berubah. */
    public function cover(CatalogItem $catalogItem, CatalogItemPhoto $photo): RedirectResponse
    {
        if ($catalogItem->photos()->first()?->id !== $photo->id) {
            $photo->update(['position' => (int) $catalogItem->photos()->min('position') - 1]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => "Sampul {$catalogItem->name} diganti."]);

        return back();
    }
}
