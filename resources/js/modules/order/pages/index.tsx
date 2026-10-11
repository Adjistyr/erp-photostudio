/**
 * Order & Booking — daftar + detail (prompt 4.5 & 4.7, porting
 * web/app/routes/order.tsx).
 *
 * Layar dengan aturan paling banyak sekaligus: dua dimensi status, badge DP
 * berpersentase, baris Batal opacity 60%, legenda titik progres, kolom uang
 * mono rata kanan. Detail dulu Sheet (R9); sejak spek 7.4 halaman penuh
 * (`show.tsx`) — keputusan user: Sheet terlalu sempit dan tombol Ubah tersembunyi.
 */

import { Head, Link, router } from '@inertiajs/react';
import { CalendarDays, Download, Plus } from 'lucide-react';
import OrderController from '@/actions/Modules/Order/Controllers/OrderController';
import {
    KepalaUang,
    KosongTabel,
    SelKode,
    SelUang,
    TabelData,
} from '@/components/data-table';
import {
    ListToolbar,
    cleanQuery,
    hasActiveFilter,
} from '@/components/list-toolbar';
import type { ListFilterDef, ListFilters } from '@/components/list-toolbar';
import { PageActions } from '@/components/page-actions';
import { Pagination } from '@/components/pagination';
import type { Paginated } from '@/components/pagination';
import {
    LineMark,
    PaymentBadge,
    RefundBadge,
    WorkProgress,
    WorkProgressLegend,
    orderRowClass,
} from '@/components/status-order';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatJadwal } from '@/lib/format';
import {
    calendar as ordersCalendar,
    create as ordersCreate,
    exportMethod as ordersExport,
    index as ordersIndex,
} from '@/routes/orders';
import {
    BUSINESS_LINES,
    LINE_LABEL,
    PAYMENT_STATUS_LABEL,
    WORK_STATUS_LABEL,
} from '@/types/domain';
import type { PaymentStatus, WorkStatus } from '@/types/domain';
import { scheduleOf } from '@/modules/order/types';
import type { OrderRow } from '@/modules/order/types';

const PAY_STATUSES: PaymentStatus[] = ['unpaid', 'partial', 'paid'];
const WORK_STATUSES = Object.keys(WORK_STATUS_LABEL) as WorkStatus[];

/** Filter daftar order (spek 3.1) — nilainya divalidasi ulang di server. */
const ORDER_FILTERS: ListFilterDef[] = [
    {
        key: 'line',
        label: 'Lini',
        options: BUSINESS_LINES.map((l) => ({
            value: l,
            label: LINE_LABEL[l],
        })),
    },
    {
        key: 'status',
        label: 'Status kerja',
        options: WORK_STATUSES.map((s) => ({
            value: s,
            label: WORK_STATUS_LABEL[s],
        })),
    },
    {
        key: 'pay',
        label: 'Status bayar',
        options: PAY_STATUSES.map((s) => ({
            value: s,
            label: PAYMENT_STATUS_LABEL[s],
        })),
    },
];

