/**
 * Filter Katalog di klien (spek 3.6) — < 50 baris, dimuat penuh. Item
 * nonaktif tetap ikut dicari: admin mencari "kenapa item ini tidak muncul di
 * POS" dan jawabannya badge Nonaktif.
 */
export function filterCatalog<
    T extends { name: string; category: string; type: 'product' | 'service' },
>(items: T[], f: { type: 'all' | 'product' | 'service'; q: string }): T[] {
    const q = f.q.trim().toLowerCase();
    return items.filter(
        (i) =>
            (f.type === 'all' || i.type === f.type) &&
            (q === '' ||
                i.name.toLowerCase().includes(q) ||
                i.category.toLowerCase().includes(q)),
    );
}

/** Margin produk di bawah ambang (0..1). Jasa (HPP null) tidak pernah ditandai. */
export function isLowMargin(
    price: number,
    unitCost: number | null,
    threshold: number,
): boolean {
    if (unitCost === null || price <= 0) return false;
    return (price - unitCost) / price < threshold;
}
