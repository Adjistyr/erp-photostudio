/**
 * Permukaan publik modul Order — modul lain (mis. layar Piutang) mengimpor
 * dari sini, bukan path dalam. Halaman tidak diekspor: di-resolve Inertia
 * lewat nama "order::<halaman>".
 */
export { PaymentDialog } from '@/modules/order/components/payment-dialog';
export {
    installmentShort,
    installmentText,
} from '@/modules/order/lib/schedules';
export * from '@/modules/order/types';
