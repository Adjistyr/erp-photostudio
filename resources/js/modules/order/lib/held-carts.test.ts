import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
    defaultLabel,
    dropCart,
    HELD_KEY,
    heldTotal,
    holdCart,
    loadHeld,
    makeHeldCart,
    restoreCart,
    saveHeld,
} from '@/modules/order/lib/held-carts';
import type { CartFields, HeldCart } from '@/modules/order/lib/held-carts';

const fields: CartFields = {
    items: [
        { catalog_item_id: 1, catalog_item_variant_id: null, quantity: 2 },
        { catalog_item_id: 2, catalog_item_variant_id: null, quantity: 1 },
    ],
    discount: '10',
    payments: [{ method: 'cash', amount: '' }],
    customer_name: '',
    customer_phone: '',
};
const cart = (label = 'A'): HeldCart => makeHeldCart(fields, 'pct', label);

/** Storage tiruan — Vitest berjalan tanpa DOM. */
function memory(raw: string | null) {
    let value = raw;
    return {
        getItem: () => value,
        setItem: (_k: string, v: string) => {
            value = v;
        },
    };
}

test('loadHeld: JSON rusak / bukan array → []', () => {
    assert.deepEqual(loadHeld(memory('{bukan json')), []);
    assert.deepEqual(loadHeld(memory('{"v":1}')), []);
    assert.deepEqual(loadHeld(memory(null)), []);
});

test('loadHeld: versi lain & bentuk salah disaring; simpan → muat utuh', () => {
    const ok = cart();
    const s = memory(null);
    saveHeld([ok], s);
    assert.deepEqual(loadHeld(s), [ok]);

    const raw = JSON.stringify([
        { ...ok, v: 2 },
        { ...ok, items: [{ catalog_item_id: '1', quantity: 1 }] },
        { ...ok, payments: [{ method: 'utang', amount: '' }] },
        ok,
    ]);
    assert.deepEqual(loadHeld(memory(raw)), [ok]);
    assert.equal(HELD_KEY, 'pos.held');
});

test('holdCart: terbaru di atas; daftar berisi 5 → full', () => {
    const five = ['1', '2', '3', '4', '5'].map(cart);
    assert.equal(holdCart(five, cart('6')), 'full');
    const two = holdCart([cart('lama')], cart('baru'));
    assert.notEqual(two, 'full');
    if (two !== 'full')
        assert.deepEqual(
            two.map((c) => c.label),
            ['baru', 'lama'],
        );
});

test('restoreCart: item yang hilang dari katalog dilewati, sisanya utuh', () => {
    const { form, skipped } = restoreCart(cart(), [{ id: 1, price: 5000 }]);
    assert.equal(skipped, 1);
    assert.deepEqual(form.items, [
        { catalog_item_id: 1, catalog_item_variant_id: null, quantity: 2 },
    ]);
    assert.equal(form.discount, '10');
    assert.deepEqual(form.payments, fields.payments);
});

test('dropCart menghapus hanya id yang diminta', () => {
    const a = cart('a');
    const b = cart('b');
    assert.deepEqual(dropCart([a, b], a.id), [b]);
    assert.deepEqual(dropCart([a, b], 'tidak-ada'), [a, b]);
});

test('label default & total perkiraan dari harga sekarang', () => {
    const at = new Date(2026, 9, 9, 14, 5);
    assert.equal(defaultLabel('  ', at), 'Keranjang 14:05');
    assert.equal(defaultLabel('Budi', at), 'Budi');
    assert.equal(makeHeldCart(fields, 'rp', '  ', at).label, 'Keranjang 14:05');
    // (2 × 5.000 + 0 untuk item hilang) − 10% = 9.000
    assert.equal(heldTotal(cart(), [{ id: 1, price: 5000 }]), 9000);
});

test('varian: entri lama tanpa field = tanpa varian; varian hilang dilewati', () => {
    const old = { ...cart(), items: [{ catalog_item_id: 1, quantity: 1 }] };
    assert.deepEqual(loadHeld(memory(JSON.stringify([old])))[0].items, [
        { catalog_item_id: 1, catalog_item_variant_id: null, quantity: 1 },
    ]);

    const withVariant: HeldCart = {
        ...cart(),
        discount: '',
        items: [
            { catalog_item_id: 3, catalog_item_variant_id: 30, quantity: 2 },
            { catalog_item_id: 3, catalog_item_variant_id: 31, quantity: 1 },
            // Produk kini bervarian — baris tanpa varian tidak bisa dijual.
            { catalog_item_id: 3, catalog_item_variant_id: null, quantity: 1 },
        ],
    };
    const products = [
        { id: 3, price: 60000, variants: [{ id: 30, price: 60000 }] },
    ];
    const { form, skipped } = restoreCart(withVariant, products);
    assert.equal(skipped, 2);
    assert.deepEqual(form.items, [withVariant.items[0]]);
    // Total memakai harga varian: 2 × 60.000 (varian hilang = 0).
    assert.equal(
        heldTotal({ ...withVariant, discountMode: 'rp' }, products),
        120000,
    );
});
