/**
 * Filter Aset di klien (spek 3.6). Aset yang sudah dilepas tetap ikut dicari —
 * riwayatnya masih dibutuhkan.
 *
 * Spek 8.1: pencarian ikut merek, nomor seri, dan lokasi; filter kategori &
 * status ("dilepas" dibaca dari `disposed_on`, bukan status).
 */
export type AssetStatusFilter = 'active' | 'broken' | 'disposed';

export function filterAssets<
    T extends {
        code: string;
        name: string;
        model: string | null;
        category: string;
        brand?: string | null;
        serial_number?: string | null;
        location?: string | null;
        asset_category_id?: number;
        status?: string;
        disposed_on?: string | null;
    },
>(
    assets: T[],
    f: { q: string; category?: number; status?: AssetStatusFilter },
): T[] {
    const q = f.q.trim().toLowerCase();
    return assets.filter(
        (a) =>
            (f.category === undefined || a.asset_category_id === f.category) &&
            (f.status === undefined ||
                (f.status === 'disposed'
                    ? Boolean(a.disposed_on)
                    : !a.disposed_on && a.status === f.status)) &&
            (q === '' ||
                [
                    a.code,
                    a.name,
                    a.model ?? '',
                    a.category,
                    a.brand ?? '',
                    a.serial_number ?? '',
                    a.location ?? '',
                ].some((v) => v.toLowerCase().includes(q))),
    );
}
