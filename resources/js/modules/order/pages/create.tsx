/**
 * Order — Form Buat Order (prompt 4.6, porting web/app/routes/order-baru.tsx).
 *
 * Halaman penuh, BUKAN modal (R9). Formnya punya banyak bagian (customer, item,
 * jadwal, DP) dan sering diisi bertahap — modal memaksa selesai sekali duduk
 * dan gampang tertutup tidak sengaja, dan kehilangan isian order wedding
 * setengah jalan adalah cara cepat membuat owner berhenti memakai app.
 *
 * Hanya studio & event yang lewat sini. Retail masuk lewat POS: walk-in tidak
 * punya jadwal dan tidak butuh form sepanjang ini.
 */

import { Head, Link, useForm } from '@inertiajs/react';
import { Info } from 'lucide-react';
import OrderController from '@/actions/Modules/Order/Controllers/OrderController';
import InputError from '@/components/input-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatPersen, formatRp, hanyaDigit } from '@/lib/format';
import {
    OrderFormFields,
    SummaryLines,
    orderTotal,
} from '@/modules/order/components/order-form';
import type {
    CatalogOption,
    CustomerOption,
    OrderFields,
} from '@/modules/order/components/order-form';
import type { OrderType } from '@/modules/order/lib/category';
import { PAYMENT_METHOD_LABEL } from '@/modules/order/types';
import type { PaymentMethod } from '@/modules/order/types';
import { create as ordersCreate, index as ordersIndex } from '@/routes/orders';

const METHODS: PaymentMethod[] = ['cash', 'transfer', 'qris'];

/** Field bersama + yang hanya ada saat membuat: jenis order dan DP. */
interface OrderForm extends OrderFields {
    business_line: OrderType;
    dp: string;
    dp_method: PaymentMethod;
}

