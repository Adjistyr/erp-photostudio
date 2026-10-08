import assert from 'node:assert/strict';
import { test } from 'vitest';

import { flashValue } from '@/hooks/use-flash';
import { formatRp } from '@/lib/format';
import {
    documentTitle,
    paymentReceiptMessage,
    receiptMessage,
    waLink,
} from '@/modules/order/components/invoice-document';

test('receiptMessage memuat nomor, total berformat, dan link', () => {
    const teks = receiptMessage(
        { number: 'ORD-0042', total: 45000, invoice_url: 'https://x/i/42?s=1' },
        { name: 'Studio Uji' },
    );
    assert.match(teks, /Studio Uji/);
    assert.match(teks, /ORD-0042/);
    assert.ok(teks.includes(formatRp(45000)));
    assert.ok(teks.endsWith('https://x/i/42?s=1'));
});

test('waLink menormalkan nomor lama 08… dan meng-encode pesan', () => {
    const link = waLink('0812-777', 'Halo & terima kasih');
    assert.equal(
        link,
        'https://wa.me/62812777?text=Halo%20%26%20terima%20kasih',
    );
});

test('documentTitle: retail = Struk, lainnya Invoice', () => {
    assert.equal(documentTitle('retail'), 'Struk');
    assert.equal(documentTitle('studio'), 'Invoice');
    assert.equal(documentTitle('event'), 'Invoice');
});

test('flashValue mengambil key dari event flash; key lain → undefined', () => {
    const event = new CustomEvent('inertia:flash', {
        detail: { flash: { receipt: { number: 'ORD-1' } } },
    });
    assert.deepEqual(flashValue(event, 'receipt'), { number: 'ORD-1' });
    assert.equal(flashValue(event, 'toast'), undefined);
    assert.equal(
        flashValue(new CustomEvent('x', { detail: {} }), 'receipt'),
        undefined,
    );
});

test('bukti bayar dengan sisa: nominal, sisa, jatuh tempo, rekening, link', () => {
    const teks = paymentReceiptMessage(
        {
            number: 'ORD-0005',
            balance: 210000,
            invoice_url: 'https://x/i/5?s=1',
            paid_amount: 140000,
            paid_on: '2026-08-26',
            due_on: '2026-09-05',
        },
        { bank_account: 'BCA 111' },
    );
    assert.ok(
        teks.startsWith(
            `Halo Kak, pembayaran ${formatRp(140000)} untuk ORD-0005`,
        ),
    );
    assert.ok(teks.includes(`Sisa ${formatRp(210000)}`));
    assert.ok(teks.includes('jatuh tempo'));
    assert.ok(teks.includes('BCA 111'));
    assert.ok(teks.endsWith('Rincian: https://x/i/5?s=1'));
});

test('bukti bayar lunas: tanpa sisa dan rekening', () => {
    const teks = paymentReceiptMessage(
        {
            number: 'ORD-0012',
            balance: 0,
            invoice_url: 'https://x/i/12',
            paid_amount: 200000,
            paid_on: '2026-08-26',
            due_on: '2026-08-26',
        },
        { bank_account: 'BCA 111' },
    );
    assert.ok(teks.includes('Lunas, terima kasih!'));
    assert.ok(!teks.includes('Sisa'));
    assert.ok(!teks.includes('BCA 111'));
});

test('bukti bayar tagihan lewat jatuh tempo: tanggal lampau tidak disebut', () => {
    const teks = paymentReceiptMessage(
        {
            number: 'ORD-0012',
            balance: 150000,
            invoice_url: 'https://x/i/12',
            paid_amount: 50000,
            paid_on: '2026-10-08',
            due_on: '2026-08-26',
        },
        { bank_account: 'BCA 111' },
    );
    assert.ok(
        teks.includes(`Sisa ${formatRp(150000)}. Pembayaran ke BCA 111.`),
    );
    assert.ok(!teks.includes('jatuh tempo'));
});
