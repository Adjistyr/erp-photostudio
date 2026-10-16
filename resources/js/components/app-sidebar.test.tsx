import { describe, expect, it } from 'vitest';
import { navGroupsFor } from './app-sidebar';

describe('navGroupsFor', () => {
    it('admin tidak melihat Laporan dan Modal & Bagi Hasil', () => {
        const items = navGroupsFor({ view_finance: false }).flatMap((g) =>
            g.items.map((i) => i.title),
        );
        expect(items).not.toContain('Laporan');
        expect(items).not.toContain('Modal & Bagi Hasil');
        // Grup Keluaran tetap ada untuk Invoice & Komunikasi.
        expect(items).toContain('Invoice');
        expect(items).toContain('Komunikasi');
    });

    it('owner melihat keduanya; urutan grup R8 tetap', () => {
        const groups = navGroupsFor({ view_finance: true });
        expect(groups.map((g) => g.label)).toEqual([
            'Harian',
            'Data',
            'Keluaran',
        ]);
        expect(groups[2].items.map((i) => i.title)).toEqual([
            'Invoice',
            'Komunikasi',
            'Laporan',
            'Modal & Bagi Hasil',
        ]);
    });

    it('admin: grup tetap tiga dengan urutan yang sama', () => {
        expect(
            navGroupsFor({ view_finance: false }).map((g) => g.label),
        ).toEqual(['Harian', 'Data', 'Keluaran']);
    });
});
