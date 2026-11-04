import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'vitest';

import {
    ketikUang,
    MoneyInput,
    posisiSetelahDigit,
} from '@/components/money-input';

test('tampil bertitik dengan prefix Rp, inputMode numeric', () => {
    const html = renderToStaticMarkup(
        <MoneyInput id="amount" value="1500000" onValueChange={() => {}} />,
    );

    assert.match(html, />Rp</);
    assert.match(html, /value="1\.500\.000"/);
    assert.match(html, /inputMode="numeric"|inputmode="numeric"/);
    assert.match(html, /id="amount"/);
});

test('ketik digit di tengah: titik disusun ulang, kursor ikut digitnya', () => {
    // "1.500" → ketik "2" setelah "1" → "12.500" mentah, kursor 2.
    const r = ketikUang('1500', '12.500', 2);
    assert.deepEqual(r, { digit: '12500', kiri: 2 });
    // Tampil "12.500": kursor setelah digit ke-2 = indeks 2.
    assert.equal(posisiSetelahDigit('12.500', r.kiri), 2);
    assert.equal(posisiSetelahDigit('1.250.000', 4), 5);
    assert.equal(posisiSetelahDigit('1.500', 0), 0);
});

test('Backspace pada titik menghapus digit di kirinya, Delete di kanannya', () => {
    // "1.500", kursor setelah titik (2), Backspace → mentah "1500", kursor 1.
    assert.deepEqual(ketikUang('1500', '1500', 1, 'deleteContentBackward'), {
        digit: '500',
        kiri: 0,
    });
    // Kursor sebelum titik (1), Delete → mentah "1500", kursor 1.
    assert.deepEqual(ketikUang('1500', '1500', 1, 'deleteContentForward'), {
        digit: '100',
        kiri: 1,
    });
});

test('tempel nominal sama tanpa titik menimpa seleksi: tidak ada digit hilang', () => {
    assert.deepEqual(ketikUang('1500', '1500', 4, 'insertFromPaste'), {
        digit: '1500',
        kiri: 4,
    });
});

test('tempel dari mutasi & nol di depan dibersihkan', () => {
    assert.equal(ketikUang('', 'Rp 1.250.000', 12).digit, '1250000');
    assert.deepEqual(ketikUang('', '007', 3), { digit: '7', kiri: 1 });
    assert.deepEqual(ketikUang('5', '', 0, 'deleteContentBackward'), {
        digit: '',
        kiri: 0,
    });
});

test('withPrefix={false} menyembunyikan "Rp" (satuan sudah di toggle)', () => {
    const html = renderToStaticMarkup(
        <MoneyInput value="5000" withPrefix={false} onValueChange={() => {}} />,
    );

    assert.doesNotMatch(html, />Rp</);
    assert.match(html, /value="5\.000"/);
});
