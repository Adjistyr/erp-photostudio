/**
 * Diskon persen di POS (spek 4.1) — HANYA di klien. Server selalu menerima
 * nominal rupiah (`discount`); aturan "diskon < subtotal" tetap di server.
 */
export type DiscountMode = 'rp' | 'pct';

/** Persen → rupiah, dibulatkan ke rupiah terdekat (rupiah selalu integer, R5). */
export function persenKeNominal(subtotal: number, persen: number): number {
    if (subtotal <= 0 || persen <= 0) return 0;
    return Math.round((subtotal * persen) / 100);
}

/** Rupiah → persen dua desimal; subtotal 0 → 0. */
export function nominalKePersen(subtotal: number, nominal: number): number {
    if (subtotal <= 0 || nominal <= 0) return 0;
    return Math.round((nominal / subtotal) * 10000) / 100;
}

/**
 * Isian persen → teks rapi: digit + satu pemisah desimal (koma diterima,
 * jadi titik), maksimal dua desimal. "12,555" → "12.55".
 */
export function rapikanPersen(input: string): string {
    const s = input.replace(',', '.').replace(/[^\d.]/g, '');
    const [int, ...rest] = s.split('.');
    if (rest.length === 0) return int;
    return `${int}.${rest.join('').slice(0, 2)}`;
}
