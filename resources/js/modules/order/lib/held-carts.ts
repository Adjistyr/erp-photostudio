/**
 * Keranjang POS yang ditahan (spek 4.3) — customer A masih memilih, B bayar
 * dulu. Hanya di `localStorage` browser kasir: bukan data, tidak di-backup.
 *
 * ponytail: localStorage; pindah ke server bila dua kasir berbagi antrean.
 *
 * Fungsi murni kecuali `loadHeld`/`saveHeld` — supaya bisa di-Vitest tanpa DOM.
 */

import type { DiscountMode } from '@/modules/order/lib/discount';
import { persenKeNominal } from '@/modules/order/lib/discount';
import { PAYMENT_METHOD_LABEL } from '@/modules/order/types';
import type { PaymentMethod } from '@/modules/order/types';

export const HELD_KEY = 'pos.held';
export const MAX_HELD = 5;

/** Isian keranjang POS yang ikut ditahan — bentuknya sama dengan form POS. */
export interface CartFields {
    /** `catalog_item_variant_id` null = produk tanpa varian (spek 7.3). */
    items: {
        catalog_item_id: number;
        catalog_item_variant_id: number | null;
        quantity: number;
    }[];
    /** Teks isian diskon apa adanya (rupiah atau persen, lihat `discountMode`). */
    discount: string;
    /** Split payment (4.4) ikut ditahan; spek awal hanya `method`. */
    payments: { method: PaymentMethod; amount: string }[];
    customer_name: string;
    customer_phone: string;
}

export interface HeldCart extends CartFields {
    v: 1;
    id: string;
    label: string;
    /** ISO. */
    heldAt: string;
    discountMode: DiscountMode;
}

const isRecord = (x: unknown): x is Record<string, unknown> =>
    typeof x === 'object' && x !== null;
const isStr = (x: unknown): x is string => typeof x === 'string';
const isPositiveInt = (x: unknown): x is number =>
    typeof x === 'number' && Number.isInteger(x) && x > 0;
const isMethod = (x: unknown): x is PaymentMethod =>
    isStr(x) && Object.hasOwn(PAYMENT_METHOD_LABEL, x);

/** Bentuk versi 1. Entri lain (versi lama/baru, hasil edit tangan) dilewati. */
function isHeldCart(x: unknown): x is HeldCart {
    if (!isRecord(x)) return false;
    const { items, payments } = x;
    return (
        x.v === 1 &&
        isStr(x.id) &&
        isStr(x.label) &&
        isStr(x.heldAt) &&
        isStr(x.discount) &&
        (x.discountMode === 'rp' || x.discountMode === 'pct') &&
        isStr(x.customer_name) &&
        isStr(x.customer_phone) &&
        Array.isArray(items) &&
        items.every(
            (i) =>
                isRecord(i) &&
                isPositiveInt(i.catalog_item_id) &&
                isPositiveInt(i.quantity) &&
                // Entri sebelum varian (7.3) tidak punya field ini — tetap sah.
                (i.catalog_item_variant_id === undefined ||
                    i.catalog_item_variant_id === null ||
                    isPositiveInt(i.catalog_item_variant_id)),
        ) &&
        Array.isArray(payments) &&
        payments.length >= 1 &&
        payments.length <= 2 &&
        payments.every(
            (p) => isRecord(p) && isMethod(p.method) && isStr(p.amount),
        )
    );
}

/**
 * Data rusak (bukan JSON, bentuk lain) → `[]`, bukan error; penyimpanan
 * berikutnya menimpanya. `storage` hanya untuk test.
 */
export function loadHeld(storage?: Pick<Storage, 'getItem'>): HeldCart[] {
    try {
        const parsed: unknown = JSON.parse(
            (storage ?? window.localStorage).getItem(HELD_KEY) ?? '[]',
        );
        return Array.isArray(parsed)
            ? parsed
                  .filter(isHeldCart)
                  .slice(0, MAX_HELD)
                  .map((c) => ({
                      ...c,
                      items: c.items.map((i) => ({
                          ...i,
                          catalog_item_variant_id:
                              i.catalog_item_variant_id ?? null,
                      })),
                  }))
            : [];
    } catch {
        return [];
    }
}

