/**
 * Navigasi antar-laporan + pilihan bulan. Satu baris di atas kelima laporan
 * supaya owner berpindah Laba Rugi → Margin → Penjualan tanpa kembali ke menu;
 * bulan yang sedang dilihat ikut terbawa (Piutang selalu per hari ini).
 */

import { Link } from '@inertiajs/react';
import { MonthNav } from '@/components/month-nav';
import { Button } from '@/components/ui/button';
import { cash, margin, profitLoss, receivables, sales } from '@/routes/reports';

type Report = 'profit-loss' | 'margin' | 'sales' | 'cash' | 'receivables';

// Empat laporan bulanan berkelompok; Piutang (per hari ini) tetap terakhir.
const REPORTS: Report[] = [
    'profit-loss',
    'margin',
    'sales',
    'cash',
    'receivables',
];

const MONTHLY = { 'profit-loss': profitLoss, margin, sales, cash } as const;

const LABEL: Record<Report, string> = {
    'profit-loss': 'Laba Rugi',
    margin: 'Margin per Lini',
    sales: 'Penjualan',
    cash: 'Kas Harian',
    receivables: 'Piutang',
};

export function ReportNav({
    current,
    month,
}: {
    current: Report;
    month: string;
}) {
    const hrefOf = (r: Report) =>
        r === 'receivables' ? receivables() : MONTHLY[r]({ query: { month } });

    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <nav className="flex flex-wrap gap-1" aria-label="Laporan">
                {REPORTS.map((r) => (
                    <Button
                        key={r}
                        size="sm"
                        variant={r === current ? 'secondary' : 'ghost'}
                        aria-current={r === current ? 'page' : undefined}
                        nativeButton={false}
                        render={<Link href={hrefOf(r)} />}
                    >
                        {LABEL[r]}
                    </Button>
                ))}
            </nav>
            {current !== 'receivables' && (
                <MonthNav
                    month={month}
                    href={(m) => MONTHLY[current]({ query: { month: m } })}
                />
            )}
        </div>
    );
}
