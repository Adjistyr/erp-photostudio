/**
 * Badge garansi aset (spek 8.1, dari 6.1). Tanggal YYYY-MM-DD dibandingkan
 * sebagai string — format tetap, tanpa zona waktu.
 */
export type WarrantyState = 'active' | 'expired' | null;

export function warrantyState(
    until: string | null,
    today: string,
): WarrantyState {
    if (!until) return null;
    return until >= today ? 'active' : 'expired';
}
