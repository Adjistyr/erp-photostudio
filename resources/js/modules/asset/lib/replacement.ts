/**
 * Label waktu penggantian aset (spek 6.2 / 8.3) — selisih bulan kalender
 * dari server; negatif = umur ekonomis sudah lewat.
 */
export function replacementWhen(monthsUntil: number): string {
    if (monthsUntil < 0) return `lewat ${-monthsUntil} bulan`;
    if (monthsUntil === 0) return 'bulan ini';
    return `${monthsUntil} bulan lagi`;
}
