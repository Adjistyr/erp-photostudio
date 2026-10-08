import assert from 'node:assert/strict';
import { test } from 'vitest';

import { filterAssets } from '@/modules/asset/lib/filter';

const assets = [
    {
        code: 'AST-01',
        name: 'Kamera utama',
        model: 'Canon EOS M50',
        category: 'kamera',
        disposed_on: null,
    },
    {
        code: 'AST-02',
        name: 'Printer foto',
        model: null,
        category: 'printer',
        disposed_on: '2026-08-01',
    },
];
const codes = (r: { code: string }[]) => r.map((x) => x.code);

test('cocok kode, nama, model, kategori', () => {
    assert.deepEqual(codes(filterAssets(assets, { q: 'ast-01' })), ['AST-01']);
    assert.deepEqual(codes(filterAssets(assets, { q: 'canon' })), ['AST-01']);
    assert.deepEqual(codes(filterAssets(assets, { q: 'PRINTER' })), ['AST-02']);
});

test('aset dilepas tetap ikut dicari; kosong = semua', () => {
    assert.deepEqual(codes(filterAssets(assets, { q: 'foto' })), ['AST-02']);
    assert.equal(filterAssets(assets, { q: '' }).length, 2);
});
