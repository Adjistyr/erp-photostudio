import assert from 'node:assert/strict';
import { test } from 'vitest';

import { bundleCostOf, bundleIncludes } from '@/modules/catalog/lib/bundle';

test('bundleIncludes: kosong → null; qty dikali qty baris', () => {
    assert.equal(bundleIncludes(null), null);
    assert.equal(bundleIncludes([]), null);
    assert.equal(
        bundleIncludes([{ name: 'Cetak 4R', quantity: 5 }]),
        'termasuk 5× Cetak 4R',
    );
    assert.equal(
        bundleIncludes(
            [
                { name: 'Cetak 4R', quantity: 5 },
                { name: 'Bingkai', quantity: 1 },
            ],
            2,
        ),
        'termasuk 10× Cetak 4R, 2× Bingkai',
    );
});

test('bundleCostOf: Σ HPP × qty, HPP kosong dihitung 0', () => {
    assert.equal(bundleCostOf([]), 0);
    assert.equal(
        bundleCostOf([
            { quantity: 5, unit_cost: 1500 },
            { quantity: 1, unit_cost: 32000 },
            { quantity: 2, unit_cost: null },
        ]),
        39500,
    );
});
