/**
 * Laporan — Margin per Lini (prompt 4.20, porting web/app/routes/laporan-margin.tsx).
 *
 * Output paling berharga bagi owner (business-flow bagian 7): **lini mana yang
 * sebenarnya menghasilkan uang.** Lini dengan omzet terbesar sering justru
 * marginnya paling tipis setelah fee crew dan transport. Kontras itu harus
 * langsung terbaca — karena itu kesimpulannya ditulis sebagai kalimat di atas
 * dan bar-nya menyandingkan omzet vs margin.
 */

import { Head } from '@inertiajs/react';
import { KepalaUang, TabelData } from '@/components/data-table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatPersen, formatRp } from '@/lib/format';
import { ReportNav } from '@/modules/finance/components/report-nav';
import { profitLoss } from '@/routes/reports';
import { LINE_COLOR, LINE_LABEL } from '@/types/domain';
import type { BusinessLine } from '@/types/domain';

interface LineRow {
    line: BusinessLine;
    revenue: number;
    direct_cost: number;
    margin: number;
    margin_ratio: number;
    share: number;
}

interface Props {
    month: string;
    lines: LineRow[];
    totals: {
        revenue: number;
        direct_cost: number;
        gross_profit: number;
        gross_margin: number;
    };
}

export default function Margin({ month, lines, totals }: Props) {
    const selling = lines.filter((l) => l.revenue > 0);
    const biggest = [...lines].sort((a, b) => b.share - a.share)[0];
    const thinnest = [...selling].sort(
        (a, b) => a.margin_ratio - b.margin_ratio,
    )[0];
    const fattest = [...selling].sort(
        (a, b) => b.margin_ratio - a.margin_ratio,
    )[0];

    // Skala bar disamakan terhadap omzet terbesar, bukan dinormalisasi per
    // baris — kalau tiap bar penuh, perbandingan antar lini (inti layar) hilang.
    const max = Math.max(...lines.map((l) => l.revenue), 1);

    return (
        <>
            <Head title="Margin per Lini" />
            <h1 className="sr-only">Margin per Lini</h1>

            <div className="flex flex-col gap-6 p-6">
                <ReportNav current="margin" month={month} />

                {biggest &&
                    thinnest &&
                    fattest &&
                    biggest.line === thinnest.line &&
                    biggest.line !== fattest.line && (
                        <Alert>
                            <AlertTitle>
                                {LINE_LABEL[biggest.line]} menyumbang{' '}
                                {formatPersen(biggest.share)} omzet tapi
                                marginnya paling tipis (
                                {formatPersen(biggest.margin_ratio)})
                            </AlertTitle>
                            <AlertDescription>
                                Sementara {LINE_LABEL[fattest.line]} cuma{' '}
                                {formatPersen(fattest.share)} omzet dengan
                                margin {formatPersen(fattest.margin_ratio)}.
                                Lini yang terlihat paling besar bukan yang
                                paling menguntungkan — selisihnya habis di fee
                                crew, transport, dan sewa.
                            </AlertDescription>
                        </Alert>
                    )}

                <section className="flex min-w-0 flex-col gap-4 rounded-lg border p-5">
                    <div className="flex items-baseline justify-between">
                        <h2 className="font-heading text-base font-semibold">
                            Omzet vs margin
                        </h2>
                        <span className="text-xs text-muted-foreground">
                            batang penuh = omzet · batang pekat = margin
                        </span>
                    </div>

                    <div className="flex flex-col gap-4">
                        {lines.map((l) => (
                            <div key={l.line} className="flex flex-col gap-1.5">
                                <div className="flex items-baseline justify-between text-sm">
                                    <span className="flex items-center gap-2 font-medium">
                                        <span
                                            className="size-2 rounded-full"
                                            style={{
                                                background: LINE_COLOR[l.line],
                                            }}
                                        />
                                        {LINE_LABEL[l.line]}
                                    </span>
                                    <span className="font-mono text-muted-foreground">
                                        {formatRp(l.revenue)} · margin{' '}
                                        {formatPersen(l.margin_ratio)}
                                    </span>
                                </div>
                                {/*
                                    Bar bersarang: margin adalah BAGIAN dari omzet,
                                    jadi tampil sebagai potongan di batang yang sama.
                                    color-mix, bukan opacity — opacity ikut memudarkan
                                    bar margin di dalamnya.
                                */}
                                <div className="h-6 w-full overflow-hidden rounded-md bg-muted">
                                    <div
                                        className="flex h-full items-center"
                                        style={{
                                            width: `${(l.revenue / max) * 100}%`,
                                            background: `color-mix(in oklch, ${LINE_COLOR[l.line]} 22%, transparent)`,
                                        }}
                                    >
                                        <div
                                            className="h-full"
                                            style={{
                                                width: `${l.revenue === 0 ? 0 : Math.max(0, (l.margin / l.revenue) * 100)}%`,
                                                background: LINE_COLOR[l.line],
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <TabelData>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Lini</TableHead>
                            <KepalaUang>Omzet</KepalaUang>
                            <KepalaUang>Share</KepalaUang>
                            <KepalaUang>Biaya Langsung</KepalaUang>
                            <KepalaUang>Margin</KepalaUang>
                            <KepalaUang>Margin %</KepalaUang>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {lines.map((l) => (
                            <TableRow key={l.line}>
                                <TableCell>
                                    <span className="flex items-center gap-2 font-medium">
                                        <span
                                            className="size-2 shrink-0 rounded-full"
                                            style={{
                                                background: LINE_COLOR[l.line],
                                            }}
                                        />
                                        {LINE_LABEL[l.line]}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {formatRp(l.revenue)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">
                                    {formatPersen(l.share)}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {formatRp(l.direct_cost)}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {formatRp(l.margin)}
                                </TableCell>
                                <TableCell className="text-right font-mono font-medium">
                                    {l.revenue === 0 ? (
                                        <span className="text-muted-foreground">
                                            —
                                        </span>
                                    ) : (
                                        formatPersen(l.margin_ratio)
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell className="font-semibold">
                                Total
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                                {formatRp(totals.revenue)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                                100%
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                                {formatRp(totals.direct_cost)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                                {formatRp(totals.gross_profit)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                                {formatPersen(totals.gross_margin)}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </TabelData>

                <p className="text-xs text-muted-foreground">
                    Biaya langsung Retail = HPP bahan dari katalog. Biaya
                    langsung Studio dan Event = biaya job yang dicatat per order
                    (fee crew, transport, sewa lokasi/alat). Biaya operasional
                    bulanan tidak dialokasikan ke lini mana pun — lihat Laba
                    Rugi.
                </p>
            </div>
        </>
    );
}

Margin.layout = {
    breadcrumbs: [{ title: 'Laporan', href: profitLoss() }],
};
