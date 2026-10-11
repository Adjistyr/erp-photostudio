/**
 * Rencana kembali default saat order dipilih (spek 8.4 aturan 3): tanggal
 * order, tapi tidak sebelum tanggal keluar. Tanggal YYYY-MM-DD dibandingkan
 * sebagai string.
 */
export function defaultDueBack(
    orderDate: string,
    checkedOutOn: string,
): string {
    return orderDate >= checkedOutOn ? orderDate : checkedOutOn;
}
