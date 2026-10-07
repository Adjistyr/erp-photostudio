import type { BusinessLine, PaymentStatus, WorkStatus } from '@/types/domain';

export type PaymentMethod = 'cash' | 'transfer' | 'qris';

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
    cash: 'Tunai',
    transfer: 'Transfer',
    qris: 'QRIS',
};

/**
 * Bentuk props order dari OrderController — angka turunan (total, sisa,
 * status bayar, persen DP, margin) sudah dihitung server.
 */
export interface OrderRow {
    id: number;
    number: string;
    /** null = walk-in tanpa data customer. */
    customer_name: string | null;
    /** null = dicatat sebelum ada pencatat atau user sudah dihapus. */
    created_by_name: string | null;
    business_line: BusinessLine;
    items_summary: string;
    service_date: string;
    service_time: string | null;
    location: string | null;
    notes: string | null;
    result_link: string | null;
    /** Link invoice untuk customer (signed); null = order batal, tidak ditagih. */
    invoice_url: string | null;
    total: number;
    paid: number;
    balance: number;
    direct_cost: number;
    margin: number;
    work_status: WorkStatus;
    /** Langkah berikutnya; null kalau sudah Diserahkan atau Batal. */
    next_status: WorkStatus | null;
    payment_status: PaymentStatus;
    paid_percent: number;
    items: { id: number; name: string; quantity: number; unit_price: number }[];
    payments: {
        id: number;
        paid_on: string;
        amount: number;
        method: PaymentMethod;
        note: string;
        created_by_name: string | null;
    }[];
    job_costs: {
        id: number;
        incurred_on: string;
        category: string;
        description: string;
        amount: number;
        created_by_name: string | null;
    }[];
}

/** "26 Agu 2026, 14:00" — jam hanya kalau order punya jam (retail tidak). */
export function scheduleOf(
    o: Pick<OrderRow, 'service_date' | 'service_time'>,
): string {
    return o.service_time
        ? `${o.service_date}T${o.service_time}`
        : o.service_date;
}

/**
 * Yang dibutuhkan dialog Catat Pembayaran — cukup identitas dan angka tagihan,
 * supaya layar Pembayaran (baris piutang) tidak harus mengirim seluruh detail
 * order.
 */
export type PayableOrder = Pick<
    OrderRow,
    'id' | 'number' | 'customer_name' | 'total' | 'paid' | 'balance'
>;
