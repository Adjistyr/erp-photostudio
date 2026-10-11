import type { ServiceCategory } from '@/types/domain';

export type OrderType = 'studio' | 'event';

/**
 * Paket studio dan paket event dipisah berdasarkan kategori katalog, bukan
 * daftar id keras: paket baru di Katalog ikut muncul tanpa mengubah kode.
 * Add-on tersedia di keduanya. Nilainya enum `ServiceCategory` — server
 * (`OrderController@create`) hanya mengirim jasa berkategori dikenal.
 */
/** Kategori jasa dikenal — kategori produk teks bebas (spek 7.5). */
export function isServiceCategory(c: string): c is ServiceCategory {
    return c === 'Studio' || c === 'Event' || c === 'Add-on';
}

export function categoryMatches(
    category: ServiceCategory,
    type: OrderType,
): boolean {
    if (category === 'Add-on') return true;
    return type === 'studio' ? category === 'Studio' : category === 'Event';
}
