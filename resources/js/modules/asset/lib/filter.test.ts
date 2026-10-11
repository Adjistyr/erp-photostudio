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

const register = [
    {
        code: 'KAM-001',
        name: 'Kamera',
        model: 'EOS M50',
        brand: 'Canon',
        category: 'Kamera',
        asset_category_id: 1,
        serial_number: '183052001234',
        location: 'Lemari kamera',
        status: 'active',
        disposed_on: null,
    },
    {
        code: 'PRN-001',
        name: 'Printer',
        model: 'L8050',
        brand: 'Epson',
        category: 'Printer',
        asset_category_id: 4,
        serial_number: null,
        location: 'Meja POS',
        status: 'broken',
        disposed_on: null,
    },
    {
        code: 'KAM-002',
        name: 'Kamera lama',
        model: null,
        brand: 'Canon',
        category: 'Kamera',
        asset_category_id: 1,
        serial_number: null,
        location: null,
        status: 'disposed',
        disposed_on: '2026-08-01',
    },
];

test('spek 8.1: cari merek, seri, lokasi', () => {
    assert.deepEqual(codes(filterAssets(register, { q: 'epson' })), [
        'PRN-001',
    ]);
    assert.deepEqual(codes(filterAssets(register, { q: '18305' })), [
        'KAM-001',
    ]);
    assert.deepEqual(codes(filterAssets(register, { q: 'meja' })), ['PRN-001']);
});

test('spek 8.1: filter kategori & status (dilepas dari disposed_on)', () => {
    assert.deepEqual(codes(filterAssets(register, { q: '', category: 1 })), [
        'KAM-001',
        'KAM-002',
    ]);
    assert.deepEqual(
        codes(filterAssets(register, { q: '', status: 'broken' })),
        ['PRN-001'],
    );
    assert.deepEqual(
        codes(filterAssets(register, { q: 'canon', status: 'disposed' })),
        ['KAM-002'],
    );
    assert.deepEqual(
        codes(filterAssets(register, { q: '', status: 'active' })),
        ['KAM-001'],
    );
});
