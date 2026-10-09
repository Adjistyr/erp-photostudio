/**
 * Split payment di POS (spek 4.4). Hanya nominal baris kedua yang diketik;
 * baris pertama = sisa total — kasir tidak perlu mencocokkan dua angka.
 */

/** `[baris1, baris2]`, atau `null` bila baris kedua bukan 1..total−1 rupiah. */
export function bagiPembayaran(
    total: number,
    amount2: number,
): [number, number] | null {
    if (!Number.isInteger(amount2) || amount2 <= 0 || amount2 >= total) {
        return null;
    }
    return [total - amount2, amount2];
}
