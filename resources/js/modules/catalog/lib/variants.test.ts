import assert from 'node:assert/strict';
import { test } from 'vitest';

import { priceRange, variantLabel } from '@/modules/catalog/lib/variants';

test('variantLabel sama dengan format server', () => {
    assert.equal(variantLabel('Bingkai Kayu', 'A4'), 'Bingkai Kayu – A4');
});

test('priceRange: kosong → null; satu harga → min = max', () => {
    assert.equal(priceRange([]), null);
    assert.deepEqual(priceRange([60000]), { min: 60000, max: 60000 });
    assert.deepEqual(priceRange([90000, 45000, 60000]), {
        min: 45000,
        max: 90000,
    });
});
