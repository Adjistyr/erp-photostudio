/**
 * Varian produk (spek 7.3) — label & rentang harga, dipakai Katalog dan POS.
 * Format label sama dengan CatalogItemVariant::label() di server.
 */

export function variantLabel(itemName: string, variantName: string): string {
    return `${itemName} – ${variantName}`;
}

/** Harga termurah & termahal; null bila daftar kosong. */
export function priceRange(
    prices: number[],
): { min: number; max: number } | null {
    if (prices.length === 0) return null;
    return { min: Math.min(...prices), max: Math.max(...prices) };
}
