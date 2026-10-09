import assert from 'node:assert/strict';
import { test } from 'vitest';

import { toReceipt } from '@/modules/order/components/today-sales';
import type { TodaySale } from '@/modules/order/components/today-sales';

const sale: TodaySale = {
    id: 14,
    number: 'ORD-0014',
    time: '10:15',
    items_summary: 'Cetak 4R ×4',
    total: 20000,
    methods: ['cash'],
    cancelled: false,
    customer_name: 'Rina',
    customer_phone: '62812',
    invoice_url: 'https://x/i/14?s=1',
    print_url: 'https://x/i/14?print=1&s=2',
};

test('toReceipt membentuk struk retail lunas dari baris panel', () => {
    assert.deepEqual(toReceipt(sale), {
        order_id: 14,
        number: 'ORD-0014',
        total: 20000,
        balance: 0,
        payment_status: 'paid',
        invoice_url: 'https://x/i/14?s=1',
        print_url: 'https://x/i/14?print=1&s=2',
        customer_phone: '62812',
        business_line: 'retail',
    });
});

test('order batal atau tanpa link tidak punya struk', () => {
    assert.equal(toReceipt({ ...sale, cancelled: true }), null);
    assert.equal(
        toReceipt({ ...sale, invoice_url: null, print_url: null }),
        null,
    );
});
