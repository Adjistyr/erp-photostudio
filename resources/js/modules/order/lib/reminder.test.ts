import assert from 'node:assert/strict';
import { test } from 'vitest';

import { formatTanggal } from '@/lib/format';
import { reminderMessage } from '@/modules/order/lib/reminder';

const template = 'Halo {nama}, sesi {tanggal} jam {jam} di {lokasi}. {xyz}';

test('reminder mengisi nama depan, tanggal, jam, lokasi; placeholder asing dibiarkan', () => {
    assert.equal(
        reminderMessage(template, {
            customer_name: 'Dewi Anggraini',
            service_date: '2026-10-10',
            service_time: '10:00',
            location: 'Studio',
        }),
        `Halo Dewi, sesi ${formatTanggal('2026-10-10')} jam 10:00 di Studio. {xyz}`,
    );
});

test('jam/lokasi kosong jadi kalimat wajar; walk-in disapa Kak', () => {
    assert.equal(
        reminderMessage(template, {
            customer_name: null,
            service_date: '2026-10-10',
            service_time: null,
            location: null,
        }),
        `Halo Kak, sesi ${formatTanggal('2026-10-10')} jam sesuai kesepakatan di studio. {xyz}`,
    );
});
