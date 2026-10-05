import { describe, expect, it } from 'vitest';
import { isWithinPath, pathOf } from './url';

describe('pathOf', () => {
    it('membuang origin, query, dan hash', () => {
        expect(pathOf('http://localhost/orders?month=2026-08#x')).toBe(
            '/orders',
        );
        expect(pathOf('/reports/margin?month=2026-08')).toBe('/reports/margin');
    });

    it('membuang garis miring di akhir, kecuali root', () => {
        expect(pathOf('/orders/')).toBe('/orders');
        expect(pathOf('/')).toBe('/');
    });
});

describe('isWithinPath', () => {
    it('cocok untuk halaman itu sendiri dan sub-halamannya', () => {
        expect(isWithinPath('/orders', '/orders')).toBe(true);
        expect(isWithinPath('/orders', '/orders/calendar')).toBe(true);
        expect(isWithinPath('/reports', '/reports/margin')).toBe(true);
    });

    it('tidak cocok untuk path yang hanya berawalan sama', () => {
        // Bug lama: startsWith mentah membuat /order menyala di /orderan.
        expect(isWithinPath('/order', '/orderan')).toBe(false);
        expect(isWithinPath('/reports', '/reports-archive')).toBe(false);
        expect(isWithinPath('/receivables', '/reports/receivables')).toBe(
            false,
        );
    });

    it('root hanya cocok dengan root, bukan induk semua halaman', () => {
        expect(isWithinPath('/', '/')).toBe(true);
        expect(isWithinPath('/', '/orders')).toBe(false);
    });

    it('mengabaikan query dan garis miring di akhir di kedua sisi', () => {
        expect(isWithinPath('/reports?month=2026-08', '/reports/sales/')).toBe(
            true,
        );
    });
});
