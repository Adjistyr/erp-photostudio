/**
 * Laporan — Laba Rugi (prompt 4.19, porting web/app/routes/laporan.tsx).
 *
 * Layar yang dibawa ke client untuk mengunci keputusan **basis kas vs akrual**
 * (stitch-prompts.md bagian 7). Karena itu Alert basis kas dipasang di atas,
 * SEBELUM angka apa pun: kalau client melihat angka rugi lebih dulu,
 * percakapannya jadi soal kerugian, padahal yang harus diputuskan adalah cara
 * mengakui pendapatan.
 */

import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import {
    formatBulan,
    formatPersen,
    formatRp,
    formatTanggal,
    kelasRp,
} from '@/lib/format';
import { ReportNav } from '@/modules/finance/components/report-nav';
import { index as capitalIndex } from '@/routes/capital';
import { index as receivablesIndex } from '@/routes/receivables';
import { profitLoss } from '@/routes/reports';
import { LINE_COLOR, LINE_LABEL } from '@/types/domain';
import type { BusinessLine } from '@/types/domain';

interface Props {
    month: string;
    statement: {
        revenue_by_line: { line: BusinessLine; amount: number }[];
        total_revenue: number;
        material_cost: number;
        job_cost: number;
        total_direct_cost: number;
        gross_profit: number;
        gross_margin: number;
        operating: {
            id: number;
            category: string;
            description: string;
            amount: number;
        }[];
        total_operating: number;
        maintenance_allocation: number;
        net_profit: number;
    };
    profit_share: {
        net_profit: number;
        final: boolean;
        deduction: number;
        distributable: number;
        reserve: number;
        reserve_percent: number;
        shares: { owner_name: string; percent: number; amount: number }[];
        accumulated_loss: number;
        next_month: string;
    } | null;
    cash_basis_example: {
        number: string;
        paid_in_month: number;
        service_date: string;
    } | null;
}

