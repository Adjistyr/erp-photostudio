/**
 * Navigasi bulan "‹ › Agustus 2026" untuk layar per bulan (Kalender, Biaya,
 * nanti Laporan). Bulan hidup di URL (`?month=`), bukan state: pindah bulan =
 * pindah URL, bisa dibagikan/di-bookmark, dan server yang memfilter.
 */

import { Link } from '@inertiajs/react';
import type { InertiaLinkProps } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBulan, tambahBulan } from '@/lib/format';

export function MonthNav({
    month,
    href,
}: {
    /** "YYYY-MM" */
    month: string;
    /** URL layar untuk bulan tertentu, mis. `(m) => expensesIndex({ query: { month: m } })`. */
    href: (month: string) => NonNullable<InertiaLinkProps['href']>;
}) {
    const shift = (n: number) => tambahBulan(`${month}-01`, n).slice(0, 7);

    return (
        <div className="flex items-center gap-2">
            <Button
                size="icon"
                variant="outline"
                aria-label="Bulan sebelumnya"
                nativeButton={false}
                render={<Link href={href(shift(-1))} preserveScroll />}
            >
                <ChevronLeft />
            </Button>
            <Button
                size="icon"
                variant="outline"
                aria-label="Bulan berikutnya"
                nativeButton={false}
                render={<Link href={href(shift(1))} preserveScroll />}
            >
                <ChevronRight />
            </Button>
            <h2 className="font-heading text-base font-semibold">
                {formatBulan(month)}
            </h2>
        </div>
    );
}