export function saveHeld(
    carts: HeldCart[],
    storage?: Pick<Storage, 'setItem'>,
): void {
    try {
        (storage ?? window.localStorage).setItem(
            HELD_KEY,
            JSON.stringify(carts),
        );
    } catch {
        // Penyimpanan penuh/diblokir (mode privat): keranjang tetap ada di
        // layar sampai halaman dimuat ulang — tidak ada yang hilang diam-diam.
    }
}

/** "Budi", atau "Keranjang 14:05" bila nama kosong. */
export function defaultLabel(customerName: string, now = new Date()): string {
    const hhmm = now.toTimeString().slice(0, 5);
    return customerName.trim() || `Keranjang ${hhmm}`;
}

export function makeHeldCart(
    fields: CartFields,
    discountMode: DiscountMode,
    label: string,
    now = new Date(),
): HeldCart {
    return {
        v: 1,
        // Bukan crypto.randomUUID(): hanya ada di secure context (HTTPS /
        // localhost) — POS lewat IP LAN http akan error. Unik per browser cukup.
        id: `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        label: label.trim() || defaultLabel(fields.customer_name, now),
        heldAt: now.toISOString(),
        discountMode,
        ...fields,
    };
}

/** Terbaru di atas; `'full'` bila sudah `MAX_HELD`. */
export function holdCart(
    carts: HeldCart[],
    cart: HeldCart,
): HeldCart[] | 'full' {
    return carts.length >= MAX_HELD ? 'full' : [cart, ...carts];
}

export function dropCart(carts: HeldCart[], id: string): HeldCart[] {
    return carts.filter((c) => c.id !== id);
}

/** Bentuk produk yang dibutuhkan pulihkan & total — subset props POS. */
interface ProductRef {
    id: number;
    price: number;
    variants?: { id: number; price: number }[];
}

/**
 * Harga baris dengan katalog SEKARANG; null bila produk/varian tidak lagi
 * dijual. Produk bervarian wajib varian; produk tanpa varian tidak boleh.
 */
function linePrice(
    i: CartFields['items'][number],
    products: ProductRef[],
): number | null {
    const p = products.find((x) => x.id === i.catalog_item_id);
    if (!p) return null;
    const variants = p.variants ?? [];
    if (i.catalog_item_variant_id === null) {
        return variants.length === 0 ? p.price : null;
    }
    return (
        variants.find((v) => v.id === i.catalog_item_variant_id)?.price ?? null
    );
}

/**
 * Isian form dari keranjang tertahan. Item atau varian yang tidak lagi ada
 * di katalog aktif (`products`) dilewati — harga selalu dari katalog saat simpan.
 */
export function restoreCart(
    cart: HeldCart,
    products: ProductRef[],
): { form: CartFields; skipped: number } {
    const items = cart.items.filter((i) => linePrice(i, products) !== null);
    return {
        form: {
            items,
            discount: cart.discount,
            payments: cart.payments,
            customer_name: cart.customer_name,
            customer_phone: cart.customer_phone,
        },
        skipped: cart.items.length - items.length,
    };
}

/** Total perkiraan dengan harga katalog SEKARANG (item/varian hilang = 0). */
export function heldTotal(cart: HeldCart, products: ProductRef[]): number {
    const subtotal = cart.items.reduce(
        (s, i) => s + i.quantity * (linePrice(i, products) ?? 0),
        0,
    );
    const discount =
        cart.discountMode === 'pct'
            ? persenKeNominal(subtotal, Number(cart.discount) || 0)
            : Number(cart.discount) || 0;
    return Math.max(0, subtotal - discount);
}
