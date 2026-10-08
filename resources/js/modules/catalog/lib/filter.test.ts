import assert from 'node:assert/strict';
import { test } from 'vitest';

import { filterCatalog, isLowMargin } from '@/modules/catalog/lib/filter';

const items = [
    {
        name: 'Cetak 4R',
        category: 'Cetak',
        type: 'product' as const,
        is_active: true,
    },
    {
        name: 'Album Mini',
        category: 'Album',
        type: 'product' as const,
        is_active: false,
    },
    {
        name: 'Paket Studio 1 Jam',
        category: 'Studio',
        type: 'service' as const,
        is_active: true,
    },
];
const names = (r: { name: string }[]) => r.map((x) => x.name);

test('cocok nama atau kategori tanpa peka huruf besar', () => {
    assert.deepEqual(names(filterCatalog(items, { type: 'all', q: 'CETAK' })), [
        'Cetak 4R',
    ]);
    assert.deepEqual(
        names(filterCatalog(items, { type: 'all', q: 'studio' })),
        ['Paket Studio 1 Jam'],
    );
});

test('tab jenis dan pencarian digabung AND', () => {
    assert.deepEqual(names(filterCatalog(items, { type: 'service', q: 'a' })), [
        'Paket Studio 1 Jam',
    ]);
    assert.deepEqual(
        names(filterCatalog(items, { type: 'product', q: 'studio' })),
        [],
    );
});

test('item nonaktif tetap ikut dicari; pencarian kosong = semua', () => {
    assert.deepEqual(names(filterCatalog(items, { type: 'all', q: 'album' })), [
        'Album Mini',
    ]);
    assert.equal(filterCatalog(items, { type: 'all', q: '  ' }).length, 3);
});

test('isLowMargin: di bawah ambang; jasa (HPP null) tidak pernah', () => {
    assert.equal(isLowMargin(10000, 8500, 0.2), true); // 15%
    assert.equal(isLowMargin(10000, 8000, 0.2), false); // tepat 20%
    assert.equal(isLowMargin(350000, null, 0.2), false);
});
