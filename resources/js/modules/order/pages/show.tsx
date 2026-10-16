/**
 * Order — detail (spek 7.4). Halaman penuh, bukan Sheet di daftar: dulu
 * tombol Ubah tersembunyi di dasar Sheet dan detail berdesakan. Isi & aturan
 * sama dengan Sheet lama (prompt 4.7): status kerja maju/mundur, pembayaran,
 * retur, alat dibawa, biaya job & margin, riwayat, link hasil, batal.
 */

import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowRight, CornerDownRight, Pencil } from 'lucide-react';
import { Fragment, useState } from 'react';
import AssetController from '@/actions/Modules/Asset/Controllers/AssetController';
import OrderController from '@/actions/Modules/Order/Controllers/OrderController';
import OrderPaymentController from '@/actions/Modules/Order/Controllers/OrderPaymentController';
import OrderRefundController from '@/actions/Modules/Order/Controllers/OrderRefundController';
import { KELAS_DENSITY } from '@/components/data-table';
import { ConfirmDelete } from '@/components/confirm-delete';
import InputError from '@/components/input-error';
import { PageHeader, Panel } from '@/components/page';
import { RecordedBy } from '@/components/recorded-by';
import {
    LineMark,
    PaymentBadge,
    RefundBadge,
    WorkProgress,
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { useCan } from '@/hooks/use-can';
import { useFlash } from '@/hooks/use-flash';
import {
    formatJadwal,
    formatPersen,
    formatRp,
    formatTanggal,
    formatTanggalJam,
    kelasRp,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Studio } from '@/modules/order/components/invoice-document';
import { PaymentDialog } from '@/modules/order/components/payment-dialog';
import { PaymentProofLink } from '@/modules/order/components/payment-proof-link';
import { ReceiptSheet } from '@/modules/order/components/receipt-sheet';
import { RefundDialog } from '@/modules/order/components/refund-dialog';
import {
    PAYMENT_METHOD_LABEL,
    SCHEDULE_STATUS_LABEL,
    describeEvent,
    scheduleOf,
} from '@/modules/order/types';
import type { OrderRow, Receipt } from '@/modules/order/types';
import { edit as ordersEdit, index as ordersIndex } from '@/routes/orders';
import { WORK_STATUS_LABEL } from '@/types/domain';
import type { WorkStatus } from '@/types/domain';

export default function OrderShow({
    order,
    studio,
}: {
    order: OrderRow;
    studio: Studio;
}) {
    const can = useCan();
    const [refunding, setRefunding] = useState(false);
    const [paying, setPaying] = useState(false);
    // Bukti bayar setelah PaymentDialog sukses.
    const [receipt, clearReceipt] = useFlash<Receipt>('receipt');

    const cancelled = order.work_status === 'cancelled';
    // Kolom bukti hanya bila ada bukti — tanpa sel kosong di kanan nominal.
    const anyProof = order.payments.some((p) => p.proof_url);

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <Head title={`${order.number} — Order`} />
            <PageHeader
                title={<span className="font-mono">{order.number}</span>}
                meta={
                    <>
                        <LineMark line={order.business_line} />
                        <PaymentBadge
                            status={order.payment_status}
                            paidPercent={order.paid_percent}
                        />
                        <RefundBadge amount={order.total_refunded} />
                    </>
                }
                description={
                    <>
                        {order.customer_name ?? 'Walk-in'} ·{' '}
                        {formatJadwal(scheduleOf(order))}
                        {order.location ? ` · ${order.location}` : ''}
                        {/* Sumber lead (spek 6.6) — hanya bila tercatat. */}
                        {order.source ? ` · Sumber: ${order.source}` : ''}
                        <RecordedBy name={order.created_by_name} />
                    </>
                }
                actions={
                    <>
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
                        {/* Ubah di kepala halaman, bukan di bawah — dulu tersembunyi di dasar Sheet (spek 7.4). */}
                        {order.editable && (
                            <Button
                                nativeButton={false}
                                render={<Link href={ordersEdit(order.id)} />}
                            >
                                <Pencil data-icon="inline-start" />
                                Ubah
                            </Button>
                        )}
                    </>
                }
            />

            {/*
                Kolom kiri dibaca berurutan (status → item → uang); kolom
                kanan pelengkap. Di bawah xl satu kolom dengan urutan sama.
            */}
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <div className="flex min-w-0 flex-col gap-6">
                    <StatusControl order={order} />

                    {order.notes && (
                        <Panel title="Catatan">
                            <p className="text-sm whitespace-pre-line">
                                {order.notes}
                            </p>
                        </Panel>
                    )}

                    <Panel title="Item" flush>
                        <Table className={KELAS_DENSITY}>
                            <TableBody>
                                {order.items.map((i) => (
                                    <Fragment key={i.id}>
                                        <TableRow>
                                            <TableCell className="font-medium whitespace-normal">
                                                {i.name}
                                                {i.is_custom && (
                                                    <Badge
                                                        variant="outline"
                                                        className="ml-2"
                                                    >
                                                        Custom
                                                    </Badge>
                                                )}
                                                {/* Layar sempit: harga satuan turun ke bawah nama. */}
                                                <span className="block text-xs font-normal text-muted-foreground sm:hidden">
                                                    {i.quantity} ×{' '}
                                                    {formatRp(i.unit_price)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="hidden text-right text-muted-foreground sm:table-cell">
                                                {i.quantity} ×{' '}
                                                {formatRp(i.unit_price)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatRp(
                                                    i.quantity * i.unit_price,
                                                )}
                                            </TableCell>
                                        </TableRow>
                                        {/* Isi paket (spek 6.3) — snapshot saat transaksi, tanpa harga. */}
                                        {i.components?.map((c) => (
                                            <TableRow
                                                key={c.name}
                                                className="border-0 text-muted-foreground"
                                            >
                                                <TableCell colSpan={3}>
                                                    <span className="flex items-center gap-2 pl-4 text-xs">
                                                        <CornerDownRight className="size-3.5 shrink-0" />
                                                        {c.quantity *
                                                            i.quantity}
                                                        × {c.name}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </Panel>

                    <Panel title="Pembayaran" flush>
                        {order.payments.length === 0 ? (
                            <p className="px-[18px] pt-4 text-sm text-muted-foreground">
                                Belum ada pembayaran diterima.
                            </p>
                        ) : (
                            <Table className={KELAS_DENSITY}>
                                <TableBody>
                                    {order.payments.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell>
                                                {p.note}
                                                {/* Layar sempit: tanggal & metode turun ke bawah. */}
                                                <span className="block text-xs whitespace-normal text-muted-foreground sm:hidden">
                                                    {formatTanggal(p.paid_on)} ·{' '}
                                                    {
                                                        PAYMENT_METHOD_LABEL[
                                                            p.method
                                                        ]
                                                    }
                                                    <RecordedBy
                                                        name={p.created_by_name}
                                                    />
                                                </span>
                                            </TableCell>
                                            <TableCell className="hidden whitespace-normal text-muted-foreground sm:table-cell">
                                                {formatTanggal(p.paid_on)} ·{' '}
                                                {PAYMENT_METHOD_LABEL[p.method]}
                                                <RecordedBy
                                                    name={p.created_by_name}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatRp(p.amount)}
                                            </TableCell>
                                            {anyProof && (
                                                <TableCell className="w-10">
                                                    {p.proof_url && (
                                                        <PaymentProofLink
                                                            url={p.proof_url}
                                                            label={`Bukti ${p.note}`}
                                                        />
                                                    )}
                                                </TableCell>
                                            )}
                                            {/* Hapus catatan uang hanya owner (spek 5.1); admin tanpa kolom kosong. */}
                                            {can.delete_money && (
                                                <TableCell className="w-10">
                                                    <ConfirmDelete
                                                        url={
                                                            OrderPaymentController.destroy(
                                                                {
                                                                    order: order.id,
                                                                    payment:
                                                                        p.id,
                                                                },
                                                            ).url
                                                        }
                                                        label={`pembayaran ${p.note}`}
                                                        title={`Hapus ${p.note} ${formatRp(p.amount)}?`}
                                                        description="Status bayar dan sisa tagihan order ini dihitung ulang."
                                                    />
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                        {/* Pengembalian (spek 4.2): uang keluar, merah. Tidak
                            mengubah sisa tagihan — customer tidak berutang lagi. */}
                        {order.refunds.length > 0 && (
                            <Table className={KELAS_DENSITY}>
                                <TableBody>
                                    {order.refunds.map((r) => (
                                        <TableRow
                                            key={r.id}
                                            className="text-destructive"
                                        >
                                            <TableCell>Retur</TableCell>
                                            <TableCell className="whitespace-normal">
                                                {formatTanggal(r.refunded_on)} ·{' '}
                                                {PAYMENT_METHOD_LABEL[r.method]}{' '}
                                                · {r.reason}
                                                <RecordedBy
                                                    name={r.created_by_name}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                −{formatRp(r.amount)}
                                            </TableCell>
                                            {can.delete_money && (
                                                <TableCell className="w-10">
                                                    <ConfirmDelete
                                                        url={
                                                            OrderRefundController.destroy(
                                                                {
                                                                    order: order.id,
                                                                    refund: r.id,
                                                                },
                                                            ).url
                                                        }
                                                        label={`retur ${formatRp(r.amount)}`}
                                                        title={`Hapus retur ${formatRp(r.amount)}?`}
                                                        description="Omzet bulan pengembalian dan margin order ini dihitung ulang."
                                                    />
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                        <div className="flex flex-col gap-1 px-[18px] pt-3 text-sm">
                            <Line
                                label="Total order"
                                value={formatRp(order.total)}
                            />
                            <Line
                                label="Sudah dibayar"
                                value={formatRp(order.paid)}
                            />
                            {order.total_refunded > 0 && (
                                <Line
                                    label="Dikembalikan"
                                    value={`−${formatRp(order.total_refunded)}`}
                                />
                            )}
                            <div className="flex justify-between font-medium">
                                {cancelled ? (
                                    <span className="text-muted-foreground">
                                        Sisa — tidak ditagih (batal)
                                    </span>
                                ) : (
                                    <span>Sisa tagihan</span>
                                )}
                                <span
                                    className={cn(
                                        cancelled
                                            ? 'text-muted-foreground line-through'
                                            : order.balance <= 0 &&
                                                  'text-success',
                                    )}
                                >
                                    {formatRp(order.balance)}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 px-[18px] pt-3 pb-4">
                            {/* Dialog untuk order INI, bukan melempar ke layar Piutang. */}
                            <Button
                                disabled={order.balance <= 0 || cancelled}
                                onClick={() => setPaying(true)}
                            >
                                Catat Pembayaran
                            </Button>
                            {/* Hanya bila ada uang yang bisa dikembalikan. */}
                            {order.refundable > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={() => setRefunding(true)}
                                >
                                    Catat Retur
                                </Button>
                            )}
                        </div>
                    </Panel>

                    {/* Termin pembayaran (spek 6.4): status FIFO dari pembayaran di
                        atas; termin berikutnya (yang ditagih) ditebalkan. */}
                    {order.schedules.length > 0 && (
                        <Panel
                            title="Termin pembayaran"
                            aside={`${order.schedules.length} termin`}
                            flush
                        >
                            <Table className={KELAS_DENSITY}>
                                <TableBody>
                                    {order.schedules.map((s) => (
                                        <TableRow
                                            key={s.sequence}
                                            data-next={
                                                s.sequence ===
                                                    order.next_installment
                                                        ?.sequence || undefined
                                            }
                                            className="data-next:font-semibold"
                                        >
                                            <TableCell>
                                                {s.label ??
                                                    `Termin ${s.sequence}`}
                                                <span className="block text-xs font-normal text-muted-foreground sm:hidden">
                                                    {formatTanggal(s.due_on)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="hidden text-muted-foreground sm:table-cell">
                                                {formatTanggal(s.due_on)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatRp(s.amount)}
                                            </TableCell>
                                            <TableCell className="w-20 text-right">
                                                <Badge
                                                    variant={
                                                        s.status === 'paid'
                                                            ? 'success'
                                                            : s.status ===
                                                                'partial'
                                                              ? 'warning'
                                                              : 'outline'
                                                    }
                                                >
                                                    {
                                                        SCHEDULE_STATUS_LABEL[
                                                            s.status
                                                        ]
                                                    }
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Panel>
                    )}
                </div>

                <div className="flex min-w-0 flex-col gap-6">
                    <ResultLink
                        key={`${order.id}-${order.work_status}`}
                        order={order}
                    />

                    {/* Biaya job & margin tidak dikirim untuk admin (spek 5.1). */}
                    {order.margin !== undefined && order.job_costs && (
                        <Panel title="Biaya job & margin" flush>
                            {order.job_costs.length === 0 ? (
                                <p className="px-[18px] pt-4 text-sm text-muted-foreground">
                                    Belum ada biaya langsung untuk order ini.
                                </p>
                            ) : (
                                <Table className={KELAS_DENSITY}>
                                    <TableBody>
                                        {order.job_costs.map((j) => (
                                            <TableRow key={j.id}>
                                                <TableCell>
                                                    {j.category}
                                                </TableCell>
                                                <TableCell className="whitespace-normal text-muted-foreground">
                                                    {j.description}
                                                    <RecordedBy
                                                        name={j.created_by_name}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
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
                            <div className="flex flex-col gap-1 px-[18px] pt-3 pb-4 text-sm">
                                {/* Retur mengurangi omzet riil order → margin (spek 4.2). */}
                                {order.total_refunded > 0 && (
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Pengembalian</span>
                                        <span>
                                            −{formatRp(order.total_refunded)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between font-medium">
                                    <span>Margin job</span>
                                    <span className={kelasRp(order.margin)}>
                                        {formatRp(order.margin)}
                                        {order.total > 0 && !cancelled && (
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
                                {cancelled && (
                                    <p className="text-xs text-muted-foreground">
                                        Order batal — dihitung dari uang yang
                                        diterima ({formatRp(order.paid)}), bukan
                                        total order.
                                    </p>
                                )}
                            </div>
                        </Panel>
                    )}

                    {/* Alat yang dibawa (spek 8.4) — dicatat dari halaman aset; di sini baca saja. */}
                    {order.asset_checkouts.length > 0 && (
                        <Panel title="Alat dibawa" flush>
                            <ul className="flex flex-col divide-y text-sm">
                                {order.asset_checkouts.map((c) => (
                                    <li
                                        key={c.id}
                                        className="flex flex-wrap items-center gap-x-3 gap-y-1 px-[18px] py-3"
                                    >
                                        <Link
                                            href={AssetController.show(
                                                c.asset_id,
                                            )}
                                            className="font-medium underline-offset-4 hover:underline"
                                        >
                                            <span className="font-mono text-xs">
                                                {c.asset_code}
                                            </span>{' '}
                                            {c.asset_name}
                                        </Link>
                                        <span className="text-muted-foreground">
                                            {c.quantity} unit · {c.holder}
                                        </span>
                                        <span className="ml-auto text-xs">
                                            {c.returned_on ? (
                                                <span className="text-muted-foreground">
                                                    Kembali{' '}
                                                    {formatTanggal(
                                                        c.returned_on,
                                                    )}
                                                </span>
                                            ) : c.overdue ? (
                                                <Badge variant="destructive">
                                                    Belum kembali · lewat jadwal
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline">
                                                    Belum kembali
                                                </Badge>
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </Panel>
                    )}

                    {/* Riwayat dari order_events — siapa mengubah apa, kapan. Paling
                        bawah: dibaca saat ada yang janggal, bukan tiap buka. */}
                    <Panel title="Riwayat">
                        {order.events.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                Belum ada riwayat.
                            </p>
                        ) : (
                            <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                                {order.events.map((e) => (
                                    <li key={e.id}>
                                        {formatTanggalJam(new Date(e.at))} ·{' '}
                                        {e.user_name ?? 'Sistem'} ·{' '}
                                        {describeEvent(e)}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                </div>
            </div>

            {refunding && (
                <RefundDialog
                    order={order}
                    onClose={() => setRefunding(false)}
                />
            )}
            {paying && (
                // key memuat sisa: membuka lagi setelah mencatat DP harus
                // prefill sisa yang baru, bukan yang lama.
                <PaymentDialog
                    key={`${order.id}-${order.balance}`}
                    order={order}
                    onClose={() => setPaying(false)}
                />
            )}
            <ReceiptSheet
                receipt={receipt}
                studio={studio}
                onClose={clearReceipt}
            />
        </div>
    );
}

OrderShow.layout = {
    breadcrumbs: [
        { title: 'Order & Booking', href: ordersIndex() },
        { title: 'Detail order', href: ordersIndex() },
    ],
};

/**
 * Status kerja — SATU-SATUNYA status yang diinput manual, hanya maju satu
 * langkah. Langkah berikutnya ditentukan server (`next_status`). Status bayar
 * tidak punya kontrol di mana pun: ia turunan pembayaran.
 */
function StatusControl({ order }: { order: OrderRow }) {
    const next = order.next_status;

    const cancelled = order.work_status === 'cancelled';

    return (
        <Panel title="Status kerja">
            <div className="flex flex-col gap-3">
                <WorkProgress status={order.work_status} />
                {(order.previous_status || next || !cancelled) && (
                    <div className="flex flex-wrap items-center gap-2">
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
                        {order.previous_status && (
                            <RevertStatus
                                order={order}
                                to={order.previous_status}
                            />
                        )}
                        {/* Batal di ujung, terpisah dari langkah maju/mundur. */}
                        {!cancelled && (
                            <span className="ml-auto">
                                <CancelOrder order={order} />
                            </span>
                        )}
                    </div>
                )}
            </div>
        </Panel>
    );
}

/**
 * Mundur satu langkah (spek 1.4) — tautan kecil, bukan tombol utama: ini
 * koreksi salah klik, bukan alur normal. Dikonfirmasi karena tercatat di
 * riwayat dan terlihat customer lewat status di invoice/kalender.
 */
function RevertStatus({ order, to }: { order: OrderRow; to: WorkStatus }) {
    return (
        <AlertDialog>
            <AlertDialogTrigger
                render={
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                    />
                }
            >
                Kembalikan ke {WORK_STATUS_LABEL[to]}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Kembalikan status {order.number}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Status kembali ke {WORK_STATUS_LABEL[to]}. Tercatat di
                        riwayat order; pembayaran dan link hasil tidak berubah.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel render={<Button variant="outline" />}>
                        Batal
                    </AlertDialogCancel>
                    <AlertDialogAction
                        render={<Button />}
                        onClick={() =>
                            router.patch(
                                OrderController.revert(order.id).url,
                                {},
                                { preserveScroll: true },
                            )
                        }
                    >
                        Kembalikan
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
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
        <Panel title="Hasil foto">
            <div className="flex flex-col gap-2">
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
        </Panel>
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
                    <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                    />
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

function Line({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span>{value}</span>
        </div>
    );
}
