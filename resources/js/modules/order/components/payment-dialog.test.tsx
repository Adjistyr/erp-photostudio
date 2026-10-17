import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'vitest';

import {
    acceptsProof,
    ProofField,
} from '@/modules/order/components/payment-dialog';

test('field bukti hanya untuk transfer/QRIS, bukan tunai', () => {
    assert.equal(acceptsProof('transfer'), true);
    assert.equal(acceptsProof('qris'), true);
    assert.equal(acceptsProof('cash'), false);
});

test('field bukti menerima format server dan menampilkan nama + ukuran file', () => {
    const file = new File([new Uint8Array(1536 * 1024)], 'mutasi.png');
    const html = renderToStaticMarkup(
        <ProofField file={file} error="Maks 2 MB." onChange={() => {}} />,
    );

    assert.match(html, /type="file"/);
    assert.match(html, /accept="\.jpg,\.jpeg,\.png,\.webp,\.pdf"/);
    assert.match(html, /mutasi\.png · 1\.5 MB/);
    assert.match(html, /Maks 2 MB\./);
});
