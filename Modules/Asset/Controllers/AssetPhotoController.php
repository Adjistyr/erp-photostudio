<?php

namespace Modules\Asset\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Modules\Asset\Enums\AssetPhotoKind;
use Modules\Asset\Models\Asset;
use Modules\Asset\Models\AssetPhoto;
use Modules\Asset\Requests\StoreAssetPhotosRequest;
use Modules\Shared\Support\ImageEncoder;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

/**
 * Foto alat & nota/garansi aset (spek 8.2). Setiap aksi langsung tersimpan.
 * File privat — disajikan lewat `show` (ber-auth), bukan URL publik.
 */
class AssetPhotoController extends Controller
{
    public function store(StoreAssetPhotosRequest $request, Asset $asset, ImageEncoder $encoder): RedirectResponse
    {
        /** @var list<UploadedFile> $files */
        $files = $request->file('photos');
        $kind = $request->kind();
        $written = [];

        try {
            DB::transaction(function () use ($files, $asset, $kind, $encoder, &$written) {
                foreach ($files as $file) {
                    $written[] = $this->storeOne($asset, $kind, $file, $encoder);
                }
            });
        } catch (Throwable $e) {
            // Satu gagal = semua batal: baris di-rollback, file yang sudah tertulis dihapus.
            Storage::disk(AssetPhoto::DISK)->delete(array_merge(...array_map(fn (array $paths) => $paths, $written)));
            throw $e;
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => count($written)." {$kind->label()} ditambahkan ke {$asset->name}."]);

        return back();
    }

    /** @return list<string> path yang ditulis (untuk dibersihkan bila gagal) */
    private function storeOne(Asset $asset, AssetPhotoKind $kind, UploadedFile $file, ImageEncoder $encoder): array
    {
        $disk = Storage::disk(AssetPhoto::DISK);
        $base = "assets/{$asset->id}/".Str::uuid();
        $isPdf = $file->getMimeType() === 'application/pdf';

        if ($isPdf) {
            // PDF tidak bisa disandikan ulang — disimpan apa adanya (hanya nota, divalidasi request).
            $paths = [$path = "{$base}.pdf"];
            $disk->put($path, (string) file_get_contents((string) $file->getRealPath()));
            $thumb = null;
        } else {
            $encoded = $encoder->encode($file);
            $paths = [$path = "{$base}.webp", $thumb = "{$base}-thumb.webp"];
            $disk->put($path, $encoded['large']);
            $disk->put($thumb, $encoded['thumb']);
        }

        try {
            $asset->photos()->create([
                'kind' => $kind,
                'path' => $path,
                'thumb_path' => $thumb,
                'mime' => $isPdf ? 'application/pdf' : 'image/webp',
                'original_name' => mb_substr($file->getClientOriginalName(), 0, 255),
                'position' => (int) $asset->photos()->where('kind', $kind)->max('position') + 1,
            ]);
        } catch (Throwable $e) {
            // File ini belum masuk $written di store() — bersihkan di sini.
            $disk->delete($paths);
            throw $e;
        }

        return $paths;
    }

    /** File privat, hanya untuk pengguna login (middleware grup). `?size=thumb` = thumbnail. */
    public function show(Request $request, Asset $asset, AssetPhoto $photo): StreamedResponse
    {
        $path = $request->query('size') === 'thumb' && $photo->thumb_path ? $photo->thumb_path : $photo->path;

        return Storage::disk(AssetPhoto::DISK)->response($path, $photo->isPdf() ? $photo->original_name : null, [
            'Content-Type' => $photo->mime,
            // Privat: boleh di-cache browser pengguna ini, bukan proxy bersama.
            'Cache-Control' => 'private, max-age=86400',
        ]);
    }

    public function destroy(Asset $asset, AssetPhoto $photo): RedirectResponse
    {
        $photo->deleteFiles();
        $photo->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => "File {$asset->name} dihapus."]);

        return back();
    }

    /** Foto alat ke depan (sampul); urutan lain tetap. Nota tidak punya sampul. */
    public function cover(Asset $asset, AssetPhoto $photo): RedirectResponse
    {
        abort_unless($photo->kind === AssetPhotoKind::Item, 404);
        $items = $asset->photos()->where('kind', AssetPhotoKind::Item);
        if ((clone $items)->first()?->id !== $photo->id) {
            $photo->update(['position' => (int) (clone $items)->min('position') - 1]);
        }
        Inertia::flash('toast', ['type' => 'success', 'message' => "Sampul {$asset->name} diganti."]);

        return back();
    }
}
