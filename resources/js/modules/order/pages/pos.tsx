/**
 * POS — transaksi walk-in retail (prompt 4.12, porting web/app/routes/pos.tsx).
 *
 * Target desainnya satu angka: **satu transaksi selesai diinput dalam < 30
 * detik** (business-flow bagian 1). Risiko terbesar proyek ini bukan teknis
 * tapi disiplin input — kalau owner malas mencatat, app sebagus apa pun jadi
 * sampah dalam 2 minggu.
 *
 * Konsekuensinya: customer OPSIONAL dan tampil sebagai field pasif, bukan
 * wajib. CRM lebih baik terisi 60% daripada app-nya ditinggal (5.1).
 */

import { Head, useForm } from '@inertiajs/react';
import { Minus, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import PosController from '@/actions/Modules/Order/Controllers/PosController';
import { KosongTabel } from '@/components/data-table';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useFlash } from '@/hooks/use-flash';
import { formatRp, hanyaDigit } from '@/lib/format';
import type { Studio } from '@/modules/order/components/invoice-document';
import { ReceiptSheet } from '@/modules/order/components/receipt-sheet';
import { PAYMENT_METHOD_LABEL } from '@/modules/order/types';
import type { PaymentMethod, Receipt } from '@/modules/order/types';
import { index as catalogIndex } from '@/routes/catalog';
import { index as posIndex } from '@/routes/pos';

const METHODS: PaymentMethod[] = ['cash', 'transfer', 'qris'];

interface Product {
    id: number;
    name: string;
    price: number;
    unit_cost: number | null;
}

interface SaleForm {
    items: { catalog_item_id: number; quantity: number }[];
    discount: string;
    method: PaymentMethod;
    customer_name: string;
    customer_phone: string;
}

