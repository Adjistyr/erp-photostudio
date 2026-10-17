import { formatTanggal } from '@/lib/format';
import type { CatalogPriceChange } from '@/modules/catalog/types';

/**
 * Label masa berlaku tiap baris riwayat (spek 6.5 aturan 4). `rows` urut
 * terbaru dulu seperti props server: baris i berlaku sampai baris
 * sesudahnya (i - 1) dimulai; baris terbaru "Berlaku sejak …".
 */
export function periodeBerlaku(
    rows: Pick<CatalogPriceChange, 'at'>[],
): string[] {
    return rows.map((row, i) =>
        i === 0
            ? `Berlaku sejak ${formatTanggal(row.at)}`
            : `Berlaku ${formatTanggal(row.at)} – ${formatTanggal(rows[i - 1].at)}`,
    );
}

/**
 * Selisih vs baris sebelumnya secara waktu (baris i + 1 di urutan terbaru
 * dulu); null untuk baris tertua atau nilai yang tak bisa dibandingkan.
 */
export function selisih(
    rows: CatalogPriceChange[],
    i: number,
    field: 'price' | 'unit_cost',
): number | null {
    const prev = rows[i + 1];
    const now = rows[i][field];
    if (!prev || now == null || prev[field] == null) return null;
    return now - prev[field];
}
