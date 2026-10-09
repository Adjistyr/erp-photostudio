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
}

export interface ServiceCategoryOption {
    value: ServiceCategory;
    label: string;
}
