import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
    nominalKePersen,
    persenKeNominal,
    rapikanPersen,
} from '@/modules/order/lib/discount';

test('persenKeNominal dibulatkan ke rupiah terdekat', () => {
    assert.equal(persenKeNominal(80000, 10), 8000);
    assert.equal(persenKeNominal(33333, 10), 3333); // 3333,3 → bawah
    assert.equal(persenKeNominal(33335, 10), 3334); // 3333,5 → atas
    assert.equal(persenKeNominal(0, 50), 0);
});

test('nominalKePersen dua desimal; subtotal 0 → 0', () => {
    assert.equal(nominalKePersen(80000, 8000), 10);
    assert.equal(nominalKePersen(0, 5000), 0);
    assert.equal(nominalKePersen(30000, 10000), 33.33);
});

test('rapikanPersen menerima koma, satu pemisah, dua desimal', () => {
    assert.equal(rapikanPersen('12,555'), '12.55');
    assert.equal(rapikanPersen('10%'), '10');
    assert.equal(rapikanPersen('1.2.3'), '1.23');
    assert.equal(rapikanPersen('abc'), '');
});
