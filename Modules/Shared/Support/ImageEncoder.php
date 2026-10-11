<?php

namespace Modules\Shared\Support;

use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

/**
 * Sandi ulang gambar unggahan ke WebP besar + thumbnail persegi (spek 7.1;
 * dipindah dari StoreCatalogPhoto di spek 8.2 supaya katalog & aset sama).
 *
 * GD bawaan PHP, bukan library gambar (Intervention dll.): cukup untuk skala,
 * crop, dan WebP — tidak perlu dependensi baru. Sandi ulang juga membuang
 * EXIF (lokasi GPS foto HP) dan isi lain yang menumpang di file asli.
 */
class ImageEncoder
{
    public const MAX_SIDE = 1600;

    public const THUMB_SIDE = 400;

    private const QUALITY = 82;

    /**
     * @param  string  $errorKey  kunci error validasi bila file tidak terbaca
     * @return array{large: string, thumb: string} isi file WebP
     */
    public function encode(UploadedFile $file, string $errorKey = 'photos'): array
    {
        $source = @imagecreatefromstring((string) file_get_contents((string) $file->getRealPath()));
        if ($source === false) {
            throw ValidationException::withMessages([$errorKey => 'File bukan gambar yang bisa dibaca.']);
        }

        return [
            'large' => $this->webp($this->fit($source, self::MAX_SIDE)),
            'thumb' => $this->webp($this->squareCrop($source, self::THUMB_SIDE)),
        ];
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
