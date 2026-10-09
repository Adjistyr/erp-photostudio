<?php

namespace Modules\Catalog\Actions;

use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Modules\Catalog\Models\CatalogItem;
use Modules\Catalog\Models\CatalogItemPhoto;
use Throwable;

/**
 * Satu foto galeri (spek 7.1): sandi ulang ke WebP besar + thumbnail persegi.
 *
 * GD bawaan PHP, bukan library gambar (Intervention dll.): cukup untuk skala,
 * crop, dan WebP — tidak perlu dependensi baru. Sandi ulang juga membuang
 * EXIF (lokasi GPS foto HP) dan isi lain yang menumpang di file asli.
 */
class StoreCatalogPhoto
{
    public const MAX_SIDE = 1600;

    public const THUMB_SIDE = 400;

    private const QUALITY = 82;

    public function execute(CatalogItem $item, UploadedFile $file): CatalogItemPhoto
    {
        $source = @imagecreatefromstring((string) file_get_contents((string) $file->getRealPath()));
        if ($source === false) {
            throw ValidationException::withMessages(['photos' => 'File bukan gambar yang bisa dibaca.']);
        }

        $base = "catalog/{$item->id}/".Str::uuid();
        $path = "{$base}.webp";
        $thumbPath = "{$base}-thumb.webp";
        $disk = Storage::disk(CatalogItemPhoto::DISK);

        try {
            $disk->put($path, $this->webp($this->fit($source, self::MAX_SIDE)));
            $disk->put($thumbPath, $this->webp($this->squareCrop($source, self::THUMB_SIDE)));

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

    /** Sisi terpanjang ≤ $max; gambar kecil tidak diperbesar. */
    private function fit(GdImage $src, int $max): GdImage
    {
        $w = imagesx($src);
        $h = imagesy($src);
        $scale = min(1, $max / max($w, $h));

        return $this->resample($src, 0, 0, $w, $h, max(1, (int) round($w * $scale)), max(1, (int) round($h * $scale)));
    }

    /** Crop persegi dari tengah, lalu skala ke $side × $side. */
    private function squareCrop(GdImage $src, int $side): GdImage
    {
        $w = imagesx($src);
        $h = imagesy($src);
        $crop = min($w, $h);

        return $this->resample($src, intdiv($w - $crop, 2), intdiv($h - $crop, 2), $crop, $crop, $side, $side);
    }

    private function resample(GdImage $src, int $sx, int $sy, int $sw, int $sh, int $dw, int $dh): GdImage
    {
        $dst = imagecreatetruecolor(max(1, $dw), max(1, $dh));
        if ($dst === false) {
            throw new \RuntimeException('GD gagal membuat kanvas.');
        }
        // Pertahankan transparansi PNG (produk dengan latar terpotong).
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
        imagecopyresampled($dst, $src, 0, 0, $sx, $sy, $dw, $dh, $sw, $sh);

        return $dst;
    }

    private function webp(GdImage $image): string
    {
        ob_start();
        imagewebp($image, null, self::QUALITY);

        return (string) ob_get_clean();
    }
}
