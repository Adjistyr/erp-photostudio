import { formatRp, formatTanggal } from '@/lib/format';
import { WORK_STATUS_LABEL } from '@/types/domain';
import type { BusinessLine, PaymentStatus, WorkStatus } from '@/types/domain';

export type PaymentMethod = 'cash' | 'transfer' | 'qris';

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
    cash: 'Tunai',
    transfer: 'Transfer',
    qris: 'QRIS',
};

/**
 * Flash `receipt` — dikirim sekali setelah transaksi POS (dan, nanti,
 * catat bayar). Link = halaman publik invoice yang sama; untuk retail
 * halaman itu berjudul "Struk".
 */
export interface Receipt {
    order_id: number;
    number: string;
    total: number;
    balance: number;
    payment_status: PaymentStatus;
    invoice_url: string;
    /** Varian `?print=1`, ditandatangani terpisah — jangan tempel query di klien. */
    print_url: string;
    /** null = walk-in tanpa customer atau customer tanpa HP. */
    customer_phone: string | null;
    business_line: BusinessLine;
    /** Hanya dari Catat Bayar (bukti bayar); POS tidak mengirimnya. */
    paid_amount?: number;
    paid_on?: string;
    /** Jatuh tempo sisa = tanggal layanan. */
    due_on?: string;
}

/**
 * Bentuk props order dari OrderController — angka turunan (total, sisa,
 * status bayar, persen DP, margin) sudah dihitung server.
 */
export interface OrderRow {
    id: number;
    number: string;
    /** null = walk-in tanpa data customer. */
    customer_id: number | null;
    customer_name: string | null;
    /** null = dicatat sebelum ada pencatat atau user sudah dihapus. */
    created_by_name: string | null;
    business_line: BusinessLine;
    /** Bisa dibuka di Ubah Order (studio/event, bukan batal) — dari server. */
    editable: boolean;
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
    /** Langkah sebelumnya untuk koreksi salah klik; null kalau Booking atau Batal. */
    previous_status: WorkStatus | null;
    payment_status: PaymentStatus;
    paid_percent: number;
    items: {
        id: number;
        name: string;
        quantity: number;
        unit_price: number;
        catalog_item_id: number | null;
        unit_cost: number | null;
        /** Item custom (harga nego di luar katalog, spek 1.3). */
        is_custom: boolean;
    }[];
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
    /** Riwayat perubahan, terbaru dulu. */
    events: OrderEvent[];
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

// ---------------------------------------------------------------------------
// Riwayat perubahan order (order_events) — label & kalimat untuk Sheet detail.
// ---------------------------------------------------------------------------

export type OrderEventType =
    | 'created'
    | 'updated'
    | 'advanced'
    | 'reverted'
    | 'cancelled'
    | 'payment_recorded'
    | 'payment_deleted'
    | 'result_link'
    | 'refunded';

export interface OrderEvent {
    id: number;
    type: OrderEventType;
    /** Hanya field yang berubah; null untuk tipe tanpa rincian. */
    changes: Record<string, { from: unknown; to: unknown }> | null;
    /** null = sistem/seeder atau user sudah dihapus. */
    user_name: string | null;
    /** ISO 8601. */
    at: string;
}

export const ORDER_EVENT_LABEL: Record<OrderEventType, string> = {
    created: 'Dibuat',
    updated: 'Diubah',
    advanced: 'Status maju',
    reverted: 'Status dikembalikan',
    cancelled: 'Dibatalkan',
    payment_recorded: 'Pembayaran dicatat',
    payment_deleted: 'Pembayaran dihapus',
    result_link: 'Link hasil',
    refunded: 'Pengembalian',
};

export const ORDER_FIELD_LABEL: Record<string, string> = {
    service_date: 'Tanggal',
    service_time: 'Jam',
    location: 'Lokasi',
    notes: 'Catatan',
    customer_id: 'Customer',
    work_status: 'Status',
    result_link: 'Link hasil',
    amount: 'Jumlah',
    method: 'Metode',
    paid_on: 'Tanggal bayar',
    total: 'Total',
    reason: 'Alasan',
    // Edit order (spek 1.2): ringkasan item sebelum → sesudah.
    items: 'Item',
};

/** `changes` berisi unknown — objek tak terduga jadi JSON, bukan "[object Object]". */
function keTeks(v: unknown): string {
    return typeof v === 'string' ||
        typeof v === 'number' ||
        typeof v === 'boolean'
        ? String(v)
        : JSON.stringify(v);
}

/** Nilai `changes` menurut field-nya; null → "—", yang tak dikenal apa adanya. */
function nilaiField(field: string, v: unknown): string {
    if (v === null || v === undefined || v === '') return '—';
    switch (field) {
        case 'amount':
        case 'total':
            return formatRp(Number(v));
        case 'service_date':
        case 'paid_on':
            return formatTanggal(keTeks(v));
        case 'work_status':
            return WORK_STATUS_LABEL[v as WorkStatus] ?? keTeks(v);
        case 'method':
            return PAYMENT_METHOD_LABEL[v as PaymentMethod] ?? keTeks(v);
        default:
            return keTeks(v);
    }
}

/**
 * Satu kalimat per event: "Status Booking → Dijadwalkan", "Pembayaran
 * Rp 500.000 (Transfer) dicatat". Field yang tidak dikenal (tipe baru dari
 * refund, dsb.) tetap tampil sebagai `key: from → to` — jangan pernah crash
 * karena bentuk data lama/baru.
 */
export function describeEvent(e: OrderEvent): string {
    const c = e.changes ?? {};
    const ada = (k: string) => k in c;
    const dari = (k: string) => nilaiField(k, c[k]?.from);
    const ke = (k: string) => nilaiField(k, c[k]?.to);

    switch (e.type) {
        case 'created':
            return `Dibuat · ${ke('work_status')}${ada('total') ? ` · Total ${ke('total')}` : ''}`;
        case 'advanced':
        case 'reverted':
            return `Status ${dari('work_status')} → ${ke('work_status')}`;
        case 'cancelled':
            return `Dibatalkan${ada('reason') && c.reason?.to ? ` — ${ke('reason')}` : ''}`;
        case 'payment_recorded':
            return `Pembayaran ${ke('amount')} (${ke('method')}) dicatat`;
        case 'payment_deleted':
            return `Pembayaran ${dari('amount')} (${dari('method')}) dihapus`;
        case 'result_link':
            return c.result_link?.from
                ? 'Link hasil diubah'
                : 'Link hasil ditambahkan';
        default: {
            const frasa = Object.keys(c).map((k) =>
                k in ORDER_FIELD_LABEL
                    ? `${ORDER_FIELD_LABEL[k]} ${dari(k)} → ${ke(k)}`
                    : `${k}: ${dari(k)} → ${ke(k)}`,
            );
            return frasa.length > 0
                ? frasa.join(' · ')
                : ORDER_EVENT_LABEL[e.type];
        }
    }
}
