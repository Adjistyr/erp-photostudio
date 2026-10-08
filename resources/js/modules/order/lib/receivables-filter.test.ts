import assert from 'node:assert/strict';
import { test } from 'vitest';

import { filterReceivables } from '@/modules/order/lib/receivables-filter';

const rows = [
    {
        number: 'ORD-0011',
        customer_name: 'Rani & Dimas',
        business_line: 'event' as const,
        days_until_due: 10,
    },
    {
        number: 'ORD-0008',
        customer_name: 'Nadia',
        business_line: 'event' as const,
        days_until_due: -14,
    },
    {
        number: 'ORD-0005',
        customer_name: 'Budi Hartono',
        business_line: 'studio' as const,
        days_until_due: 7,
    },
    {
        number: 'ORD-0012',
        customer_name: null,
        business_line: 'studio' as const,
        days_until_due: 0,
    },
    {
        number: 'ORD-0020',
        customer_name: 'Sari',
        business_line: 'studio' as const,
        days_until_due: 8,
    },
    {
        number: 'ORD-0021',
        customer_name: 'Yoga',
        business_line: 'retail' as const,
        days_until_due: -1,
    },
];
const numbers = (r: { number: string }[]) => r.map((x) => x.number);

test('menampilkan semua saat filter kosong, urutan masukan dipertahankan', () => {
    assert.deepEqual(
        numbers(filterReceivables(rows, { q: '', age: 'all' })),
        numbers(rows),
    );
});

test('overdue hanya days_until_due negatif — jatuh tempo hari ini belum lewat', () => {
    assert.deepEqual(
        numbers(filterReceivables(rows, { q: '', age: 'overdue' })),
        ['ORD-0008', 'ORD-0021'],
    );
});

test('soon mencakup 0 sampai 7 hari', () => {
    assert.deepEqual(numbers(filterReceivables(rows, { q: '', age: 'soon' })), [
        'ORD-0005',
        'ORD-0012',
    ]);
});

test('pencarian tidak peka huruf besar, cocok nomor atau nama', () => {
    assert.deepEqual(
        numbers(filterReceivables(rows, { q: 'ord-001', age: 'all' })),
        ['ORD-0011', 'ORD-0012'],
    );
    assert.deepEqual(
        numbers(filterReceivables(rows, { q: 'BUDI', age: 'all' })),
        ['ORD-0005'],
    );
});

test('walk-in cocok dengan ketikan walk', () => {
    assert.deepEqual(
        numbers(filterReceivables(rows, { q: 'walk', age: 'all' })),
        ['ORD-0012'],
    );
});

test('filter lini dan umur digabung dengan AND', () => {
    assert.deepEqual(
        numbers(
            filterReceivables(rows, { q: '', line: 'event', age: 'overdue' }),
        ),
        ['ORD-0008'],
    );
    assert.deepEqual(
        numbers(
            filterReceivables(rows, { q: '', line: 'studio', age: 'soon' }),
        ),
        ['ORD-0005', 'ORD-0012'],
    );
});
