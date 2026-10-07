import assert from 'node:assert/strict';
import { test } from 'vitest';

import { formatRp, formatTanggal } from '@/lib/format';
import { describeEvent } from './types';
import type { OrderEvent } from './types';

function event(
    type: OrderEvent['type'],
    changes: OrderEvent['changes'],
): OrderEvent {
    return {
        id: 1,
        type,
        changes,
        user_name: 'Agung',
        at: '2026-08-26T09:00:00+07:00',
    };
}

test('status maju: label dari → ke', () => {
    assert.equal(
        describeEvent(
            event('advanced', {
                work_status: { from: 'booking', to: 'scheduled' },
            }),
        ),
        'Status Booking → Dijadwalkan',
    );
});

test('diubah: dua field dipisah " · ", tanggal diformat', () => {
    const teks = describeEvent(
        event('updated', {
            service_date: { from: '2026-10-12', to: '2026-10-19' },
            location: { from: 'Studio', to: 'Rumah customer' },
        }),
    );
    assert.equal(
        teks,
        `Tanggal ${formatTanggal('2026-10-12')} → ${formatTanggal('2026-10-19')} · Lokasi Studio → Rumah customer`,
    );
});

test('pembayaran dicatat: nominal dan metode', () => {
    assert.equal(
        describeEvent(
            event('payment_recorded', {
                amount: { from: null, to: 500000 },
                method: { from: null, to: 'transfer' },
                paid_on: { from: null, to: '2026-08-26' },
            }),
        ),
        `Pembayaran ${formatRp(500000)} (Transfer) dicatat`,
    );
});

test('field tidak dikenal tampil apa adanya, tidak throw', () => {
    assert.equal(
        describeEvent(event('updated', { foo: { from: 1, to: 2 } })),
        'foo: 1 → 2',
    );
    assert.equal(describeEvent(event('refunded', null)), 'Pengembalian');
});
