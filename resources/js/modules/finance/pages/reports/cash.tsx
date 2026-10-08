/**
 * Laporan — Kas Harian (spek 3.3). Untuk tutup hari: laci kas dicocokkan
 * dengan kolom Tunai, mutasi rekening dengan Transfer dan QRIS. Penerimaan
 * saja; pengeluaran ada di Biaya.
 *
 * Hari tanpa pembayaran tidak ditampilkan — 31 baris dengan 20 baris nol
 * menyulitkan pencocokan.
 */

import { Head } from '@inertiajs/react';
import {
    KepalaUang,
    KosongTabel,
    SelUang,
    TabelData,
} from '@/components/data-table';
import { SummaryCard } from '@/components/summary-card';
import { Badge } from '@/components/ui/badge';
import {
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatPersen, formatRp, formatTanggal } from '@/lib/format';
import { ReportNav } from '@/modules/finance/components/report-nav';
import { PAYMENT_METHOD_LABEL } from '@/modules/order';
import type { PaymentMethod } from '@/modules/order';
import { profitLoss } from '@/routes/reports';

interface Props {
    month: string;
    /** YYYY-MM-DD — baris hari ini disorot. */
    today: string;
    /** Urutan kolom dari server (enum PaymentMethod). */
    methods: PaymentMethod[];
    days: {
        date: string;
        by_method: Record<PaymentMethod, number>;
        total: number;
        count: number;
    }[];
    totals: Record<PaymentMethod, number>;
    total: number;
    count: number;
    /** 0..1 per metode; semua 0 bila belum ada penerimaan. */
    shares: Record<PaymentMethod, number>;
}

export default function CashReport({
    month,
    today,
    methods,
    days,
    totals,
    total,
    count,
    shares,
}: Props) {
    return (
        <>
            <Head title="Kas Harian" />
            <h1 className="sr-only">Kas Harian</h1>

            <div className="flex flex-col gap-6 p-6">
                <ReportNav current="cash" month={month} />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {methods.map((m) => (
                        <SummaryCard
                            key={m}
                            label={PAYMENT_METHOD_LABEL[m]}
                            value={formatRp(totals[m])}
                            note={
                                total > 0
                                    ? `${formatPersen(shares[m])} dari penerimaan bulan ini`
                                    : 'Belum ada penerimaan'
                            }
                        />
                    ))}
                </div>

                {days.length === 0 ? (
                    <KosongTabel kalimat="Belum ada penerimaan bulan ini." />
                ) : (
                    <TabelData>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tanggal</TableHead>
                                {methods.map((m) => (
                                    <KepalaUang key={m}>
                                        {PAYMENT_METHOD_LABEL[m]}
                                    </KepalaUang>
                                ))}
                                <KepalaUang>Total</KepalaUang>
                                <TableHead className="text-right">
                                    Transaksi
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {days.map((d) => (
                                <TableRow
                                    key={d.date}
                                    className={
                                        d.date === today ? 'bg-muted/50' : ''
                                    }
                                >
                                    <TableCell className="whitespace-nowrap">
                                        {formatTanggal(d.date)}
                                        {d.date === today && (
                                            <Badge
                                                variant="secondary"
                                                className="ml-2"
                                            >
                                                Hari ini
                                            </Badge>
                                        )}
                                    </TableCell>
                                    {methods.map((m) => (
                                        <SelUang
                                            key={m}
                                            nominal={d.by_method[m]}
                                        />
                                    ))}
                                    <SelUang
                                        nominal={d.total}
                                        className="font-semibold"
                                    />
                                    <TableCell className="text-right font-mono">
                                        {d.count}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell className="font-semibold">
                                    Total bulan
                                </TableCell>
                                {methods.map((m) => (
                                    <TableCell
                                        key={m}
                                        className="text-right font-mono font-semibold"
                                    >
                                        {formatRp(totals[m])}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right font-mono font-semibold">
                                    {formatRp(total)}
                                </TableCell>
                                <TableCell className="text-right font-mono font-semibold">
                                    {count}
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </TabelData>
                )}

                <p className="text-xs text-muted-foreground">
                    Penerimaan berdasarkan tanggal bayar (basis kas) — totalnya
                    sama dengan omzet di Laba Rugi. Pembayaran order batal ikut
                    dihitung: uangnya sudah masuk.
                </p>
            </div>
        </>
    );
}

CashReport.layout = {
    breadcrumbs: [{ title: 'Laporan', href: profitLoss() }],
};
