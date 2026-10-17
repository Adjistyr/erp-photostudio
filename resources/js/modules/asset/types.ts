/** Bentuk props AssetController (daftar, detail, form) — spek 8.1. */

export type MaintenanceType = 'routine' | 'repair';
export type AssetStatus = 'active' | 'broken' | 'disposed';

export const MAINTENANCE_LABEL: Record<MaintenanceType, string> = {
    routine: 'Perawatan rutin',
    repair: 'Perbaikan',
};

export interface MaintenanceRow {
    id: number;
    performed_on: string;
    type: MaintenanceType;
    description: string;
    cost: number;
    created_by_name: string | null;
}

export interface AssetRow {
    id: number;
    code: string;
    name: string;
    asset_category_id: number;
    category: string;
    brand: string | null;
    model: string | null;
    serial_number: string | null;
    /** YYYY-MM-DD, boleh lampau (garansi habis). */
    warranty_until: string | null;
    location: string | null;
    notes: string | null;
    units: number;
    unit_price: number;
    purchase_total: number;
    purchased_on: string;
    maintenance_percent: number;
    useful_life_months: number;
    maintenance_interval_months: number | null;
    status: AssetStatus;
    disposed_on: string | null;
    disposal_reason: string | null;
    sale_price: number | null;
    /** Alokasi, nilai buku, akumulasi dana — tidak dikirim untuk admin (spek 5.1). */
    allocation?: number;
    book_value?: number;
    accumulated?: number;
    next_maintenance: string | null;
    days_until_next: number | null;
}

/** Foto alat / nota (spek 8.2) — URL ber-auth, bukan publik. */
export interface AssetPhoto {
    id: number;
    kind: 'item' | 'receipt';
    url: string;
    /** null untuk PDF. */
    thumb_url: string | null;
    is_pdf: boolean;
    name: string;
}

/** Sama dengan AssetPhotoKind::max(). */
export const MAX_ITEM_PHOTOS = 8;
export const MAX_RECEIPTS = 4;

/** Peminjaman alat (spek 8.4). */
export interface AssetCheckout {
    id: number;
    asset_id: number;
    quantity: number;
    holder: string;
    order: { id: number; number: string; customer_name: string | null } | null;
    checked_out_on: string;
    due_back_on: string | null;
    /** null = belum kembali. */
    returned_on: string | null;
    note: string | null;
    overdue: boolean;
}

export interface OrderOption {
    id: number;
    number: string;
    customer_name: string | null;
    service_date: string;
}

/** Detail aset — baris + sumber dana + riwayat servis + foto + peminjaman. */
export interface AssetDetail extends AssetRow {
    /** Sumber dana (modal owner / kas usaha) — hanya owner (spek 5.1). */
    funded_by?: string | null;
    maintenances: MaintenanceRow[];
    photos: AssetPhoto[];
    /** Belum kembali dulu, lalu 10 riwayat terakhir. */
    checkouts: AssetCheckout[];
    available_units: number;
}

export interface AssetCategoryOption {
    id: number;
    name: string;
    code_prefix: string;
    useful_life_months: number;
    maintenance_interval_months: number | null;
    /** Kode otomatis berikutnya, mis. KAM-002. */
    next_code: string;
}

/** "Canon EOS M50" — merek + model; null bila keduanya kosong. */
export function brandModel(a: {
    brand: string | null;
    model: string | null;
}): string | null {
    return [a.brand, a.model].filter(Boolean).join(' ') || null;
}
