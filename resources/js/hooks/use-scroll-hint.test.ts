import assert from 'node:assert/strict';
import { test } from 'vitest';

import { scrollHint } from '@/hooks/use-scroll-hint';

test('baris muat: tanpa tanda', () => {
    assert.equal(scrollHint(0, 300, 300), 'none');
    // Selisih pecahan retina tidak dihitung lanjutan.
    assert.equal(scrollHint(0, 300, 300.5), 'none');
});

test('di awal baris yang lebih panjang: tanda di kanan', () => {
    assert.equal(scrollHint(0, 300, 520), 'end');
});

test('di tengah: kedua sisi; di ujung: kiri saja', () => {
    assert.equal(scrollHint(100, 300, 520), 'both');
    assert.equal(scrollHint(220, 300, 520), 'start');
});