export default function Pos({
    products,
    studio,
}: {
    products: Product[];
    studio: Studio;
}) {
    const [search, setSearch] = useState('');
    // Struk sekali tampil setelah simpan; keranjang tetap dikosongkan di
    // onSuccess — Sheet tidak menahan transaksi berikutnya.
    const [receipt, clearReceipt] = useFlash<Receipt>('receipt');
    const form = useForm<SaleForm>({
        items: [],
        discount: '',
        method: 'cash',
        customer_name: '',
        customer_phone: '',
    });
    const { data, setData, processing } = form;
    // Error baris berkunci "items.0.catalog_item_id" — tidak ada di tipe form.
    const errors: Record<string, string | undefined> = form.errors;
    const itemError = Object.entries(errors).find(([k]) =>
        k.startsWith('items.'),
    )?.[1];

    const productOf = (id: number) => products.find((p) => p.id === id);
    const visible = products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()),
    );

    const lines = data.items.flatMap((l) => {
        const p = productOf(l.catalog_item_id);
        return p ? [{ ...l, product: p }] : [];
    });
    const subtotal = lines.reduce(
        (s, l) => s + l.quantity * l.product.price,
        0,
    );
    const discount = Math.min(Number(data.discount) || 0, subtotal);
    const total = subtotal - discount;
    const materialCost = lines.reduce(
        (s, l) => s + l.quantity * (l.product.unit_cost ?? 0),
        0,
    );

    const add = (p: Product) =>
        setData(
            'items',
            data.items.some((l) => l.catalog_item_id === p.id)
                ? data.items.map((l) =>
                      l.catalog_item_id === p.id
                          ? { ...l, quantity: l.quantity + 1 }
                          : l,
                  )
                : [...data.items, { catalog_item_id: p.id, quantity: 1 }],
        );

    const changeQty = (id: number, delta: number) =>
        setData(
            'items',
            data.items
                .map((l) =>
                    l.catalog_item_id === id
                        ? { ...l, quantity: l.quantity + delta }
                        : l,
                )
                .filter((l) => l.quantity > 0),
        );

    const submit = () =>
        form.post(PosController.store().url, {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setSearch('');
            },
        });

    // POS bergantung pada Katalog — arahkan ke sana, bukan tawarkan aksi yang
    // belum bisa dijalankan (R7).
    if (products.length === 0) {
        return (
            <>
                <Head title="POS" />
                <div className="p-6">
                    <KosongTabel
                        kalimat="Belum ada produk aktif di katalog. Isi dulu supaya bisa jualan."
                        aksi={{ label: 'Isi Katalog', ke: catalogIndex() }}
                    />
                </div>
            </>
        );
    }

    return (
        <>
            <Head title="POS" />
            <h1 className="sr-only">POS</h1>

            {/*
                Dua kolom sejajar, bukan wizard: 30 detik tidak cukup untuk
                berpindah langkah. Item, keranjang, dan tombol bayar harus
                terlihat serentak.
            */}
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_22rem]">
                <section className="flex min-w-0 flex-col gap-4">
                    <div className="relative">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            autoFocus
                            placeholder="Cari item — ketik nama produk"
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {visible.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => add(p)}
                                className="flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                            >
                                <span className="text-sm font-medium">
                                    {p.name}
                                </span>
                                <span className="font-mono text-sm text-muted-foreground">
                                    {formatRp(p.price)}
                                </span>
                            </button>
                        ))}
                    </div>

                    {visible.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            Tidak ada item cocok dengan "{search}".
                        </p>
                    )}
                </section>

                <aside className="flex min-w-0 flex-col gap-4 self-start rounded-lg border p-5">
                    <h2 className="font-heading text-base font-semibold">
                        Keranjang
                    </h2>

                    {lines.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Klik item di kiri untuk menambahkan.
                        </p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {lines.map((l) => (
                                <div
                                    key={l.catalog_item_id}
                                    className="flex items-center gap-2"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">
                                            {l.product.name}
                                        </p>
                                        <p className="font-mono text-xs text-muted-foreground">
                                            {formatRp(l.product.price)} ×{' '}
                                            {l.quantity}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            aria-label={`Kurangi ${l.product.name}`}
                                            onClick={() =>
                                                changeQty(l.catalog_item_id, -1)
                                            }
                                        >
                                            {l.quantity === 1 ? (
                                                <Trash2 />
                                            ) : (
                                                <Minus />
                                            )}
                                        </Button>
                                        <span className="w-6 text-center font-mono text-sm">
                                            {l.quantity}
                                        </span>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            aria-label={`Tambah ${l.product.name}`}
                                            onClick={() =>
                                                changeQty(l.catalog_item_id, 1)
                                            }
                                        >
                                            <Plus />
                                        </Button>
                                    </div>
                                    <span className="w-24 shrink-0 text-right font-mono text-sm">
                                        {formatRp(l.quantity * l.product.price)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    <InputError message={errors.items ?? itemError} />

                    <Separator />

                    <div className="flex flex-col gap-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                Subtotal
                            </span>
                            <span className="font-mono">
                                {formatRp(subtotal)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <label
                                htmlFor="discount"
                                className="text-muted-foreground"
                            >
                                Diskon
                            </label>
                            {/* Non-digit dibuang — rupiah selalu integer (R5). */}
                            <Input
                                id="discount"
                                inputMode="numeric"
                                placeholder="0"
                                className="h-8 w-28 text-right font-mono"
                                value={data.discount}
                                aria-invalid={Boolean(errors.discount)}
                                onChange={(e) =>
                                    setData(
                                        'discount',
                                        hanyaDigit(e.target.value),
                                    )
                                }
                            />
                        </div>
                        <InputError message={errors.discount} />
                        <Separator />
                        <div className="flex items-baseline justify-between">
                            <span className="font-medium">Total</span>
                            <span className="font-mono text-2xl font-semibold">
                                {formatRp(total)}
                            </span>
                        </div>
                        {/*
                            HPP tercatat otomatis dari katalog (5.1) — yang paling
                            sering bocor: produk terlihat untung karena harga
                            bahannya tidak pernah dihitung. Metadata, bukan angka
                            yang diisi owner.
                        */}
                        {lines.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                HPP bahan {formatRp(materialCost)} · margin{' '}
                                {formatRp(total - materialCost)}
                            </p>
                        )}
                    </div>

                    <Separator />

                    {/*
                        Customer OPSIONAL tanpa tanda wajib, dengan hint
                        konsekuensinya. Bukan Select yang harus dipilih.
                    */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="customer_name" className="text-sm">
                            Customer{' '}
                            <span className="text-muted-foreground">
                                — opsional
                            </span>
                        </label>
                        <Input
                            id="customer_name"
                            placeholder="Kosongkan kalau tidak perlu dicatat"
                            value={data.customer_name}
                            onChange={(e) =>
                                setData('customer_name', e.target.value)
                            }
                        />
                        <p className="text-xs text-muted-foreground">
                            Tanpa nama, transaksi dicatat sebagai walk-in. Nama
                            yang sudah ada di Customer dipakai ulang.
                        </p>
                        <InputError message={errors.customer_name} />
                    </div>

                    {/* HP hanya bersama nama (aturan server) — disabled, bukan
                        disembunyikan, supaya owner tahu field-nya ada. Yang
                        dikirim ketikan mentah; server yang menormalkan. */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="customer_phone" className="text-sm">
                            No HP{' '}
                            <span className="text-muted-foreground">
                                — opsional, untuk kirim struk
                            </span>
                        </label>
                        <Input
                            id="customer_phone"
                            inputMode="tel"
                            autoComplete="off"
                            placeholder="08…"
                            disabled={data.customer_name.trim() === ''}
                            title={
                                data.customer_name.trim() === ''
                                    ? 'Isi nama dulu'
                                    : undefined
                            }
                            value={data.customer_phone}
                            onChange={(e) =>
                                setData('customer_phone', e.target.value)
                            }
                        />
                        <InputError message={errors.customer_phone} />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <span className="text-sm">Metode bayar</span>
                        <ToggleGroup
                            value={[data.method]}
                            onValueChange={(v) => {
                                const m = METHODS.find((x) => x === v[0]);
                                if (m) setData('method', m);
                            }}
                        >
                            {METHODS.map((m) => (
                                <ToggleGroupItem key={m} value={m}>
                                    {PAYMENT_METHOD_LABEL[m]}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                        <InputError message={errors.method} />
                    </div>

                    <Button
                        size="lg"
                        disabled={lines.length === 0 || processing}
                        onClick={submit}
                    >
                        Simpan & Bayar {total > 0 ? formatRp(total) : ''}
                    </Button>
                </aside>
            </div>

            <ReceiptSheet
                receipt={receipt}
                studio={studio}
                onClose={clearReceipt}
            />
        </>
    );
}

Pos.layout = {
    breadcrumbs: [{ title: 'POS', href: posIndex() }],
};
