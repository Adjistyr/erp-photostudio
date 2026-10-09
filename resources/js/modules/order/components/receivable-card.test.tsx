import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import { ReceivableCard } from '@/modules/order/components/receivable-card';
import type { ReceivableRow } from '@/modules/order/types';

const row: ReceivableRow = {
    id: 12,
    number: 'ORD-0012',
    customer_name: 'Sinta Prameswari',
    customer_phone: '6281234567890',
    invoice_url: 'https://contoh.test/i/12?signature=x',
    business_line: 'studio',
    service_date: '2026-08-20',
    days_until_due: 3,
    total: 350_000,
    paid: 150_000,
    balance: 200_000,
    payment_status: 'partial',
    paid_percent: 43,
};

// Render statis tanpa DOM — kartu murni, tanpa Inertia.
const render = (r: ReceivableRow) =>
    renderToStaticMarkup(
        <TooltipProvider>
            <ReceivableCard row={r} template="Tagih {nomor}" onPay={() => {}} />
        </TooltipProvider>,
    );

test('kartu menampilkan nomor, customer, dan sisa terformat', () => {
    const html = render(row);
    assert.match(html, /ORD-0012/);
    assert.match(html, /Sinta Prameswari/);
    assert.match(html, /Sisa Rp\s200\.000/);
    assert.match(html, /Catat Bayar/);
});

test('umur merah hanya bila lewat jatuh tempo', () => {
    assert.doesNotMatch(render(row), /data-overdue/);
    const html = render({ ...row, days_until_due: -5 });
    assert.match(html, /data-overdue="true"[^>]*text-destructive/);
});

test('tombol WA: link wa.me dengan HP, nonaktif tanpa HP', () => {
    assert.match(render(row), /href="https:\/\/wa\.me\/6281234567890/);
    const html = render({ ...row, customer_phone: null });
    assert.doesNotMatch(html, /wa\.me/);
    assert.match(html, /<button[^>]*disabled=""[^>]*belum ada nomor HP/);
});

test('walk-in tanpa nama tetap terbaca', () => {
    assert.match(render({ ...row, customer_name: null }), /Walk-in/);
});
