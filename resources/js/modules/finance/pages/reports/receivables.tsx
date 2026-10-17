/**
 * Laporan — Piutang (prompt 4.22, porting web/app/routes/laporan-piutang.tsx).
 *
 * Bedanya dengan layar Pembayaran: di sana tagihan tampil sebagai baris
 * setara, jadi RISIKO-nya tidak terlihat. Layar ini untuk tiga angka yang
 * hanya muncul kalau dihitung relatif — piutang vs omzet sebulan, konsentrasi
 * per lini, konsentrasi per customer — ditulis sebagai kalimat di atas.
 */

import { Head } from '@inertiajs/react';
import {
    KepalaUang,
    KosongTabel,
    SelKode,
    SelUang,
    TabelData,
} from '@/components/data-table';
import { Notice, PageHeader, Panel } from '@/components/page';
import { LineMark, PaymentBadge } from '@/components/status-order';
import { Progress } from '@/components/ui/progress';
import {
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatPersen, formatRp, formatUmurPiutang } from '@/lib/format';
import { ReportNav } from '@/modules/finance/components/report-nav';
import { installmentShort } from '@/modules/order';
import type { NextInstallment } from '@/modules/order';
import { profitLoss } from '@/routes/reports';
import { LINE_COLOR, LINE_LABEL } from '@/types/domain';
import type { BusinessLine, PaymentStatus } from '@/types/domain';

interface Props {
    month: string;
    revenue: number;
    total: number;
    aging: { label: string; count: number; amount: number; share: number }[];
    by_line: { line: BusinessLine; amount: number; share: number }[];
    orders: {
        id: number;
        number: string;
        customer_name: string | null;
        business_line: BusinessLine;
        balance: number;
        /** Umur dari jatuh tempo efektif — termin berikutnya bila ada (spek 6.4). */
        days_until_due: number;
        next_installment: NextInstallment | null;
        payment_status: PaymentStatus;
        paid_percent: number;
    }[];
}

