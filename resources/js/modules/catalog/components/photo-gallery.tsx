/**
 * Galeri foto item di halaman Edit Katalog (spek 7.1, halaman sejak 7.2).
 * Setiap aksi langsung tersimpan ke server — tidak menunggu tombol Simpan.
 *
 * Sejak spek 8.2 isinya komponen generik `components/photo-gallery.tsx`
 * (dipakai juga foto aset); di sini hanya route & teks katalog.
 */

import CatalogPhotoController from '@/actions/Modules/Catalog/Controllers/CatalogPhotoController';
import { PhotoGallery as Gallery } from '@/components/photo-gallery';
import { MAX_PHOTOS } from '@/lib/photo-resize';

export interface CatalogPhoto {
    id: number;
    url: string;
    thumb_url: string;
}

export function PhotoGallery({
    itemId,
    itemName,
    photos,
}: {
    itemId: number;
    itemName: string;
    /** Sampul dulu (urutan server). */
    photos: CatalogPhoto[];
}) {
    return (
        <Gallery
            itemName={itemName}
            photos={photos}
            max={MAX_PHOTOS}
            uploadUrl={CatalogPhotoController.store(itemId).url}
            deleteUrl={(id) =>
                CatalogPhotoController.destroy({
                    catalogItem: itemId,
                    photo: id,
                }).url
            }
            coverUrl={(id) =>
                CatalogPhotoController.cover({ catalogItem: itemId, photo: id })
                    .url
            }
            hint="Foto pertama jadi sampul di POS dan daftar Katalog. JPG, PNG, atau WebP; foto dikecilkan otomatis."
        />
    );
}
