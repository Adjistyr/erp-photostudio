import assert from 'node:assert/strict';
import { test } from 'vitest';

import { bagiPembayaran } from '@/modules/order/lib/split-payment';

test('bagiPembayaran: baris pertama = sisa total', () => {
    assert.deepEqual(bagiPembayaran(80000, 30000), [50000, 30000]);
    assert.deepEqual(bagiPembayaran(80000, 79999), [1, 79999]);
});

test('bagiPembayaran: baris kedua harus 1..total−1', () => {
    assert.equal(bagiPembayaran(80000, 0), null);
    assert.equal(bagiPembayaran(80000, -5), null);
    assert.equal(bagiPembayaran(80000, 80000), null);
    assert.equal(bagiPembayaran(80000, 90000), null);
    assert.equal(bagiPembayaran(80000, 1.5), null);
    assert.equal(bagiPembayaran(0, 1), null);
});
