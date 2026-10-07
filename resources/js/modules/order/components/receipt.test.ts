import assert from 'node:assert/strict';
import { test } from 'vitest';

import { flashValue } from '@/hooks/use-flash';
import { formatRp } from '@/lib/format';
import {
    documentTitle,
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