export default function ReceivablesReport({
    month,
    revenue,
    total,
    aging,
    by_line,
    orders,
}: Props) {
    const topLine = [...by_line].sort((a, b) => b.share - a.share)[0];
    const topOrder = orders[0];

    return (
        <>
            <Head title="Laporan Piutang" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Laporan Piutang"
                    description="Risiko tagihan yang menggantung, per hari ini."
                />
                <ReportNav current="receivables" month={month} />

                {orders.length === 0 || !topOrder || !topLine ? (
                    // Piutang kosong itu KABAR BAIK (R7).
                    <KosongTabel
                        nada="baik"
                        kalimat="Tidak ada tagihan tertunggak."
                    />
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                            <Highlight
                                figure={
                                    revenue > 0
                                        ? formatPersen(total / revenue)
                                        : formatRp(total)
                                }
                                title={
                                    revenue > 0
                                        ? 'dari omzet bulan ini'
                                        : 'menggantung, belum ada omzet masuk bulan ini'
                                }
                                body={
                                    revenue > 0
                                        ? `${formatRp(total)} menggantung, sementara yang benar-benar masuk sepanjang bulan ${formatRp(revenue)}.`
                                        : 'Semua uang dari pekerjaan yang sudah berjalan masih di tagihan, belum di rekening.'
                                }
                            />
                            <Highlight
                                figure={formatPersen(topLine.share)}
                                title={`piutang ada di lini ${LINE_LABEL[topLine.line]}`}
                                body={`${formatRp(topLine.amount)} dari total ${formatRp(total)}.`}
                            />
                            <Highlight
                                figure={formatPersen(topOrder.balance / total)}
                                title="menumpuk pada satu customer"
                                body={`${topOrder.customer_name ?? 'Walk-in'} — ${topOrder.number}. Kalau tagihan ini tertunda, sebagian besar piutang ikut tertunda.`}
                            />
                        </div>

                        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[3fr_2fr]">
                            <Panel title="Kelompok umur" flush>
                                <TabelData>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Kelompok</TableHead>
                                            <TableHead className="text-right">
                                                Order
                                            </TableHead>
                                            <KepalaUang>Nilai</KepalaUang>
                                            <TableHead>Share</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {aging.map((b) => (
                                            <TableRow
                                                key={b.label}
                                                className={
                                                    b.amount === 0
                                                        ? 'opacity-60'
                                                        : ''
                                                }
                                            >
                                                <TableCell className="font-medium">
                                                    {b.label}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {b.count}
                                                </TableCell>
                                                <SelUang nominal={b.amount} />
                                                <TableCell>
                                                    {/* Mata membaca panjang lebih cepat daripada
                                                        membandingkan empat angka persen. */}
                                                    <span className="flex items-center gap-2">
                                                        <Progress
                                                            value={Math.round(
                                                                b.share * 100,
                                                            )}
                                                            className="w-24"
                                                            aria-label={`Share ${b.label}`}
                                                        />
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatPersen(
                                                                b.share,
                                                            )}
                                                        </span>
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell className="font-semibold">
                                                Total
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {orders.length}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {formatRp(total)}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                100%
                                            </TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </TabelData>
                                <div className="px-1.5 pb-1.5">
                                    <Notice>
                                        Tagihan yang jatuh tempo tepat hari ini
                                        dihitung belum lewat — sama dengan kartu
                                        "Lewat jatuh tempo" di layar Pembayaran.
                                    </Notice>
                                </div>
                            </Panel>

                            <Panel title="Per lini">
                                <div className="flex flex-col gap-4">
                                    {by_line.map((l) => (
                                        <div
                                            key={l.line}
                                            className="flex flex-col gap-1.5"
                                        >
                                            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                                                <span className="flex items-center gap-2 font-medium">
                                                    <span
                                                        className="size-2 rounded-full"
                                                        style={{
                                                            background:
                                                                LINE_COLOR[
                                                                    l.line
                                                                ],
                                                        }}
                                                    />
                                                    {LINE_LABEL[l.line]}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    {formatRp(l.amount)} ·{' '}
                                                    {formatPersen(l.share)}
                                                </span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${l.share * 100}%`,
                                                        background:
                                                            LINE_COLOR[l.line],
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Panel>
                        </div>

                        <Panel
                            title="Rincian"
                            aside={`${orders.length} order`}
                            flush
                        >
                            <TabelData>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>No</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Lini</TableHead>
                                        <KepalaUang>Sisa</KepalaUang>
                                        <TableHead>Share</TableHead>
                                        <TableHead>Umur</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.map((o) => (
                                        <TableRow key={o.id}>
                                            <SelKode>{o.number}</SelKode>
                                            <TableCell className="font-medium whitespace-nowrap">
                                                {o.customer_name ?? 'Walk-in'}
                                            </TableCell>
                                            <TableCell>
                                                <LineMark
                                                    line={o.business_line}
                                                />
                                            </TableCell>
                                            <SelUang nominal={o.balance} />
                                            <TableCell className="text-muted-foreground">
                                                {formatPersen(
                                                    o.balance / total,
                                                )}
                                            </TableCell>
                                            <TableCell
                                                className={`whitespace-nowrap ${o.days_until_due < 0 ? 'text-destructive' : ''}`}
                                            >
                                                {formatUmurPiutang(
                                                    o.days_until_due,
                                                )}
                                                {o.next_installment && (
                                                    <span className="block text-xs text-muted-foreground">
                                                        {installmentShort(
                                                            o.next_installment,
                                                        )}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <PaymentBadge
                                                    status={o.payment_status}
                                                    paidPercent={o.paid_percent}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </TabelData>
                        </Panel>
                    </>
                )}
            </div>
        </>
    );
}

ReceivablesReport.layout = {
    breadcrumbs: [{ title: 'Laporan', href: profitLoss() }],
};

/**
 * Satu angka risiko + kalimat yang menjelaskannya. Panel biasa, bukan Alert:
 * ini bacaan rutin, bukan peringatan — kalau ketiganya berbingkai peringatan,
 * yang benar-benar mendesak kehilangan bobotnya.
 */
function Highlight({
    figure,
    title,
    body,
}: {
    figure: string;
    title: string;
    body: string;
}) {
    return (
        <Panel label={`${figure} ${title}`}>
            <div className="flex flex-col gap-1.5">
                <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[30px] leading-tight font-medium tracking-[-0.02em] whitespace-nowrap">
                        {figure}
                    </span>
                    <span className="text-sm font-medium">{title}</span>
                </p>
                <p className="text-sm text-muted-foreground">{body}</p>
            </div>
        </Panel>
    );
}