export default function ProfitLoss({
    month,
    statement: s,
    profit_share,
    cash_basis_example,
}: Props) {
    const fixedCosts = s.total_operating + s.maintenance_allocation;

    return (
        <>
            <Head title="Laba Rugi" />
            <h1 className="sr-only">Laba Rugi</h1>

            <div className="flex flex-col gap-6 p-6">
                <ReportNav current="profit-loss" month={month} />

                {/*
                    Alert ini bukan hiasan — dia yang membuat client sadar basis
                    kas itu PILIHAN, bukan fakta. Mengubahnya belakangan mengubah
                    seluruh angka historis (business-flow bagian 7).
                */}
                <Alert>
                    <Info />
                    <AlertTitle>Laporan ini memakai basis kas</AlertTitle>
                    <AlertDescription>
                        Omzet diakui saat uang diterima, bukan saat jasa selesai
                        dikerjakan.
                        {cash_basis_example && (
                            <>
                                {' '}
                                Contohnya di bulan ini:{' '}
                                {formatRp(
                                    cash_basis_example.paid_in_month,
                                )}{' '}
                                untuk {cash_basis_example.number} masuk omzet{' '}
                                {formatBulan(month)} walaupun acaranya{' '}
                                {formatTanggal(cash_basis_example.service_date)}
                                .
                            </>
                        )}{' '}
                        Dipilih supaya angka laporan cocok dengan mutasi
                        rekening. Kalau basisnya diganti ke akrual, seluruh
                        angka di halaman ini berubah.
                    </AlertDescription>
                </Alert>

                <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[1fr_20rem]">
                    <section className="flex min-w-0 flex-col gap-4 rounded-lg border p-5">
                        <h2 className="font-heading text-base font-semibold">
                            {formatBulan(month)}
                        </h2>

                        <Table className="[&_td]:px-0 [&_td]:py-2">
                            <TableBody>
                                <Heading>Omzet</Heading>
                                {s.revenue_by_line.map(({ line, amount }) => (
                                    <Detail
                                        key={line}
                                        label={LINE_LABEL[line]}
                                        amount={amount}
                                        color={LINE_COLOR[line]}
                                    />
                                ))}
                                <Total
                                    label="Total Omzet"
                                    amount={s.total_revenue}
                                />

                                <Heading>Biaya Langsung</Heading>
                                <Detail
                                    label="HPP bahan produk"
                                    amount={s.material_cost}
                                />
                                <Detail
                                    label="Biaya job (crew, transport, sewa)"
                                    amount={s.job_cost}
                                />
                                <Total
                                    label="Total Biaya Langsung"
                                    amount={s.total_direct_cost}
                                />

                                <Total
                                    label="Laba Kotor"
                                    amount={s.gross_profit}
                                    note={formatPersen(s.gross_margin)}
                                    bold
                                />

                                <Heading>Biaya Operasional</Heading>
                                {s.operating.map((e) => (
                                    <Detail
                                        key={e.id}
                                        label={e.category}
                                        amount={e.amount}
                                    />
                                ))}
                                <Total
                                    label="Total Biaya Operasional"
                                    amount={s.total_operating}
                                />

                                {/*
                                    Baris sendiri, bukan rincian operasional: ini
                                    dana yang DISISIHKAN, bukan uang keluar. Servis
                                    alat dibayar dari saldonya dan tidak muncul lagi
                                    di sini (business-flow 8.2).
                                */}
                                <Heading>Dana Disisihkan</Heading>
                                <Detail
                                    label="Alokasi dana maintenance"
                                    amount={s.maintenance_allocation}
                                />
                            </TableBody>
                        </Table>

                        <Separator />

                        <div className="flex items-baseline justify-between">
                            <span className="font-heading text-base font-semibold">
                                Laba Bersih
                            </span>
                            <span
                                className={`font-mono text-3xl font-semibold ${kelasRp(s.net_profit)}`}
                            >
                                {formatRp(s.net_profit)}
                            </span>
                        </div>

                        {profit_share && (
                            <ProfitShareBlock
                                month={month}
                                share={profit_share}
                            />
                        )}
                    </section>

                    <aside className="flex min-w-0 flex-col gap-4">
                        {/*
                            Kesimpulan ditulis sebagai kalimat. Rugi di awal bisnis
                            bukan tanda gagal — biaya tetap sebulan penuh bertemu
                            omzet yang baru terkumpul sebagian. Kalau tidak
                            dijelaskan, angka merahnya jadi satu-satunya yang diingat.
                        */}
                        <div className="flex flex-col gap-2 rounded-lg border p-5">
                            <h3 className="text-sm font-semibold">
                                Cara membacanya
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Laba kotor {formatRp(s.gross_profit)} (
                                {formatPersen(s.gross_margin)})
                                {s.gross_profit > 0
                                    ? ' — operasional jual-beli dan jasanya untung.'
                                    : ' — biaya langsung belum tertutup omzet.'}
                            </p>
                            {s.net_profit < 0 && s.gross_margin > 0 && (
                                <p className="text-sm text-muted-foreground">
                                    Yang membuat bulan ini rugi adalah biaya
                                    tetap {formatRp(fixedCosts)} — operasional
                                    plus dana maintenance. Titik balik ada di
                                    omzet sekitar{' '}
                                    <span className="font-mono text-foreground">
                                        {formatRp(
                                            Math.ceil(
                                                fixedCosts /
                                                    s.gross_margin /
                                                    100_000,
                                            ) * 100_000,
                                        )}
                                    </span>{' '}
                                    per bulan pada margin yang sama.
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col gap-2 rounded-lg border p-5">
                            <h3 className="text-sm font-semibold">
                                Yang tidak ada di sini
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Pekerjaan yang sudah dikerjakan tapi belum
                                dibayar penuh tidak muncul sebagai omzet di
                                basis kas. Angkanya ada di Piutang.
                            </p>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="self-start"
                                nativeButton={false}
                                render={<Link href={receivablesIndex()} />}
                            >
                                Lihat piutang
                                <ArrowRight data-icon="inline-end" />
                            </Button>
                        </div>
                    </aside>
                </div>
            </div>
        </>
    );
}

ProfitLoss.layout = {
    breadcrumbs: [{ title: 'Laporan', href: profitLoss() }],
};

/**
 * Bagi hasil di bawah laba bersih (business-flow 8.5): pertanyaan pertama
 * owner setelah melihat laba adalah "masing-masing dapat berapa", dan
 * jawabannya harus di tempat yang sama dengan angka yang membentuknya.
 */
function ProfitShareBlock({
    month,
    share,
}: {
    month: string;
    share: NonNullable<Props['profit_share']>;
}) {
    return (
        <div className="flex flex-col gap-2">
            <Table className="[&_td]:px-0 [&_td]:py-2">
                <TableBody>
                    <Heading>
                        Bagi Hasil
                        {share.final ? '' : ' (sementara — bulan berjalan)'}
                    </Heading>
                    {share.deduction > 0 && (
                        <Detail
                            label="Kompensasi rugi & pinjaman owner"
                            amount={-share.deduction}
                        />
                    )}
                    <Total
                        label="Laba yang dibagi"
                        amount={share.distributable}
                    />
                    <Detail
                        label={`Dana cadangan ${share.reserve_percent}%`}
                        amount={share.reserve}
                    />
                    {share.shares.map((o) => (
                        <Detail
                            key={o.owner_name}
                            label={`${o.owner_name} ${o.percent}%`}
                            amount={o.amount}
                        />
                    ))}
                </TableBody>
            </Table>
            {share.net_profit < 0 && (
                <p className="text-sm text-muted-foreground">
                    Tidak ada bagi hasil {formatBulan(month)}. Rugi{' '}
                    {formatRp(share.accumulated_loss)} dibawa ke{' '}
                    {formatBulan(share.next_month)} dan ditutup dulu sebelum
                    laba berikutnya dibagi.
                </p>
            )}
            <Button
                variant="ghost"
                size="sm"
                className="self-start"
                nativeButton={false}
                render={<Link href={capitalIndex()} />}
            >
                Modal & Bagi Hasil
                <ArrowRight data-icon="inline-end" />
            </Button>
        </div>
    );
}

function Heading({ children }: { children: ReactNode }) {
    return (
        <TableRow className="hover:bg-transparent">
            <TableCell
                colSpan={2}
                className="pt-5 text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
                {children}
            </TableCell>
        </TableRow>
    );
}

function Detail({
    label,
    amount,
    color,
}: {
    label: string;
    amount: number;
    color?: string;
}) {
    return (
        <TableRow className="hover:bg-transparent">
            <TableCell className="pl-4 text-sm">
                <span className="flex items-center gap-2">
                    {color && (
                        <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ background: color }}
                        />
                    )}
                    {label}
                </span>
            </TableCell>
            <TableCell
                className={`text-right font-mono text-sm ${kelasRp(amount)}`}
            >
                {formatRp(amount)}
            </TableCell>
        </TableRow>
    );
}

function Total({
    label,
    amount,
    note,
    bold,
}: {
    label: string;
    amount: number;
    note?: string;
    bold?: boolean;
}) {
    return (
        <TableRow className="border-t hover:bg-transparent">
            <TableCell
                className={
                    bold ? 'text-sm font-semibold' : 'text-sm font-medium'
                }
            >
                {label}
                {note && (
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {note}
                    </span>
                )}
            </TableCell>
            <TableCell
                className={`text-right font-mono ${bold ? 'text-base font-semibold' : 'text-sm font-medium'} ${kelasRp(amount)}`}
            >
                {formatRp(amount)}
            </TableCell>
        </TableRow>
    );
}
