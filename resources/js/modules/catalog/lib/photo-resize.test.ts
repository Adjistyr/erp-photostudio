import assert from 'node:assert/strict';
import { test } from 'vitest';

import { fitWithin } from '@/modules/catalog/lib/photo-resize';

test('fitWithin: foto kecil tidak diperbesar', () => {
    assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 });
    assert.deepEqual(fitWithin(1600, 1600), { width: 1600, height: 1600 });
});

test('fitWithin: landscape & portrait diskalakan ke sisi terpanjang', () => {
    assert.deepEqual(fitWithin(4000, 3000), { width: 1600, height: 1200 });
    assert.deepEqual(fitWithin(3024, 4032), { width: 1200, height: 1600 });
});

test('fitWithin: pembulatan & minimal 1 px', () => {
    assert.deepEqual(fitWithin(2400, 1600), { width: 1600, height: 1067 });
    assert.deepEqual(fitWithin(10000, 2, 1600), { width: 1600, height: 1 });
    assert.deepEqual(fitWithin(500, 500, 100), { width: 100, height: 100 });
});
