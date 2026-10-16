/**
 * Bundel katalog (spek 6.3) — paket jasa berisi produk. Keterangan isi paket
 * dipakai Katalog, Form Order, Detail Order, dan invoice (tanpa harga).
 */

export interface BundlePart {
    name: string;
    /** Jumlah per 1 paket. */
    quantity: number;
}

/**
 * "termasuk 10× Cetak 4R, 2× Bingkai" — qty komponen × qty paket di baris
 * (2 paket berisi 5 cetak = 10 cetak). Kosong/null → null.
 */
export function bundleIncludes(
    parts: BundlePart[] | null | undefined,
    lineQuantity = 1,
): string | null {
    if (!parts || parts.length === 0) return null;
    return `termasuk ${parts.map((p) => `${p.quantity * lineQuantity}× ${p.name}`).join(', ')}`;
}

/** HPP bahan paket dari baris komponen yang sedang diisi (pratinjau form). */
export function bundleCostOf(
    parts: { quantity: number; unit_cost: number | null }[],
): number {
    return parts.reduce((s, p) => s + p.quantity * (p.unit_cost ?? 0), 0);
}
