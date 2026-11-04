import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'vitest';

import {
    AmountPercentField,
    nominalDariPersen,
} from '@/components/amount-percent-field';

test('nominalDariPersen: persen dari total, dibulatkan ke rupiah', () => {
    assert.deepEqual(nominalDariPersen(1_500_000, '30', 1_500_000), {
        nominal: '450000',
        dibatasi: false,
    });
    assert.deepEqual(nominalDariPersen(33_335, '10', 33_335), {
        nominal: '3334',
        dibatasi: false,
    });
});

test('nominalDariPersen: dijepit ke sisa tagihan, ditandai dibatasi', () => {
    // Total 1 jt, sudah DP 700 rb → sisa 300 rb; 50% = 500 rb → 300 rb.
    assert.deepEqual(nominalDariPersen(1_000_000, '50', 300_000), {
        nominal: '300000',
        dibatasi: true,
    });
});

test('nominalDariPersen: kosong / nol / total 0 → kosong', () => {
    assert.deepEqual(nominalDariPersen(1_000_000, '', 1_000_000), {
        nominal: '',
        dibatasi: false,
    });
    assert.deepEqual(nominalDariPersen(0, '30', 0), {
        nominal: '',
        dibatasi: false,
    });
    // Sisa 0 (sudah lunas): tidak menghasilkan nominal negatif.
    assert.equal(nominalDariPersen(1_000_000, '10', -5).nominal, '');
});

test('mode Rp awal: nominal bertitik + keterangan persen dari total', () => {
    const html = renderToStaticMarkup(
        <AmountPercentField
            id="dp"
            total={1_000_000}
            value="300000"
            onValueChange={() => {}}
        />,
    );

    assert.match(html, /value="300\.000"/);
    assert.match(html, /30%/);
    assert.match(html, /dari total/);
    assert.match(html, /Rp 1\.000\.000/);
});

test('label basis bisa diganti (HPP: % dari harga jual)', () => {
    const html = renderToStaticMarkup(
        <AmountPercentField
            id="unit_cost"
            total={50_000}
            cap={Infinity}
            totalLabel="harga jual"
            value="20000"
            onValueChange={() => {}}
        />,
    );

    assert.match(html, /40%/);
    assert.match(html, /dari harga jual/);
});

test('cap Infinity: persen > 100 tidak dijepit', () => {
    assert.deepEqual(nominalDariPersen(50_000, '120', Infinity), {
        nominal: '60000',
        dibatasi: false,
    });
});