export default function OrdersCreate({
    customers,
    catalog,
}: {
    customers: CustomerOption[];
    catalog: CatalogOption[];
}) {
    const form = useForm<OrderForm>({
        business_line: 'studio',
        customer_id: '',
        service_date: '',
        service_time: '',
        location: '',
        notes: '',
        items: [{ key: 1, catalog_item_id: '', quantity: 1 }],
        dp: '',
        dp_method: 'transfer',
    });
    const { data, setData, errors, processing } = form;

    const total = orderTotal(data.items, catalog);
    const deposit = Number(data.dp) || 0;
    const complete =
        data.customer_id !== '' && data.service_date !== '' && total > 0;

    return (
        <>
            <Head title="Buat Order" />
            <h1 className="sr-only">Buat Order</h1>

            <div className="grid min-w-0 grid-cols-1 gap-6 p-6 xl:grid-cols-[1fr_20rem]">
                <div className="flex min-w-0 flex-col gap-6">
                    <OrderFormFields
                        line={data.business_line}
                        data={data}
                        onChange={(patch) =>
                            setData((d) => ({ ...d, ...patch }))
                        }
                        // Error baris item berkunci "items.0.catalog_item_id" — tidak
                        // ada di tipe data form, jadi diteruskan sebagai Record biasa.
                        errors={errors}
                        customers={customers}
                        catalog={catalog}
                        header={
                            <Field>
                                <FieldLabel>Jenis order</FieldLabel>
                                {/*
                                    Hanya studio & event. Retail tidak ada di
                                    sini — order retail berjadwal bertabrakan
                                    dengan alur POS yang dirancang selesai
                                    dalam 30 detik.
                                */}
                                <ToggleGroup
                                    value={[data.business_line]}
                                    onValueChange={(v) => {
                                        const t = (
                                            ['studio', 'event'] as const
                                        ).find((x) => x === v[0]);
                                        if (!t) return;
                                        // Item direset: paket studio dan event
                                        // tidak saling berlaku, dan pilihan lama
                                        // membuat order event berisi paket studio
                                        // tanpa ada yang sadar.
                                        setData((d) => ({
                                            ...d,
                                            business_line: t,
                                            items: [
                                                {
                                                    key: Date.now(),
                                                    catalog_item_id: '',
                                                    quantity: 1,
                                                },
                                            ],
                                            location: '',
                                        }));
                                    }}
                                >
                                    <ToggleGroupItem value="studio">
                                        Sesi Studio
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="event">
                                        Event (wedding, prewed)
                                    </ToggleGroupItem>
                                </ToggleGroup>
                                <InputError message={errors.business_line} />
                            </Field>
                        }
                    />
                </div>

                <aside className="flex min-w-0 flex-col gap-4 self-start rounded-lg border p-5">
                    <h2 className="font-heading text-base font-semibold">
                        Ringkasan
                    </h2>

                    <SummaryLines items={data.items} catalog={catalog} />

                    <Separator />

                    <div className="flex items-baseline justify-between">
                        <span className="font-medium">Total</span>
                        <span className="font-mono text-2xl font-semibold">
                            {formatRp(total)}
                        </span>
                    </div>

                    <Field>
                        <FieldLabel htmlFor="dp">
                            DP diterima{' '}
                            <span className="text-muted-foreground">
                                — opsional
                            </span>
                        </FieldLabel>
                        {/*
                            DP nominal bebas, bukan persentase tetap — asumsi
                            business-flow bagian 2 pertanyaan 3: nego per deal.
                        */}
                        <Input
                            id="dp"
                            inputMode="numeric"
                            placeholder="0"
                            className="font-mono"
                            value={data.dp}
                            aria-invalid={Boolean(errors.dp)}
                            onChange={(e) =>
                                setData('dp', hanyaDigit(e.target.value))
                            }
                        />
                        <InputError message={errors.dp} />
                    </Field>

                    {deposit > 0 && (
                        // Metode hanya relevan kalau ada uang masuk.
                        <Field>
                            <FieldLabel>Metode DP</FieldLabel>
                            <ToggleGroup
                                value={[data.dp_method]}
                                onValueChange={(v) => {
                                    const m = METHODS.find((x) => x === v[0]);
                                    if (m) setData('dp_method', m);
                                }}
                            >
                                {METHODS.map((m) => (
                                    <ToggleGroupItem key={m} value={m}>
                                        {PAYMENT_METHOD_LABEL[m]}
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                            <InputError message={errors.dp_method} />
                        </Field>
                    )}

                    {total > 0 && deposit <= total && (
                        <p className="text-xs text-muted-foreground">
                            Status bayar akan jadi{' '}
                            <span className="font-medium text-foreground">
                                {deposit <= 0
                                    ? 'Belum Bayar'
                                    : deposit >= total
                                      ? 'Lunas'
                                      : `DP ${formatPersen(deposit / total)}`}
                            </span>
                            , dan status kerja{' '}
                            <span className="font-medium text-foreground">
                                {deposit > 0 ? 'Dijadwalkan' : 'Booking'}
                            </span>
                            .
                        </p>
                    )}

                    <Alert>
                        <Info />
                        <AlertTitle>Biaya job dicatat nanti</AlertTitle>
                        <AlertDescription>
                            Fee crew, transport, dan sewa dicatat setelah acara
                            lewat menu Biaya — nilainya baru pasti setelah
                            dikerjakan, dan itu yang menentukan job ini
                            benar-benar untung atau tidak.
                        </AlertDescription>
                    </Alert>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            nativeButton={false}
                            render={<Link href={ordersIndex()} />}
                        >
                            Batal
                        </Button>
                        <Button
                            className="flex-1"
                            disabled={!complete || processing}
                            onClick={() =>
                                form.post(OrderController.store().url)
                            }
                        >
                            Simpan
                        </Button>
                    </div>
                    {!complete && (
                        <p className="text-xs text-muted-foreground">
                            Customer, tanggal, dan minimal satu item harus
                            diisi.
                        </p>
                    )}
                </aside>
            </div>
        </>
    );
}

OrdersCreate.layout = {
    breadcrumbs: [
        { title: 'Order & Booking', href: ordersIndex() },
        { title: 'Buat Order', href: ordersCreate() },
    ],
};
