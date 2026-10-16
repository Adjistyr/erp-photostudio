import { usePage } from '@inertiajs/react';
import type { Can } from '@/types';

/**
 * Hak akses pengguna login dari shared prop `auth.can` (Gate server, spek
 * 5.1) — untuk menyembunyikan TOMBOL/MENU. Kolom & angka finansial jangan
 * disaring di sini: server sudah menghapus field-nya, render dari
 * ada-tidaknya field (`order.margin !== undefined`).
 *
 *     const can = useCan();
 *     {can.delete_money && <ConfirmDelete … />}
 */
export function useCan(): Can {
    return usePage().props.auth.can;
}
