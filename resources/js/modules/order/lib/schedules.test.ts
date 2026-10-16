import assert from 'node:assert/strict';
import { test } from 'vitest';

import { formatRp } from '@/lib/format';
import { billingValues } from '@/modules/order/components/invoice-document';
import {
    geserHari,
    installmentShort,
    scheduleSum,
    schedulesPayload,
    schedulesWillDrop,
    splitThree,
} from '@/modules/order/lib/schedules';
import { describeEvent } from '@/modules/order/types';

test('Bagi 3 membulatkan ke rupiah, sisa ke termin terakhir → Σ = total', () => {
    const rows = splitThree(1_000_003, '2026-11-03', '2026-08-26');
    assert.deepEqual(
        rows.map((r) => [r.label, r.due_on, Number(r.amount)]),
        [
            ['DP', '2026-08-26', 300_001],
            ['Termin 2', '2026-10-27', 500_002],
            ['Pelunasan', '2026-11-02', 200_000],
        ],
    );
    assert.equal(scheduleSum(rows), 1_000_003);
    // Kunci unik — React key baris editor.
    assert.equal(new Set(rows.map((r) => r.key)).size, 3);
});

test('geserHari melintasi bulan dan tahun', () => {
    assert.equal(geserHari('2026-03-01', -1), '2026-02-28');
    assert.equal(geserHari('2026-12-31', 1), '2027-01-01');
});

test('payload: nominal angka, label dirapikan', () => {
    assert.deepEqual(
        schedulesPayload([
            { key: 1, due_on: '2026-09-01', amount: '1500000', label: ' DP ' },
            { key: 2, due_on: '2026-10-01', amount: '', label: '' },
        ]),
        [
            { due_on: '2026-09-01', amount: 1_500_000, label: 'DP' },
            { due_on: '2026-10-01', amount: 0, label: '' },
        ],
    );
});

test('aturan 5: termin dihapus hanya bila total berubah DAN Σ termin ≠ total baru', () => {
    const rows = [{ amount: '6000000' }, { amount: '4000000' }];
    // Total tetap → tidak dihapus.
    assert.equal(schedulesWillDrop(true, 10_000_000, 10_000_000, rows), false);
    // Total berubah, termin lama tidak lagi pas → dihapus.
    assert.equal(schedulesWillDrop(true, 10_000_000, 10_500_000, rows), true);
    // Termin sudah diatur ulang ke total baru → tetap.
    assert.equal(schedulesWillDrop(true, 9_000_000, 10_000_000, rows), false);
    // Order tanpa termin sebelumnya → selisih ditolak server, bukan dihapus.
    assert.equal(schedulesWillDrop(false, 9_000_000, 10_500_000, rows), false);
});

test('placeholder {termin} terisi untuk order bertermin, kosong tanpa termin', () => {
    const base = {
        customer_name: 'Sinta Prameswari',
        order_number: 'ORD-0011',
        balance: 6_000_000,
        due_on: '2026-11-12',
        public_url: 'https://x/i/11',
    };
    const filled = billingValues({
        ...base,
        next_installment: {
            sequence: 2,
            of: 3,
            amount: 5_000_000,
            due_on: '2026-11-12',
        },
    });
    assert.equal(
        filled.termin,
        `termin 2 dari 3 — ${formatRp(5_000_000)} jatuh tempo 12 Nov 2026`,
    );
    assert.equal(filled.jatuh_tempo, '12 Nov 2026');

    assert.equal(billingValues({ ...base, next_installment: null }).termin, '');
});

test('baris termin di Pembayaran: "Termin 2/3 · sisa termin" tanpa mengulang tanggal', () => {
    assert.equal(
        installmentShort({
            sequence: 2,
            of: 3,
            amount: 5_000_000,
            due_on: '2026-11-12',
        }),
        `Termin 2/3 · ${formatRp(5_000_000)}`,
    );
});

test('riwayat order: perubahan termin terbaca, hapus termin jadi "—"', () => {
    const teks = describeEvent({
        id: 1,
        type: 'updated',
        user_name: null,
        at: '2026-08-26T09:00:00+07:00',
        changes: {
            schedules: {
                from: [
                    { due_on: '2026-09-01', amount: 4_000_000, label: 'DP' },
                    { due_on: '2026-10-01', amount: 6_000_000, label: null },
                ],
                to: null,
            },
        },
    });
    assert.equal(
        teks,
        `Termin ${formatRp(4_000_000)} (1 Sep 2026), ${formatRp(6_000_000)} (1 Okt 2026) → —`,
    );
});
