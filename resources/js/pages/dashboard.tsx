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
    CalendarDays,
    Clock,
    Target,
    TriangleAlert,
    Wallet,
    Wrench,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
import { dashboard } from '@/routes';
import { index as catalogIndex } from '@/routes/catalog';
import { index as ordersIndex } from '@/routes/orders';
import { index as receivablesIndex } from '@/routes/receivables';
import type { BusinessLine, PaymentStatus, WorkStatus } from '@/types/domain';

interface BookingRow {
    id: number;
    number: string;
    customer_name: string | null;
    business_line: BusinessLine;
    items_summary: string;
    service_time: string | null;
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
    days_until_due: number;
    payment_status: PaymentStatus;
    paid_percent: number;
}

interface Props {
    has_catalog: boolean;
    today: string;
    month: string;
    bookings_today: BookingRow[];
    revenue: number;
    receivables: {
        total: number;
        count: number;
        overdue: number;
        overdue_count: number;
        orders: ReceivableRow[];
    };
    break_even: {
        fixed_costs: number;
        gross_profit: number;
        shortfall: number;
        ratio: number;
    };
    due_maintenance: { asset_name: string; days_until: number }[];
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
                <div className="p-6">
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
            <h1 className="sr-only">Dashboard</h1>

            <div className="flex flex-col gap-6 p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Kpi
                        label="Booking hari ini"
                        value={String(bookings_today.length)}
                        note={formatTanggal(today)}
                        icon={CalendarDays}
                    />
                    <Kpi
                        label={`Omzet ${formatBulan(month)}`}
                        value={formatRp(revenue)}
                        note="uang diterima, basis kas"
                        icon={Wallet}
                    />
                    <Kpi
                        label="Piutang berjalan"
                        value={formatRp(receivables.total)}
                        note={`${receivables.count} order belum lunas`}
                        icon={Clock}
                    />
                    <Kpi
                        label="Lewat jatuh tempo"
                        value={formatRp(receivables.overdue)}
                        note={`${receivables.overdue_count} order perlu ditagih`}
                        icon={
                            receivables.overdue_count > 0
                                ? TriangleAlert
                                : undefined
                        }
                        urgent={receivables.overdue_count > 0}
                    />
                </div>

                <BreakEvenCard month={month} {...props.break_even} />

                {/*
                    Perbandingan yang tidak muncul di kartu mana pun kalau tidak
                    ditulis eksplisit: piutang lebih besar daripada omzet
                    sebulan. Di layar Pembayaran tagihan tampil sebagai baris
                    setara, jadi besarannya relatif terhadap omzet tak terlihat.
                */}
                {receivables.total > revenue && (
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
                            {formatRp(receivables.total)} menggantung, sementara
                            yang benar-benar masuk sepanjang{' '}
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
                            {props.due_maintenance.length} aset perlu dirawat
                        </AlertTitle>
                        <AlertDescription>
                            {props.due_maintenance
                                .map(
                                    (d) =>
                                        `${d.asset_name} — ${formatUmurPiutang(d.days_until)}`,
                                )
                                .join(' · ')}
                            .
                        </AlertDescription>
                    </Alert>
                )}

                <Section
                    title="Jadwal hari ini"
                    action={{ label: 'Semua order', href: ordersIndex() }}
                >
                    {bookings_today.length === 0 ? (
                        <KosongTabel kalimat="Tidak ada jadwal hari ini." />
                    ) : (
                        <TabelData>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>No</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Lini</TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Jam</TableHead>
                                    <TableHead>
                                        <WorkProgressLegend>
                                            Status Kerja
                                        </WorkProgressLegend>
                                    </TableHead>
                                    <TableHead>Status Bayar</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bookings_today.map((o) => (
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
                                        <TableCell className="font-mono whitespace-nowrap">
                                            {o.service_time ?? '—'}
                                        </TableCell>
                                        <TableCell>
                                            <WorkProgress
                                                status={o.work_status}
                                            />
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
                                            className={`whitespace-nowrap ${o.days_until_due < 0 ? 'text-destructive' : ''}`}
                                        >
                                            {formatUmurPiutang(
                                                o.days_until_due,
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
 * Kartu lebar sendiri, bukan KPI kelima: angkanya butuh pembanding (laba
 * kotor vs biaya tetap), dan bar progres membuat "sudah seberapa dekat"
 * terbaca tanpa menghitung.
 */
function BreakEvenCard({
    month,
    fixed_costs,
    gross_profit,
    shortfall,
    ratio,
}: Props['break_even'] & { month: string }) {
    return (
        <Card className="p-5">
            <CardHeader className="p-0">
                <CardDescription className="flex items-center gap-1.5 text-xs">
                    <Target className="size-3.5" />
                    Titik impas {formatBulan(month)}
                </CardDescription>
                <CardTitle className="font-heading text-base font-semibold">
                    {shortfall === 0
                        ? 'Biaya tetap bulan ini sudah tertutup'
                        : `Kurang ${formatRp(shortfall)} lagi untuk impas`}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 p-0">
                <Progress
                    value={Math.min(100, Math.max(0, Math.round(ratio * 100)))}
                    aria-label="Laba kotor terhadap biaya tetap"
                />
                <p className="font-mono text-xs text-muted-foreground">
                    Laba kotor {formatRp(gross_profit)} dari biaya tetap{' '}
                    {formatRp(fixed_costs)} · {formatPersen(ratio)}
                </p>
                <p className="text-xs text-muted-foreground">
                    Biaya tetap = biaya operasional + dana maintenance.
                    Dibandingkan dengan laba kotor, bukan omzet — omzet event
                    yang habis untuk fee crew tidak ikut menutup sewa.
                </p>
            </CardContent>
        </Card>
    );
}

function Kpi({
    label,
    value,
    note,
    icon: Icon,
    urgent,
}: {
    label: string;
    value: string;
    note: string;
    icon?: ComponentType<{ className?: string }>;
    urgent?: boolean;
}) {
    return (
        <Card className="p-5">
            <CardHeader className="p-0">
                <CardDescription className="flex items-center gap-1.5 text-xs">
                    {Icon && (
                        <Icon
                            className={
                                urgent
                                    ? 'size-3.5 text-destructive'
                                    : 'size-3.5'
                            }
                        />
                    )}
                    {label}
                </CardDescription>
                {/*
                    Angka KPI 30px/600 mono (R2): empat kartu berderet punya
                    lebar digit sama, jadi angka besar dan kecil tetap sejajar.
                */}
                <CardTitle
                    className={`font-mono text-3xl font-semibold ${urgent ? 'text-destructive' : ''}`}
                >
                    {value}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <p className="text-xs text-muted-foreground">{note}</p>
            </CardContent>
        </Card>
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
        <section className="flex min-w-0 flex-col gap-3">
            <div className="flex items-center justify-between">
                <h2 className="font-heading text-base font-semibold">
                    {title}
                </h2>
                <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={action.href} />}
                >
                    {action.label}
                    <ArrowRight data-icon="inline-end" />
                </Button>
            </div>
            {children}
        </section>
    );
}
