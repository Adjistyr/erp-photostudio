/**
 * Order & Booking — daftar + detail (prompt 4.5 & 4.7, porting
 * web/app/routes/order.tsx).
 *
 * Layar dengan aturan paling banyak sekaligus: dua dimensi status, badge DP
 * berpersentase, baris Batal opacity 60%, legenda titik progres, kolom uang
 * mono rata kanan. Detail memakai Sheet, bukan halaman (R9): owner membuka-
 * tutup beberapa order berurutan saat menagih tanpa kehilangan posisi scroll.
 */

import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowRight, CalendarDays, Plus } from 'lucide-react';
import { useState } from 'react';
import OrderController from '@/actions/Modules/Order/Controllers/OrderController';
import {
    KELAS_DENSITY,
    KepalaUang,
    KosongTabel,
    SelKode,
    SelUang,
    TabelData,
} from '@/components/data-table';
import InputError from '@/components/input-error';
import { PageActions } from '@/components/page-actions';
import { PaymentDialog } from '@/modules/order/components/payment-dialog';
import {
    LineMark,
    PaymentBadge,
    WorkProgress,
    WorkProgressLegend,
    orderRowClass,
} from '@/components/status-order';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    formatJadwal,
    formatPersen,
    formatRp,
    formatTanggal,
    kelasRp,
} from '@/lib/format';
import {
    calendar as ordersCalendar,
    create as ordersCreate,
    index as ordersIndex,
} from '@/routes/orders';
import { BUSINESS_LINES, LINE_LABEL, WORK_STATUS_LABEL } from '@/types/domain';
import type { BusinessLine } from '@/types/domain';
import { PAYMENT_METHOD_LABEL, scheduleOf } from '@/modules/order/types';
import type { OrderRow } from '@/modules/order/types';

type Filter = 'all' | BusinessLine;