export default function OrdersIndex({
    orders,
    filters,
}: {
    orders: Paginated<OrderRow>;
    /** Filter aktif dari URL (spek 3.1) — tampil lagi setelah reload. */
    filters: ListFilters;
}) {
    // Filter hidup di URL, bukan state: bisa dibagikan, tombol kembali jalan.
    const go = (next: ListFilters) =>
        router.get(
            ordersIndex({ query: cleanQuery(next) }).url,
            {},
            { preserveState: true, preserveScroll: true, replace: true },
        );
    const visible = orders.data;
    const filtered = hasActiveFilter(filters);

    return (
        <>
            <Head title="Order & Booking" />
            <h1 className="sr-only">Order & Booking</h1>

            <PageActions>
                {/* <a href>, bukan Link: Inertia tidak menangani unduhan.
                    Filter yang terlihat = yang diekspor. */}
                <Button
                    variant="outline"
                    nativeButton={false}
                    title="Mengekspor sesuai filter yang aktif"
                    render={
                        <a
                            href={
                                ordersExport({ query: cleanQuery(filters) }).url
                            }
                        />
                    }
                >
                    <Download data-icon="inline-start" />
                    Ekspor CSV
                </Button>
                <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={ordersCalendar()} />}
                >
                    <CalendarDays data-icon="inline-start" />
                    Kalender
                </Button>
                <Button
                    nativeButton={false}
                    render={<Link href={ordersCreate()} />}
                >
                    <Plus data-icon="inline-start" />
                    Buat Order
                </Button>
            </PageActions>

            <div className="flex flex-col gap-6 p-6">
                <ListToolbar
                    value={filters}
                    filters={ORDER_FILTERS}
                    onChange={go}
                    total={{ count: orders.total, noun: 'order' }}
                >
                    {/* Rentang tanggal layanan — <input type="date"> bawaan. */}
                    <Input
                        type="date"
                        aria-label="Dari tanggal"
                        className="w-auto"
                        value={filters.from ?? ''}
                        onChange={(e) =>
                            go({
                                ...filters,
                                from: e.target.value || undefined,
                            })
                        }
                    />
                    <Input
                        type="date"
                        aria-label="Sampai tanggal"
                        className="w-auto"
                        value={filters.to ?? ''}
                        onChange={(e) =>
                            go({ ...filters, to: e.target.value || undefined })
                        }
                    />
                </ListToolbar>

                {visible.length === 0 ? (
                    filtered ? (
                        <KosongTabel
                            kalimat="Tidak ada order yang cocok."
                            aksi={{
                                label: 'Hapus filter',
                                onClick: () => go({ q: '' }),
                            }}
                        />
                    ) : (
                        <KosongTabel
                            kalimat="Belum ada order. Order studio dan event akan muncul di sini."
                            aksi={{ label: 'Buat Order', ke: ordersCreate() }}
                        />
                    )
                ) : (
                    <TabelData>
                        <TableHeader>
                            <TableRow>
                                <TableHead>No</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Lini</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead>Jadwal</TableHead>
                                {/*
                                    "Dibayar" sengaja tidak di sini: sepuluh
                                    kolom tidak muat di laptop 1280px, dan nilainya
                                    terbaca dari Total × persen badge DP. Yang
                                    menuntut tindakan adalah Sisa.
                                */}
                                <KepalaUang>Total</KepalaUang>
                                <KepalaUang>Sisa</KepalaUang>
                                <TableHead>
                                    <WorkProgressLegend>
                                        Status Kerja
                                    </WorkProgressLegend>
                                </TableHead>
                                <TableHead>Status Bayar</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map((o) => (
                                <TableRow
                                    key={o.id}
                                    className={`cursor-pointer ${orderRowClass(o.work_status)}`}
                                    onClick={() =>
                                        router.visit(OrderController.show(o.id))
                                    }
                                >
                                    {/* Link untuk keyboard & buka di tab baru; baris tetap bisa diklik. */}
                                    <SelKode>
                                        <Link
                                            href={OrderController.show(o.id)}
                                            className="hover:underline"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {o.number}
                                        </Link>
                                    </SelKode>
                                    <TableCell className="font-medium whitespace-nowrap">
                                        {o.customer_name ?? (
                                            <span className="text-muted-foreground">
                                                Walk-in
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <LineMark line={o.business_line} />
                                    </TableCell>
                                    <TableCell
                                        className="max-w-36 truncate text-muted-foreground"
                                        title={o.items_summary}
                                    >
                                        {o.items_summary}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        {formatJadwal(scheduleOf(o))}
                                    </TableCell>
                                    <SelUang nominal={o.total} />
                                    {/* Order Batal tidak ditagih lagi — nominal dicoret, bukan disembunyikan, supaya sisa yang hangus tetap terbaca. */}
                                    <SelUang
                                        nominal={o.balance}
                                        className={
                                            o.work_status === 'cancelled'
                                                ? 'line-through'
                                                : ''
                                        }
                                    />
                                    <TableCell>
                                        <WorkProgress status={o.work_status} />
                                    </TableCell>
                                    <TableCell>
                                        <span className="flex items-center gap-1">
                                            <PaymentBadge
                                                status={o.payment_status}
                                                paidPercent={o.paid_percent}
                                            />
                                            <RefundBadge
                                                amount={o.total_refunded}
                                            />
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </TabelData>
                )}

                <Pagination
                    page={orders}
                    noun="order"
                    href={(page) =>
                        ordersIndex({
                            query: {
                                ...cleanQuery(filters),
                                page: String(page),
                            },
                        }).url
                    }
                />
            </div>
        </>
    );
}

OrdersIndex.layout = {
    breadcrumbs: [{ title: 'Order & Booking', href: ordersIndex() }],
};
