import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
    lineName,
    lineTotal,
    orderTotal,
    rowsComplete,
    toPayload,
} from '@/modules/order/components/order-form';
import type {
    CatalogOption,
    ItemRow,
} from '@/modules/order/components/order-form';

const catalog: CatalogOption[] = [
    { id: 1, name: 'Paket Studio 1 Jam', price: 400000, category: 'Studio' },
    { id: 2, name: 'Add-on Editing', price: 150000, category: 'Add-on' },
];

test('baris lama memakai harga tersimpan, bukan harga katalog yang sudah naik', () => {
    const old: ItemRow = {
        key: 1,
        id: 10,
        catalog_item_id: '1',
        quantity: 2,
        unit_price: 350000,
        name: 'Paket Studio 1 Jam',
    };
    assert.equal(lineTotal(old, catalog), 700000);
});

test('baris baru memakai harga katalog; paket belum dipilih = 0', () => {
    assert.equal(
        lineTotal({ key: 2, catalog_item_id: '2', quantity: 3 }, catalog),
        450000,
    );
    assert.equal(
        lineTotal({ key: 3, catalog_item_id: '', quantity: 1 }, catalog),
        0,
    );
});

test('orderTotal menjumlahkan baris lama dan baru', () => {
    const rows: ItemRow[] = [
        {
            key: 1,
            id: 10,
            catalog_item_id: '1',
            quantity: 1,
            unit_price: 350000,
        },
        { key: 2, catalog_item_id: '1', quantity: 1 },
    ];
    assert.equal(orderTotal(rows, catalog), 350000 + 400000);
});

test('lineName: nama tersimpan untuk baris lama, nama katalog untuk baris baru', () => {
    assert.equal(
        lineName(
            {
                key: 1,
                id: 10,
                catalog_item_id: '1',
                quantity: 1,
                name: 'Nama lama',
            },
            catalog,
        ),
        'Nama lama',
    );
    assert.equal(
        lineName({ key: 2, catalog_item_id: '2', quantity: 1 }, catalog),
        'Add-on Editing',
    );
    assert.equal(
        lineName({ key: 3, catalog_item_id: '', quantity: 1 }, catalog),
        null,
    );
});

test('baris custom: harga dari input; harga belum diisi = 0', () => {
    const custom: ItemRow = {
        key: 4,
        catalog_item_id: '',
        quantity: 2,
        custom: true,
        name: 'Drone',
        price: '500000',
    };
    assert.equal(lineTotal(custom, catalog), 1000000);
    assert.equal(lineTotal({ ...custom, price: '' }, catalog), 0);
    assert.equal(lineName({ ...custom, name: '  ' }, catalog), null);
});

test('rowsComplete: baris custom wajib nama dan harga (0 boleh)', () => {
    const base: ItemRow = {
        key: 1,
        catalog_item_id: '',
        quantity: 1,
        custom: true,
    };
    assert.equal(rowsComplete([{ ...base, name: 'Bonus', price: '0' }]), true);
    assert.equal(rowsComplete([{ ...base, name: '', price: '10' }]), false);
    assert.equal(rowsComplete([{ ...base, name: 'X', price: '' }]), false);
    assert.equal(
        rowsComplete([{ key: 2, catalog_item_id: '1', quantity: 1 }]),
        true,
    );
});

test('toPayload: baris katalog tanpa nama/harga, baris custom tanpa paket', () => {
    assert.deepEqual(
        toPayload([
            {
                key: 1,
                id: 10,
                catalog_item_id: '1',
                quantity: 2,
                unit_price: 350000,
                name: 'Lama',
            },
            {
                key: 2,
                catalog_item_id: '',
                quantity: 1,
                custom: true,
                name: ' Drone ',
                price: '500000',
            },
        ]),
        [
            { id: 10, catalog_item_id: '1', quantity: 2 },
            {
                id: null,
                catalog_item_id: null,
                name: 'Drone',
                unit_price: 500000,
                quantity: 1,
            },
        ],
    );
});
