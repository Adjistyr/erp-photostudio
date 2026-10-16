/**
 * Dashboard (prompt 4.13, porting web/app/routes/dashboard.tsx).
 *
 * Layar pembuka: apa yang menunggu owner hari ini, dan uang mana yang
 * menggantung. Urutan kartu mengikuti urgensi, bukan besaran angka — piutang
 * lewat jatuh tempo paling kanan justru karena itu yang paling menuntut
 * tindakan, dan mata berhenti di ujung baris.
 */

import { Head, Link } from '@inertiajs/react';
import type { InertiaLinkProps } from '@inertiajs/react';
import {
    ArrowRight,
    BookCheck,
    CalendarClock,
    Target,
    TriangleAlert,
    Wrench,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
    KepalaUang,
    KosongTabel,
    SelKode,
    SelUang,
    TabelData,
} from '@/components/data-table';
import {
    LineMark,
    PaymentBadge,
    WorkProgress,
    WorkProgressLegend,
} from '@/components/status-order';
import { Notice, PageHeader, Panel } from '@/components/page';
import { SummaryCard } from '@/components/summary-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { WhatsAppButton } from '@/components/whatsapp-button';
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    formatBulan,
    formatPersen,
    formatRp,
    formatTanggal,
    formatUmurPiutang,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import { installmentShort } from '@/modules/order';
import type { NextInstallment } from '@/modules/order';
import { reminderMessage } from '@/modules/order/lib/reminder';
import { dashboard } from '@/routes';
import { index as assetsIndex } from '@/routes/assets';
import { index as capitalIndex } from '@/routes/capital';
import { index as catalogIndex } from '@/routes/catalog';
import {
    calendar as ordersCalendar,
    index as ordersIndex,
} from '@/routes/orders';
import { index as receivablesIndex } from '@/routes/receivables';
import type { BusinessLine, PaymentStatus, WorkStatus } from '@/types/domain';

interface BookingRow {
    id: number;
    number: string;
    customer_name: string | null;
    customer_phone: string | null;
    business_line: BusinessLine;
    items_summary: string;
    service_date: string;
    service_time: string | null;
    location: string | null;
    work_status: WorkStatus;
    payment_status: PaymentStatus;
    paid_percent: number;
}

interface ReceivableRow {
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
}

/**
 * Field finansial opsional: tidak dikirim untuk admin (spek 5.1) — kartu &
 * peringatannya dirender dari ada-tidaknya field.
 */
interface Props {
    has_catalog: boolean;
    /** Bulan lalu yang belum tutup buku → bagi hasilnya belum final. Hanya owner. */
    unclosed_month?: string | null;
    today: string;
    month: string;
    bookings_today: BookingRow[];
    /** Reminder H-1 (spek 3.5). */
    bookings_tomorrow: BookingRow[];
    /** Template `reminder` (editan owner di Komunikasi), belum dipersonalisasi. */
    reminder_template: string;
    /** Hanya owner. */
    revenue?: number;
    receivables: {
        total: number;
        count: number;
        overdue: number;
        overdue_count: number;
        orders: ReceivableRow[];
    };
    /** Hanya owner. */
    break_even?: {
        fixed_costs: number;
        gross_profit: number;
        shortfall: number;
        ratio: number;
    };
    due_maintenance: { asset_name: string; days_until: number }[];
    /** Proyeksi penggantian 6 bulan (spek 6.2 / 8.3). */
    replacements_due_count: number;
    /** Kekurangan dana maintenance — hanya owner. */
    replacements_shortfall?: number;
    /** Peminjaman alat lewat rencana kembali (spek 8.4). */
    overdue_checkouts_count: number;
}

