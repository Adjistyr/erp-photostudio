import type { CatalogPhoto } from '@/modules/catalog/components/photo-gallery';
import type { ServiceCategory } from '@/types/domain';

export type CatalogItemType = 'product' | 'service';

/** Bentuk props dari CatalogItemController (daftar & halaman form). */
export interface CatalogItem {
    id: number;
    name: string;
    type: CatalogItemType;
    price: number;
    /** HPP bahan per unit; null untuk jasa. */
    unit_cost: number | null;
    category: string;
    is_active: boolean;
    /** Jasa berkategori di luar ServiceCategory — tidak muncul di Buat Order. */
    unknown_category: boolean;
    /** Profil publik untuk company profile nanti (spek 7.1). */
    description: string | null;
    is_public: boolean;
    /** Galeri, sampul dulu. */
    photos: CatalogPhoto[];
    /** Varian produk (spek 7.3), aktif & nonaktif; kosong untuk jasa. */
    variants: CatalogVariant[];
}

/** Varian produk — harga & HPP sendiri; tidak dihapus, hanya dinonaktifkan. */
export interface CatalogVariant {
    id: number;
    name: string;
    price: number;
    unit_cost: number;
    /** Foto dari galeri item; null = sampul item. */
    catalog_item_photo_id: number | null;
    is_active: boolean;
}

export interface ServiceCategoryOption {
    value: ServiceCategory;
    label: string;
}
