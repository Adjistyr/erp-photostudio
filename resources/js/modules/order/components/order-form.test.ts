import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
    lineName,
    lineTotal,
    orderTotal,
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
