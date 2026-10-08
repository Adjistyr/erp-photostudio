import type { ReceivableRow } from '@/modules/order/types';
import type { BusinessLine } from '@/types/domain';

/**
 * Filter layar Pembayaran (spek 3.2) — di klien: daftar piutang kecil dan
 * selalu dimuat penuh (`Receivables::open()`), jadi tidak perlu request.
 */
export type AgeTab = 'all' | 'overdue' | 'soon';

export interface ReceivableFilter {
    q: string;
    line?: BusinessLine;
    age: AgeTab;
}

type Row = Pick<
    ReceivableRow,
    'number' | 'customer_name' | 'business_line' | 'days_until_due'
>;

/**
 * Umur tagihan. "Lewat" = days_until_due < 0 — sama persis dengan kartu
 * "Lewat jatuh tempo" dan Receivables di server (jatuh tempo hari ini belum
 * lewat). "Segera" = 0..7 hari lagi.
 */
export function matchesAge(daysUntilDue: number, age: AgeTab): boolean {
    if (age === 'overdue') return daysUntilDue < 0;
    if (age === 'soon') return daysUntilDue >= 0 && daysUntilDue <= 7;
    return true;
}

/** Semua syarat digabung AND; urutan masukan (sisa terbesar dulu) dipertahankan. */
export function filterReceivables<T extends Row>(
    rows: T[],
    f: ReceivableFilter,
): T[] {
    const q = f.q.trim().toLowerCase();
    return rows.filter(
        (r) =>
            matchesAge(r.days_until_due, f.age) &&
            (!f.line || r.business_line === f.line) &&
            (q === '' ||
                r.number.toLowerCase().includes(q) ||
                // Walk-in (tanpa customer) tampil "Walk-in" — cocokkan teks itu.
                (r.customer_name ?? 'Walk-in').toLowerCase().includes(q)),
    );
}
