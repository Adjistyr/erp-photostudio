/**
 * Nilai enum domain sebagaimana dikirim server (app/Enums) dan labelnya di
 * UI. Kode memakai bahasa Inggris, layar bahasa Indonesia — glosarium di
 * docs/database.md.
 */

export type BusinessLine = 'retail' | 'studio' | 'event';

export const BUSINESS_LINES: BusinessLine[] = ['retail', 'studio', 'event'];

export const LINE_LABEL: Record<BusinessLine, string> = {
    retail: 'Retail',
    studio: 'Studio',
    event: 'Event',
};

/**
 * Warna lini TETAP di semua layar (DESIGN.md R6): Retail biru, Studio amber,
 * Event ungu. Kalau berpindah, owner harus membaca legenda tiap kali.
 */
export const LINE_COLOR: Record<BusinessLine, string> = {
    retail: 'var(--chart-1)',
    studio: 'var(--chart-2)',
    event: 'var(--chart-3)',
};

export type WorkStatus =
    | 'booking'
    | 'scheduled'
    | 'in_progress'
    | 'done'
    | 'delivered'
    | 'cancelled';

/** Urutan progres = urutan titik indikator (business-flow bagian 4). */
export const WORK_STEPS: Exclude<WorkStatus, 'cancelled'>[] = [
    'booking',
    'scheduled',
    'in_progress',
    'done',
    'delivered',
];

export const WORK_STATUS_LABEL: Record<WorkStatus, string> = {
    booking: 'Booking',
    scheduled: 'Dijadwalkan',
    in_progress: 'Dikerjakan',
    done: 'Selesai Dikerjakan',
    delivered: 'Diserahkan',
    cancelled: 'Batal',
};

/** Diturunkan server dari pembayaran — tidak pernah diinput (bagian 4). */
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

/**
 * Kategori JASA katalog — menentukan di form order mana paket muncul
 * (Studio → sesi studio, Event → event, Add-on → keduanya). Enum di server:
 * `Modules\Catalog\Enums\ServiceCategory`. Jangan bandingkan string literal
 * di komponen — impor dari sini.
 */
export type ServiceCategory = 'Studio' | 'Event' | 'Add-on';

export const SERVICE_CATEGORIES: ServiceCategory[] = [
    'Studio',
    'Event',
    'Add-on',
];
