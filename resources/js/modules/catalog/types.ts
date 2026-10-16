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
    /** Komponen paket jasa (spek 6.3); kosong = bukan paket berkomponen. */
    components: BundleComponent[];
    /** HPP bahan paket SAAT INI (dihitung server); null = bukan paket berkomponen. */
    bundle_cost: number | null;
}

/** Produk di dalam paket jasa — nonaktif tetap dihitung di HPP paket. */
export interface BundleComponent {
    id: number;
    name: string;
    /** Jumlah per 1 paket. */
    quantity: number;
    unit_cost: number | null;
    is_active: boolean;
}

/** Pilihan produk untuk komponen paket (halaman Edit). */
export interface ComponentOption {
    id: number;
    name: string;
    unit_cost: number | null;
    is_active: boolean;
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

/** Satu baris riwayat harga (spek 6.5), props halaman Edit — terbaru dulu. */
export interface CatalogPriceChange {
    price: number;
    unit_cost: number | null;
    changed_by_name: string | null;
    /** ISO 8601 — mulai berlaku. */
    at: string;
}

export interface ServiceCategoryOption {
    value: ServiceCategory;
    label: string;
}
