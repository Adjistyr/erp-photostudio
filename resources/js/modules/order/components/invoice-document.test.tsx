import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'vitest';

import { InvoiceDocument } from '@/modules/order/components/invoice-document';
import type { Invoice } from '@/modules/order/components/invoice-document';

const invoice: Invoice = {
    id: 21,
    number: 'INV-0021',
    order_number: 'ORD-0021',
    customer_name: 'Dewi Anggraini',
    customer_phone: '6281234567890',
    business_line: 'studio',
    items_summary: 'Paket Studio 1 Jam',
    service_date: '2026-09-05',
    service_time: '10:00',
    due_on: '2026-09-05',
    next_installment: null,
    location: 'Studio',
    items: [
        {
            id: 1,
            name: 'Paket Studio 1 Jam',
            quantity: 2,
            unit_price: 350_000,
            is_custom: false,
            components: [
                { name: 'Cetak 10R + Bingkai', quantity: 1 },
                { name: 'Cetak 4R', quantity: 5 },
            ],
        },
        {
            id: 2,
            name: 'Add-on Editing Lanjutan',
            quantity: 1,
            unit_price: 150_000,
            is_custom: false,
            components: null,
        },
    ],
    discount: 0,
    total: 850_000,
    payments: [],
    refunds: [],
    total_refunded: 0,
    paid: 0,
    balance: 850_000,
    payment_status: 'unpaid',
    paid_percent: 0,
    public_url: 'https://contoh.test/i/21?signature=x',
    print_url: 'https://contoh.test/i/21?print=1&signature=y',
};

const studio = {
    name: 'Potrait Time',
    address: 'Jl. Contoh 1',
    phone: '0812',
    bank_account: 'BCA 123',
};

// Render statis tanpa DOM — badan invoice murni, tanpa Inertia.
const html = renderToStaticMarkup(
    <InvoiceDocument invoice={invoice} studio={studio} />,
);

test('paket berkomponen punya sub-baris "termasuk" dikali qty paket', () => {
    assert.match(html, /termasuk 2× Cetak 10R \+ Bingkai, 10× Cetak 4R/);
});

test('sub-baris komponen tanpa harga — hanya satu sel', () => {
    const row = html.match(
        /<tr[^>]*>(?:(?!<\/tr>).)*termasuk(?:(?!<\/tr>).)*<\/tr>/,
    );
    assert.ok(row);
    assert.doesNotMatch(row[0], /Rp/);
    assert.equal(row[0].match(/<td/g)?.length, 1);
});

test('item tanpa komponen tidak mendapat sub-baris', () => {
    assert.equal(html.match(/termasuk/g)?.length, 1);
});