export default function Dashboard(props: Props) {
    const { today, month, bookings_today, revenue, receivables } = props;

    /**
     * Dashboard bergantung pada Katalog: tanpa item tidak ada yang bisa dijual
     * dan semua angka nol. Empty state mengarahkan ke Katalog, bukan
     * menawarkan aksi yang belum bisa dijalankan (R7).
     */
    if (!props.has_catalog) {
        return (
            <>
                <Head title="Dashboard" />
                <div className="flex flex-col gap-6 p-4 md:p-6">
                    <PageHeader title="Dashboard" />
                    <KosongTabel
                        kalimat="Belum ada data. Mulai dengan mengisi katalog produk dan jasa."
                        aksi={{ label: 'Isi Katalog', ke: catalogIndex() }}
                    />
                </div>
            </>
        );
    }

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Dashboard"
                    description={`Yang menunggu hari ini, ${formatTanggal(today)}.`}
                />

                {/* Admin tidak menerima omzet: tiga kartu, tanpa slot kosong. */}
                <div
                    className={cn(
                        'grid grid-cols-1 gap-4',
                        revenue !== undefined
                            ? 'sm:grid-cols-2 xl:grid-cols-4'
                            : 'lg:grid-cols-3',
                    )}
                >
                    <SummaryCard
                        label="Booking hari ini"
                        value={String(bookings_today.length)}
                        note={formatTanggal(today)}
                    />
                    {revenue !== undefined && (
                        <SummaryCard
                            label={`Omzet ${formatBulan(month)}`}
                            value={formatRp(revenue)}
                            note="uang diterima, basis kas"
                        />
                    )}
                    <SummaryCard
                        label="Piutang berjalan"
                        value={formatRp(receivables.total)}
                        note={`${receivables.count} order belum lunas`}
                    />
                    <SummaryCard
                        label="Lewat jatuh tempo"
                        value={formatRp(receivables.overdue)}
                        note={`${receivables.overdue_count} order perlu ditagih`}
                        urgent={receivables.overdue_count > 0}
                    />
                </div>

                {props.break_even && (
                    <BreakEvenPanel month={month} {...props.break_even} />
                )}

                {/*
                    Peringatan dikumpulkan rapat (gap-3) supaya terbaca satu
                    kelompok; `empty:hidden` membuang jaraknya bila tidak ada
                    satu pun yang aktif.
                */}
                <div className="flex flex-col gap-3 empty:hidden">
                    {/*
                    Pengingat tutup buku: tanpa ini bagi hasil bulan lalu tidak
                    pernah final, dan transaksi bulan itu masih bisa berubah.
                */}
                    {props.unclosed_month && (
                        <Alert>
                            <BookCheck />
                            <AlertTitle>
                                {formatBulan(props.unclosed_month)} belum tutup
                                buku
                            </AlertTitle>
                            <AlertDescription>
                                Pastikan semua transaksi bulan itu sudah
                                tercatat, lalu tutup buku supaya bagi hasilnya
                                final.{' '}
                                <Link
                                    href={capitalIndex()}
                                    className="font-medium text-foreground underline underline-offset-2"
                                >
                                    Buka Modal & Bagi Hasil
                                </Link>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/*
                    Perbandingan yang tidak muncul di kartu mana pun kalau tidak
                    ditulis eksplisit: piutang lebih besar daripada omzet
                    sebulan. Di layar Pembayaran tagihan tampil sebagai baris
                    setara, jadi besarannya relatif terhadap omzet tak terlihat.
                */}
                    {revenue !== undefined && receivables.total > revenue && (
                        <Alert>
                            <TriangleAlert />
                            <AlertTitle>
                                {/* Omzet 0 (awal bulan): persen tak terdefinisi,
                                tapi peringatannya justru paling relevan. */}
                                {revenue > 0
                                    ? `Piutang ${formatPersen(receivables.total / revenue)} dari omzet bulan ini`
                                    : 'Belum ada uang masuk bulan ini, tapi piutang menggantung'}
                            </AlertTitle>
                            <AlertDescription>
                                {formatRp(receivables.total)} menggantung,
                                sementara yang benar-benar masuk sepanjang{' '}
                                {formatBulan(month)} {formatRp(revenue)}. Lebih
                                banyak uang di tagihan daripada di rekening.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/*
                    Perawatan alat ikut di Dashboard karena Dashboard adalah "apa
                    yang menunggu owner hari ini". Kalau hanya di layar Aset,
                    jadwalnya baru terlihat saat owner kebetulan membuka layar
                    itu — biasanya setelah alatnya bermasalah.
                */}
                    {props.due_maintenance.length > 0 && (
                        <Alert>
                            <Wrench />
                            <AlertTitle>
                                {props.due_maintenance.length} aset perlu
                                dirawat
                            </AlertTitle>
                            <AlertDescription>
                                {props.due_maintenance
                                    .map(
                                        (d) =>
                                            `${d.asset_name} — ${formatUmurPiutang(d.days_until)}`,
                                    )
                                    .join(' · ')}
                                .{' '}
                                <Link
                                    href={assetsIndex()}
                                    className="font-medium text-foreground underline underline-offset-2"
                                >
                                    Buka Aset & Maintenance
                                </Link>
                            </AlertDescription>
                        </Alert>
                    )}

                    {props.overdue_checkouts_count > 0 && (
                        <Alert variant="destructive">
                            <TriangleAlert />
                            <AlertTitle>
                                {props.overdue_checkouts_count} peminjaman alat
                                belum kembali
                            </AlertTitle>
                            <AlertDescription>
                                Sudah lewat rencana kembali.{' '}
                                <Link
                                    href={assetsIndex()}
                                    className="font-medium underline underline-offset-2"
                                >
                                    Lihat di Aset
                                </Link>
                            </AlertDescription>
                        </Alert>
                    )}

                    {props.replacements_due_count > 0 && (
                        <Alert>
                            <CalendarClock />
                            <AlertTitle>
                                {props.replacements_due_count} alat habis umur
                                ekonomis dalam 6 bulan
                            </AlertTitle>
                            <AlertDescription>
                                {props.replacements_shortfall === undefined
                                    ? ''
                                    : props.replacements_shortfall > 0
                                      ? `Dana maintenance kurang ${formatRp(props.replacements_shortfall)} untuk menggantinya (perkiraan dari harga beli).`
                                      : 'Dana maintenance cukup untuk menggantinya.'}{' '}
                                <Link
                                    href={assetsIndex()}
                                    className="font-medium text-foreground underline underline-offset-2"
                                >
                                    Lihat di Aset
                                </Link>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <Section
                    title="Jadwal hari ini"
                    action={{ label: 'Semua order', href: ordersIndex() }}
                >
                    {bookings_today.length === 0 ? (
                        <KosongTabel kalimat="Tidak ada jadwal hari ini." />
                    ) : (
                        <BookingTable rows={bookings_today} />
                    )}
                </Section>

                {/* Reminder H-1: pesan dari template Reminder di Komunikasi,
                    dikirim manual — admin tidak perlu bolak-balik Kalender →
                    Customer → Komunikasi. */}
                <Section
                    title="Jadwal besok"
                    action={{ label: 'Kalender', href: ordersCalendar() }}
                >
                    {props.bookings_tomorrow.length === 0 ? (
                        <KosongTabel kalimat="Tidak ada jadwal besok." />
                    ) : (
                        <BookingTable
                            rows={props.bookings_tomorrow}
                            reminderTemplate={props.reminder_template}
                        />
                    )}
                </Section>

                <Section
                    title="Perlu ditagih"
                    action={{
                        label: 'Semua piutang',
                        href: receivablesIndex(),
                    }}
                >
                    {receivables.orders.length === 0 ? (
                        <KosongTabel
                            nada="baik"
                            kalimat="Tidak ada tagihan tertunggak."
                        />
                    ) : (
                        <TabelData>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>No</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Lini</TableHead>
                                    <KepalaUang>Sisa</KepalaUang>
                                    <TableHead>Umur</TableHead>
                                    <TableHead>Status Bayar</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {receivables.orders.map((o) => (
                                    <TableRow key={o.id}>
                                        <SelKode>{o.number}</SelKode>
                                        <TableCell className="font-medium">
                                            {o.customer_name ?? 'Walk-in'}
                                        </TableCell>
                                        <TableCell>
                                            <LineMark line={o.business_line} />
                                        </TableCell>
                                        <SelUang nominal={o.balance} />
                                        <TableCell
                                            className={cn(
                                                'whitespace-nowrap',
                                                o.days_until_due < 0 &&
                                                    'text-destructive',
                                            )}
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
                    )}
                </Section>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};

/**
 * Titik impas bulan berjalan — pengganti "HPP per hari" di sheet client.
 *
 * Panel lebar sendiri, bukan KPI kelima: angkanya butuh pembanding (laba
 * kotor vs biaya tetap), dan bar progres membuat "sudah seberapa dekat"
 * terbaca tanpa menghitung.
 */
function BreakEvenPanel({
    month,
    fixed_costs,
    gross_profit,
    shortfall,
    ratio,
}: NonNullable<Props['break_even']> & { month: string }) {
    return (
        <Panel
            title={
                <>
                    <Target
                        className="size-4 text-muted-foreground"
                        aria-hidden
                    />
                    Titik impas {formatBulan(month)}
                </>
            }
            aside={formatPersen(ratio)}
        >
            <div className="flex flex-col gap-3">
                <p className="text-[15px] font-medium">
                    {shortfall === 0
                        ? 'Biaya tetap bulan ini sudah tertutup'
                        : `Kurang ${formatRp(shortfall)} lagi untuk impas`}
                </p>
                <Progress
                    value={Math.min(100, Math.max(0, Math.round(ratio * 100)))}
                    aria-label="Laba kotor terhadap biaya tetap"
                />
                <p className="text-xs text-muted-foreground">
                    Laba kotor {formatRp(gross_profit)} dari biaya tetap{' '}
                    {formatRp(fixed_costs)} · {formatPersen(ratio)}
                </p>
                <Notice>
                    Biaya tetap = biaya operasional + dana maintenance.
                    Dibandingkan dengan laba kotor, bukan omzet — omzet event
                    yang habis untuk fee crew tidak ikut menutup sewa.
                </Notice>
            </div>
        </Panel>
    );
}

function Section({
    title,
    action,
    children,
}: {
    title: string;
    action: { label: string; href: NonNullable<InertiaLinkProps['href']> };
    children: ReactNode;
}) {
    return (
        <Panel
            title={title}
            aside={
                <Link
                    href={action.href}
                    className="inline-flex items-center gap-1 text-[13px] font-medium whitespace-nowrap text-brand hover:underline"
                >
                    {action.label}
                    <ArrowRight className="size-3.5" aria-hidden />
                </Link>
            }
            flush
        >
            {children}
        </Panel>
    );
}

/**
 * Tabel jadwal (hari ini / besok). Dengan `reminderTemplate`, tiap baris
 * punya tombol WA berisi pesan reminder yang sudah terisi.
 */
function BookingTable({
    rows,
    reminderTemplate,
}: {
    rows: BookingRow[];
    reminderTemplate?: string;
}) {
    return (
        <TabelData>
            <TableHeader>
                <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Lini</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Jam</TableHead>
                    <TableHead>
                        <WorkProgressLegend>Status Kerja</WorkProgressLegend>
                    </TableHead>
                    <TableHead>Status Bayar</TableHead>
                    {reminderTemplate !== undefined && <TableHead />}
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.map((o) => (
                    <TableRow key={o.id}>
                        <SelKode>{o.number}</SelKode>
                        <TableCell className="font-medium">
                            {o.customer_name ?? 'Walk-in'}
                        </TableCell>
                        <TableCell>
                            <LineMark line={o.business_line} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                            {o.items_summary}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                            {o.service_time ?? '—'}
                        </TableCell>
                        <TableCell>
                            <WorkProgress status={o.work_status} />
                        </TableCell>
                        <TableCell>
                            <PaymentBadge
                                status={o.payment_status}
                                paidPercent={o.paid_percent}
                            />
                        </TableCell>
                        {reminderTemplate !== undefined && (
                            <TableCell className="w-10">
                                <WhatsAppButton
                                    phone={o.customer_phone}
                                    message={reminderMessage(
                                        reminderTemplate,
                                        o,
                                    )}
                                    label={`Ingatkan ${o.customer_name ?? o.number} via WhatsApp`}
                                />
                            </TableCell>
                        )}
                    </TableRow>
                ))}
            </TableBody>
        </TabelData>
    );
}
