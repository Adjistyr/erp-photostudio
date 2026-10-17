/**
 * Order — Ubah Order (spek 1.2). Halaman penuh seperti Buat Order (R9) dan
 * memakai bagian form yang sama (`order-form.tsx`).
 *
 * Yang beda dari Buat Order: jenis order tidak bisa diganti, tidak ada DP
 * (pembayaran punya dialog sendiri), dan ringkasan menunjukkan yang sudah
 * dibayar — total baru tidak boleh di bawahnya. Setiap simpan tercatat di
 * riwayat order (siapa, kapan, apa yang berubah).
 */

import { Head, Link, useForm } from '@inertiajs/react';
import OrderController from '@/actions/Modules/Order/Controllers/OrderController';
import InputError from '@/components/input-error';
import { Notice, PageHeader, Panel } from '@/components/page';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatRp, kelasRp } from '@/lib/format';
import {
    OrderFormFields,
    SummaryLines,
    customerPayload,
    hasCustomer,
    orderTotal,
    rowsComplete,
    toPayload,
} from '@/modules/order/components/order-form';
import { ScheduleSummary } from '@/modules/order/components/schedule-editor';
import type {
    CatalogOption,
    CustomerOption,
    Locked,
    OrderFields,
} from '@/modules/order/components/order-form';
import type { OrderType } from '@/modules/order/lib/category';
import {
    schedulesPayload,
    schedulesWillDrop,
} from '@/modules/order/lib/schedules';
import type { OrderRow } from '@/modules/order/types';
import { index as ordersIndex } from '@/routes/orders';
import { LINE_LABEL } from '@/types/domain';

export default function OrdersEdit({
    order,
    customers,
    catalog,
    locked,
    sources,
}: {
    order: OrderRow;
    customers: CustomerOption[];
    catalog: CatalogOption[];
    locked: Locked;
    /** null = retail, sumber tidak dicatat (spek 6.6). */
    sources: string[] | null;
}) {
    const form = useForm<OrderFields>({
        customer_id:
            order.customer_id === null ? '' : String(order.customer_id),
        new_customer: null,
        service_date: order.service_date,
        service_time: order.service_time ?? '',
        location: order.location ?? '',
        notes: order.notes ?? '',
        source: order.source ?? '',
        items: order.items.map((i) => ({
            key: i.id,
            id: i.id,
            catalog_item_id:
                i.catalog_item_id === null ? '' : String(i.catalog_item_id),
            quantity: i.quantity,
            unit_price: i.unit_price,
            name: i.name,
            custom: i.is_custom,
            price: String(i.unit_price),
        })),
        schedules: order.schedules.map((s) => ({
            key: s.sequence,
            due_on: s.due_on,
            amount: String(s.amount),
            label: s.label ?? '',
        })),
    });
    const { data, setData, errors, processing } = form;
    // Error `order` (order batal) dan baris item tidak ada di tipe form.
    const allErrors: Record<string, string | undefined> = errors;
    // Retail sejak spek 7.4 juga punya halaman ini (item & tanggal terkunci —
    // selalu Diserahkan), jadi diperlakukan seperti studio untuk pilihan paket.
    const line: OrderType =
        order.business_line === 'event' ? 'event' : 'studio';

    const total = orderTotal(data.items, catalog);
    const belowPaid = total < order.paid;
    // Aturan 5 (spek 6.4) — sama persis dengan UpdateOrderRequest::dropsSchedules().
    const dropsSchedules = schedulesWillDrop(
        order.schedules.length > 0,
        order.total,
        total,
        data.schedules,
    );
    const complete =
        // Retail walk-in boleh tanpa customer (spek 7.4).
        (order.business_line === 'retail' || hasCustomer(data)) &&
        data.service_date !== '' &&
        total > 0 &&
        rowsComplete(data.items, catalog);

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <Head title={`Ubah ${order.number}`} />

            <PageHeader
                title={`Ubah ${order.number}`}
                description={`${LINE_LABEL[order.business_line]} · jenis order tidak bisa diganti`}
            />

            <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[1fr_20rem]">
                <div className="flex min-w-0 flex-col gap-6">
                    <InputError message={allErrors.order} />
                    <OrderFormFields
                        line={line}
                        data={data}
                        onChange={(patch) =>
                            setData((d) => ({ ...d, ...patch }))
                        }
                        errors={allErrors}
                        customers={customers}
                        catalog={catalog}
                        locked={locked}
                        sources={sources ?? undefined}
                        // Kalimat sama dengan toast server saat termin benar-benar dihapus.
                        scheduleNotice={
                            dropsSchedules
                                ? 'Termin dihapus karena total berubah — atur ulang (jumlah termin harus sama dengan total baru).'
                                : undefined
                        }
                    />
                </div>

                <Panel title="Ringkasan" className="self-start">
                    <div className="flex flex-col gap-4">
                        <SummaryLines items={data.items} catalog={catalog} />

                        <Separator />

                        <div className="flex flex-col gap-2 text-sm">
                            <div className="flex items-baseline justify-between">
                                <span className="font-medium">Total</span>
                                <span className="text-2xl font-medium tracking-[-0.02em]">
                                    {formatRp(total)}
                                </span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Sudah dibayar</span>
                                <span>{formatRp(order.paid)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Sisa</span>
                                <span className={kelasRp(total - order.paid)}>
                                    {formatRp(total - order.paid)}
                                </span>
                            </div>
                        </div>

                        {line === 'event' && (
                            <ScheduleSummary
                                rows={data.schedules}
                                total={total}
                            />
                        )}

                        {belowPaid && (
                            // Server juga menolak; di sini supaya kelihatan sebelum simpan.
                            <p className="text-xs text-destructive">
                                Total lebih kecil dari yang sudah dibayar. Hapus
                                pembayaran dulu kalau memang mau mengurangi.
                            </p>
                        )}

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                nativeButton={false}
                                render={
                                    <Link
                                        href={OrderController.show(order.id)}
                                    />
                                }
                            >
                                Batal
                            </Button>
                            <Button
                                className="flex-1"
                                disabled={!complete || belowPaid || processing}
                                onClick={() => {
                                    // transform() mendaftarkan pengubah, tidak mengembalikan form.
                                    form.transform((d) => ({
                                        ...d,
                                        ...customerPayload(d),
                                        items: toPayload(d.items),
                                        schedules: schedulesPayload(
                                            d.schedules,
                                        ),
                                    }));
                                    form.put(
                                        OrderController.update(order.id).url,
                                    );
                                }}
                            >
                                Simpan perubahan
                            </Button>
                        </div>
                        <Notice>
                            Harga item yang sudah ada tidak ikut berubah walau
                            harga katalog naik. Perubahan tercatat di riwayat
                            order.
                        </Notice>
                    </div>
                </Panel>
            </div>
        </div>
    );
}

OrdersEdit.layout = {
    breadcrumbs: [
        { title: 'Order & Booking', href: ordersIndex() },
        { title: 'Ubah Order', href: ordersIndex() },
    ],
};
