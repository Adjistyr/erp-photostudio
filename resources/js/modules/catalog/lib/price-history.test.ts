import assert from 'node:assert/strict';
import { test } from 'vitest';

import { periodeBerlaku, selisih } from '@/modules/catalog/lib/price-history';

const row = (at: string, price = 5000, unit_cost: number | null = 1500) => ({
    at,
    price,
    unit_cost,
    changed_by_name: null,
});

test('periodeBerlaku: satu baris → "Berlaku sejak"', () => {
    assert.deepEqual(periodeBerlaku([row('2026-08-12T09:00:00+07:00')]), [
        'Berlaku sejak 12 Agu 2026',
    ]);
});

test('periodeBerlaku: dua baris → yang lama berakhir saat yang baru mulai', () => {
    assert.deepEqual(
        periodeBerlaku([
            row('2026-10-06T09:00:00+07:00'),
            row('2026-08-12T09:00:00+07:00'),
        ]),
        ['Berlaku sejak 6 Okt 2026', 'Berlaku 12 Agu 2026 – 6 Okt 2026'],
    );
});

test('periodeBerlaku: tiga baris → tiap rentang dari baris berikutnya', () => {
    assert.deepEqual(
        periodeBerlaku([
            row('2026-10-06T09:00:00+07:00'),
            row('2026-09-01T09:00:00+07:00'),
            row('2026-08-12T09:00:00+07:00'),
        ]),
        [
            'Berlaku sejak 6 Okt 2026',
            'Berlaku 1 Sep 2026 – 6 Okt 2026',
            'Berlaku 12 Agu 2026 – 1 Sep 2026',
        ],
    );
});

test('selisih: vs baris lebih lama; baris tertua & HPP null → null', () => {
    const rows = [
        row('2026-10-06', 7000, null),
        row('2026-09-01', 5000, 1500),
        row('2026-08-12', 6000, 1500),
    ];
    assert.equal(selisih(rows, 0, 'price'), 2000);
    assert.equal(selisih(rows, 1, 'price'), -1000);
    assert.equal(selisih(rows, 2, 'price'), null);
    assert.equal(selisih(rows, 0, 'unit_cost'), null);
    assert.equal(selisih(rows, 1, 'unit_cost'), 0);
});
