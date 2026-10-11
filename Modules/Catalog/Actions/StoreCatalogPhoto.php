<?php

namespace Modules\Catalog\Actions;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Catalog\Models\CatalogItem;
use Modules\Catalog\Models\CatalogItemPhoto;
use Modules\Shared\Support\ImageEncoder;
use Throwable;

/**
 * Satu foto galeri (spek 7.1): sandi ulang ke WebP besar + thumbnail persegi.
 * Pengolahan gambarnya di ImageEncoder (dipakai juga foto aset, spek 8.2).
 */
class StoreCatalogPhoto
{
    public function __construct(private readonly ImageEncoder $encoder) {}

    public function execute(CatalogItem $item, UploadedFile $file): CatalogItemPhoto
    {
        $encoded = $this->encoder->encode($file);

        $base = "catalog/{$item->id}/".Str::uuid();
        $path = "{$base}.webp";
        $thumbPath = "{$base}-thumb.webp";
        $disk = Storage::disk(CatalogItemPhoto::DISK);

        try {
            $disk->put($path, $encoded['large']);
            $disk->put($thumbPath, $encoded['thumb']);

            return $item->photos()->create([
                'path' => $path,
                'thumb_path' => $thumbPath,
                // Urutan unggah; sampul = terkecil (lihat CatalogPhotoController::cover).
                'position' => (int) $item->photos()->max('position') + 1,
            ]);
        } catch (Throwable $e) {
            // Jangan tinggalkan file yatim bila baris gagal dibuat.
            $disk->delete([$path, $thumbPath]);
            throw $e;
        }
    }
}