export default function OrdersIndex({ orders }: { orders: OrderRow[] }) {
    const [filter, setFilter] = useState<Filter>('all');
    // Simpan id, bukan objek: setelah aksi, Sheet membaca data terbaru dari props.
    const [detailId, setDetailId] = useState<number | null>(null);
    const [payingId, setPayingId] = useState<number | null>(null);

    const visible =
        filter === 'all'
            ? orders
            : orders.filter((o) => o.business_line === filter);
    const detail = orders.find((o) => o.id === detailId) ?? null;
    const paying = orders.find((o) => o.id === payingId) ?? null;

    return (
        <>
            <Head title="Order & Booking" />
            <h1 className="sr-only">Order & Booking</h1>

            <PageActions>
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
                <Tabs
                    value={filter}
                    onValueChange={(v) => {
                        if (v === 'all') return setFilter('all');
                        const line = BUSINESS_LINES.find((l) => l === v);
                        if (line) setFilter(line);
                    }}
                >
                    <TabsList>
                        <TabsTrigger value="all">Semua</TabsTrigger>
                        {(['studio', 'event', 'retail'] as const).map((l) => (
                            <TabsTrigger key={l} value={l}>
                                {LINE_LABEL[l]}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                {visible.length === 0 ? (
                    <KosongTabel
                        kalimat="Belum ada order. Order studio dan event akan muncul di sini."
                        aksi={{ label: 'Buat Order', ke: ordersCreate() }}
                    />
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
                                    onClick={() => setDetailId(o.id)}
                                >
                                    <SelKode>{o.number}</SelKode>
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
            </div>

            <OrderSheet
                order={detail}
                onClose={() => setDetailId(null)}
                onPay={(o) => setPayingId(o.id)}
            />
            {paying && (
                // key memuat sisa: membuka order yang sama setelah mencatat DP
                // harus prefill sisa yang baru, bukan yang lama.
                <PaymentDialog
                    key={`${paying.id}-${paying.balance}`}
                    order={paying}
                    onClose={() => setPayingId(null)}
                />
            )}
        </>
    );
}

OrdersIndex.layout = {
    breadcrumbs: [{ title: 'Order & Booking', href: ordersIndex() }],
};

function OrderSheet({
    order,
    onClose,
    onPay,
}: {
    order: OrderRow | null;
    onClose: () => void;
    onPay: (o: OrderRow) => void;
}) {
    return (
        <Sheet open={order !== null} onOpenChange={(o) => !o && onClose()}>
            {/* Lebar ber-prefix varian sama dengan bawaan sheet — lihat
                docs/development.md, gotcha lebar Sheet. */}
            <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-2xl">
                {order && <OrderDetail order={order} onPay={onPay} />}
            </SheetContent>
        </Sheet>
    );
}

function OrderDetail({
    order,
    onPay,
}: {
    order: OrderRow;
    onPay: (o: OrderRow) => void;
}) {
    return (
        <>
            <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                    <span className="font-mono">{order.number}</span>
                    <PaymentBadge
                        status={order.payment_status}
                        paidPercent={order.paid_percent}
                    />
                </SheetTitle>
                <SheetDescription>
                    {order.customer_name ?? 'Walk-in'} ·{' '}
                    {formatJadwal(scheduleOf(order))}
                    {order.location ? ` · ${order.location}` : ''}
                </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-6 p-4">
                <StatusControl order={order} />

                {order.notes && (
                    <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-line">
                        {order.notes}
                    </div>
                )}

                <Section title="Item">
                    <Table className={KELAS_DENSITY}>
                        <TableBody>
                            {order.items.map((i) => (
                                <TableRow key={i.id}>
                                    <TableCell className="font-medium">
                                        {i.name}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-muted-foreground">
                                        {i.quantity} × {formatRp(i.unit_price)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        {formatRp(i.quantity * i.unit_price)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Section>

                <Section title="Pembayaran">
                    {order.payments.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">
                            Belum ada pembayaran diterima.
                        </p>
                    ) : (
                        <Table className={KELAS_DENSITY}>
                            <TableBody>
                                {order.payments.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell>{p.note}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatTanggal(p.paid_on)} ·{' '}
                                            {PAYMENT_METHOD_LABEL[p.method]}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {formatRp(p.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    <div className="flex flex-col gap-1 px-3 pt-2 text-sm">
                        <Line
                            label="Total order"
                            value={formatRp(order.total)}
                        />
                        <Line
                            label="Sudah dibayar"
                            value={formatRp(order.paid)}
                        />
                        <div className="flex justify-between font-medium">
                            {order.work_status === 'cancelled' ? (
                                <span className="text-muted-foreground">
                                    Sisa — tidak ditagih (batal)
                                </span>
                            ) : (
                                <span>Sisa tagihan</span>
                            )}
                            <span
                                className={`font-mono ${
                                    order.work_status === 'cancelled'
                                        ? 'text-muted-foreground line-through'
                                        : order.balance > 0
                                          ? ''
                                          : 'text-success'
                                }`}
                            >
                                {formatRp(order.balance)}
                            </span>
                        </div>
                    </div>
                </Section>

                <Section title="Biaya job & margin">
                    {order.job_costs.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">
                            Belum ada biaya langsung untuk order ini.
                        </p>
                    ) : (
                        <Table className={KELAS_DENSITY}>
                            <TableBody>
                                {order.job_costs.map((j) => (
                                    <TableRow key={j.id}>
                                        <TableCell>{j.category}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {j.description}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {formatRp(j.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    {/*
                        Margin per order di sini, bukan cuma di laporan agregat:
                        angka ini yang membuat owner memutuskan paket sejenis
                        masih layak dijual dengan harga yang sama.
                    */}
                    <div className="flex justify-between px-3 pt-2 text-sm font-medium">
                        <span>Margin job</span>
                        <span className={`font-mono ${kelasRp(order.margin)}`}>
                            {formatRp(order.margin)}
                            {order.total > 0 &&
                                order.work_status !== 'cancelled' && (
                                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                                        {formatPersen(
                                            order.margin / order.total,
                                        )}
                                    </span>
                                )}
                        </span>
                    </div>
                    {/* Order batal: sisa tagihan tidak akan pernah masuk, jadi
                        margin dari uang yang diterima — sama dengan Laba Rugi. */}
                    {order.work_status === 'cancelled' && (
                        <p className="px-3 pb-1 text-xs text-muted-foreground">
                            Order batal — dihitung dari uang yang diterima (
                            {formatRp(order.paid)}), bukan total order.
                        </p>
                    )}
                </Section>

                <ResultLink
                    key={`${order.id}-${order.work_status}`}
                    order={order}
                />

                <div className="flex flex-wrap gap-2">
                    {/* Dialog untuk order INI, bukan melempar ke layar Piutang. */}
                    <Button
                        disabled={
                            order.balance <= 0 ||
                            order.work_status === 'cancelled'
                        }
                        onClick={() => onPay(order)}
                    >
                        Catat Pembayaran
                    </Button>
                    {order.invoice_url && (
                        <Button
                            variant="outline"
                            nativeButton={false}
                            render={
                                <a
                                    href={order.invoice_url}
                                    target="_blank"
                                    rel="noreferrer"
                                />
                            }
                        >
                            Lihat Invoice
                        </Button>
                    )}
                    {order.work_status !== 'cancelled' && (
                        <CancelOrder order={order} />
                    )}
                </div>
            </div>
        </>
    );
}

/**
 * Status kerja — SATU-SATUNYA status yang diinput manual, hanya maju satu
 * langkah. Langkah berikutnya ditentukan server (`next_status`). Status bayar
 * tidak punya kontrol di mana pun: ia turunan pembayaran.
 */
function StatusControl({ order }: { order: OrderRow }) {
    const next = order.next_status;

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
            <WorkProgress status={order.work_status} />
            <div className="flex items-center gap-2">
                <LineMark line={order.business_line} />
                {next && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                            router.patch(
                                OrderController.advance(order.id).url,
                                {},
                                { preserveScroll: true },
                            )
                        }
                    >
                        Lanjut ke {WORK_STATUS_LABEL[next]}
                        <ArrowRight data-icon="inline-end" />
                    </Button>
                )}
            </div>
        </div>
    );
}

/**
 * Link hasil foto — aktif setelah Selesai Dikerjakan. Di-disable dengan
 * penjelasan, bukan disembunyikan: owner perlu tahu field ini ADA dan kapan
 * bisa dipakai.
 */
function ResultLink({ order }: { order: OrderRow }) {
    const allowed =
        order.work_status === 'done' || order.work_status === 'delivered';
    const form = useForm({ result_link: order.result_link ?? '' });

    return (
        <Section title="Hasil foto">
            <div className="flex flex-col gap-2 px-3 py-2">
                <div className="flex gap-2">
                    <Input
                        disabled={!allowed}
                        placeholder={
                            allowed
                                ? 'Tempel link Google Drive di sini'
                                : 'Aktif setelah status Selesai Dikerjakan'
                        }
                        value={form.data.result_link}
                        aria-invalid={Boolean(form.errors.result_link)}
                        onChange={(e) =>
                            form.setData('result_link', e.target.value)
                        }
                    />
                    {allowed && (
                        <Button
                            variant="outline"
                            disabled={
                                form.processing ||
                                form.data.result_link ===
                                    (order.result_link ?? '')
                            }
                            onClick={() =>
                                form.patch(
                                    OrderController.updateResultLink(order.id)
                                        .url,
                                    {
                                        preserveScroll: true,
                                    },
                                )
                            }
                        >
                            Simpan
                        </Button>
                    )}
                </div>
                <InputError message={form.errors.result_link} />
                <p className="text-xs text-muted-foreground">
                    {allowed
                        ? 'Link ini yang nanti dikirim ke customer saat order diserahkan.'
                        : 'Foto belum selesai diedit, jadi belum ada yang bisa ditautkan.'}
                </p>
            </div>
        </Section>
    );
}

/**
 * Batalkan — AlertDialog (R9). Yang dikonfirmasi adalah KONSEKUENSINYA: DP
 * tetap omzet karena kebijakan refund belum ada. Kalau tidak disebut, owner
 * bingung kenapa omzet tidak turun setelah membatalkan.
 */
function CancelOrder({ order }: { order: OrderRow }) {
    const form = useForm({ reason: '' });

    return (
        <AlertDialog>
            <AlertDialogTrigger
                render={
                    <Button variant="outline" className="text-destructive" />
                }
            >
                Batalkan Order
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Batalkan {order.number}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Order keluar dari daftar piutang dan tidak lagi ditagih.
                        {order.paid > 0 && (
                            <>
                                {' '}
                                DP {formatRp(order.paid)} yang sudah diterima{' '}
                                <b>tetap</b> tercatat sebagai omzet — kebijakan
                                refund belum disepakati, jadi DP diperlakukan
                                hangus.
                            </>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <Input
                    placeholder="Alasan pembatalan — opsional"
                    value={form.data.reason}
                    onChange={(e) => form.setData('reason', e.target.value)}
                />
                <InputError message={form.errors.reason} />

                <AlertDialogFooter>
                    <AlertDialogCancel render={<Button variant="outline" />}>
                        Kembali
                    </AlertDialogCancel>
                    <AlertDialogAction
                        render={<Button variant="destructive" />}
                        onClick={() =>
                            form.patch(OrderController.cancel(order.id).url, {
                                preserveScroll: true,
                            })
                        }
                    >
                        Batalkan Order
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{title}</h3>
            <div className="overflow-hidden rounded-lg border py-1">
                {children}
            </div>
        </section>
    );
}

function Line({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono">{value}</span>
        </div>
    );
}
