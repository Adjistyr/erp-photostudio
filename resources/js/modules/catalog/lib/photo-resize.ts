/**
 * Kecilkan foto di browser sebelum diunggah (spek 7.1). Foto HP 3–8 MB,
 * sedangkan upload_max_filesize bawaan PHP 2 MB — tanpa langkah ini unggahan
 * gagal sebelum sampai ke Laravel. Server tetap menyandikan ulang (EXIF
 * dibuang, ukuran akhir ditentukan di sana).
 */

/** Sama dengan StoreCatalogPhoto::MAX_SIDE. */
export const MAX_SIDE = 1600;
/** Sama dengan StoreCatalogPhotosRequest (max:2048 KB). */
export const MAX_BYTES = 2 * 1024 * 1024;
/** Sama dengan CatalogItemPhoto::MAX_PER_ITEM. */
export const MAX_PHOTOS = 8;

/** Sisi terpanjang ≤ `max`, rasio tetap; gambar kecil tidak diperbesar. */
export function fitWithin(
    width: number,
    height: number,
    max = MAX_SIDE,
): { width: number; height: number } {
    const scale = Math.min(1, max / Math.max(width, height));
    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
    };
}

const toBlob = (canvas: HTMLCanvasElement, type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));

/**
 * Selalu digambar ulang, juga foto kecil: `createImageBitmap` menerapkan
 * orientasi EXIF, sedangkan GD di server tidak — foto HP miring tetap tegak.
 * WebP dulu (transparansi PNG tetap); browser tanpa encoder WebP mengembalikan
 * PNG, yang bila > 2 MB diganti JPEG.
 */
export async function resizeForUpload(file: File): Promise<File> {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        bitmap.close();
        return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    for (const type of ['image/webp', 'image/jpeg']) {
        const blob = await toBlob(canvas, type);
        if (blob && blob.size <= MAX_BYTES) {
            const ext = blob.type.split('/')[1] ?? 'jpg';
            const name = `${file.name.replace(/\.[^.]+$/, '')}.${ext}`;
            return new File([blob], name, { type: blob.type });
        }
    }
    return file;
}
