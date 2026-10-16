/**
 * Termin pembayaran order event (spek 6.4) — fungsi murni untuk form,
 * detail order, Pembayaran, dan pesan tagihan `{termin}`.
 *
 * Status termin dan termin berikutnya DIHITUNG SERVER (FIFO dari pembayaran);
 * di sini hanya isian form dan teks tampilan.
 */

import { formatRp, formatTanggal } from '@/lib/format';
import type { NextInstallment } from '@/modules/order/types';

/** Baris editor termin; `amount` string selama diketik. */
export interface ScheduleRow {
    key: number;
    due_on: string;
    amount: string;
    label: string;
}

/** Bentuk `schedules[]` yang dikirim ke server. */
export interface SchedulePayload {
    due_on: string;
    amount: number;
    label: string;
}

/**
 * Tanggal "YYYY-MM-DD" digeser `n` hari (negatif = mundur). Hasilnya tanggal
 * LOKAL — bukan toISOString (UTC, bisa geser hari).
 */
export function geserHari(tanggal: string, n: number): string {
    const [th, bl, tg] = tanggal.split('-').map(Number);
    const d = new Date(th, bl - 1, tg + n);
    const pad = (x: number) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Preset "Bagi 3": DP 30% hari ini · 50% H-7 · sisa H-1 dari tanggal acara.
 * Nominal dibulatkan ke rupiah; sisa pembulatan masuk termin terakhir supaya
 * Σ termin = total persis (server menolak selisih sekecil apa pun).
 */
export function splitThree(
    total: number,
    serviceDate: string,
    today: string,
): ScheduleRow[] {
    const dp = Math.round(total * 0.3);
    const mid = Math.round(total * 0.5);
    const rows: Omit<ScheduleRow, 'key'>[] = [
        { due_on: today, amount: String(dp), label: 'DP' },
        {
            due_on: geserHari(serviceDate, -7),
            amount: String(mid),
            label: 'Termin 2',
        },
        {
            due_on: geserHari(serviceDate, -1),
            amount: String(total - dp - mid),
            label: 'Pelunasan',
        },
    ];
    return rows.map((r, i) => ({ ...r, key: i + 1 }));
}

export function scheduleSum(rows: Pick<ScheduleRow, 'amount'>[]): number {
    return rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
}

export function schedulesPayload(rows: ScheduleRow[]): SchedulePayload[] {
    return rows.map((r) => ({
        due_on: r.due_on,
        amount: Number(r.amount) || 0,
        label: r.label.trim(),
    }));
}

/**
 * Aturan 5 di Ubah Order: order sudah bertermin, total berubah, dan Σ termin
 * tidak sama dengan total baru → server menghapus termin saat simpan.
 * Kondisinya sama persis dengan UpdateOrderRequest::dropsSchedules().
 */
export function schedulesWillDrop(
    hadSchedules: boolean,
    originalTotal: number,
    total: number,
    rows: Pick<ScheduleRow, 'amount'>[],
): boolean {
    return (
        hadSchedules &&
        rows.length > 0 &&
        total !== originalTotal &&
        scheduleSum(rows) !== total
    );
}

/** Nilai `{termin}` template Tagihan; kosong untuk order tanpa termin. */
export function installmentText(next: NextInstallment | null): string {
    if (!next) return '';
    return `termin ${next.sequence} dari ${next.of} — ${formatRp(next.amount)} jatuh tempo ${formatTanggal(next.due_on)}`;
}

/**
 * Baris kecil di bawah jatuh tempo/umur (Pembayaran, Dashboard, Laporan
 * Piutang): "Termin 2/3 · Rp 5.000.000" (sisa termin itu). Tanggalnya = jatuh
 * tempo efektif yang sudah tampil di sebelahnya, jadi tidak diulang.
 */
export function installmentShort(next: NextInstallment): string {
    return `Termin ${next.sequence}/${next.of} · ${formatRp(next.amount)}`;
}
