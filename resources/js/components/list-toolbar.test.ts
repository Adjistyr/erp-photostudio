import assert from 'node:assert/strict';
import { test } from 'vitest';

import { cleanQuery, hasActiveFilter } from '@/components/list-toolbar';
import { pageLabel } from '@/components/pagination';

test('cleanQuery membuang kunci kosong dan page (filter berubah → halaman 1)', () => {
    assert.deepEqual(
        cleanQuery({
            q: '',
            line: 'studio',
            pay: undefined,
            page: '3',
            status: '',
        }),
        { line: 'studio' },
    );
    assert.deepEqual(cleanQuery({ q: 'budi' }), { q: 'budi' });
});

test('hasActiveFilter: q kosong tanpa filter = tidak aktif', () => {
    assert.equal(hasActiveFilter({ q: '' }), false);
    assert.equal(hasActiveFilter({ q: '', page: '2' }), false);
    assert.equal(hasActiveFilter({ q: 'x' }), true);
    assert.equal(hasActiveFilter({ q: '', line: 'retail' }), true);
});

test('pageLabel', () => {
    assert.equal(pageLabel(2, 7), 'Hal. 2 dari 7');
});
