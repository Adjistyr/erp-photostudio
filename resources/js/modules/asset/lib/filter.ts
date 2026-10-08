/**
 * Filter Aset di klien (spek 3.6). Aset yang sudah dilepas tetap ikut dicari —
 * riwayatnya masih dibutuhkan.
 */
export function filterAssets<
    T extends {
        code: string;
        name: string;
        model: string | null;
        category: string;
    },
>(assets: T[], f: { q: string }): T[] {
    const q = f.q.trim().toLowerCase();
    if (q === '') return assets;
    return assets.filter((a) =>
        [a.code, a.name, a.model ?? '', a.category].some((v) =>
            v.toLowerCase().includes(q),
        ),
    );
}
