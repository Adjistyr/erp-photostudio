import { formatTanggal, namaDepan, personalise } from '@/lib/format';

/**
 * Pesan reminder H-1 dari template `reminder` (Komunikasi, spek 3.5).
 * Jam/lokasi kosong diisi kalimat wajar untuk customer — tabel menampilkan
 * "—", pesan tidak (dua representasi yang sengaja berbeda).
 */
export function reminderMessage(
    template: string,
    row: {
        customer_name: string | null;
        service_date: string;
        service_time: string | null;
        location: string | null;
    },
): string {
    return personalise(template, {
        nama: namaDepan(row.customer_name),
        tanggal: formatTanggal(row.service_date),
        jam: row.service_time ?? 'sesuai kesepakatan',
        lokasi: row.location ?? 'studio',
        link: '',
    });
}
