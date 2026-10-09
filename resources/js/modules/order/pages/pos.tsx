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
import { toast } from 'sonner';
import PosController from '@/actions/Modules/Order/Controllers/PosController';
import { KosongTabel } from '@/components/data-table';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useFlash } from '@/hooks/use-flash';
import { useMinWidth } from '@/hooks/use-mobile';
import {
    nominalKePersen,
    persenKeNominal,
    rapikanPersen,
} from '@/modules/order/lib/discount';
import type { DiscountMode } from '@/modules/order/lib/discount';
import {
    defaultLabel,
    dropCart,
    holdCart,
    loadHeld,
    makeHeldCart,
    MAX_HELD,
    restoreCart,
    saveHeld,
} from '@/modules/order/lib/held-carts';
import type { HeldCart } from '@/modules/order/lib/held-carts';
import { bagiPembayaran } from '@/modules/order/lib/split-payment';
import { formatRp, hanyaDigit } from '@/lib/format';
import type { Studio } from '@/modules/order/components/invoice-document';
import {
    HeldCarts,
    HoldCartButton,
} from '@/modules/order/components/held-carts';
import { ReceiptSheet } from '@/modules/order/components/receipt-sheet';
import { TodaySales } from '@/modules/order/components/today-sales';
import type { TodaySale } from '@/modules/order/components/today-sales';
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
    /**
     * 1–2 baris (spek 4.4). `amount` baris pertama tidak dipakai — dihitung
     * saat simpan dari total (dan baris kedua bila ada).
     */
    payments: { method: PaymentMethod; amount: string }[];
    customer_name: string;
    customer_phone: string;
}

export default function Pos({
    products,
    studio,
    today_sales,
    today_total,
}: {
    products: Product[];
    studio: Studio;
    /** Transaksi POS hari ini, 50 terbaru (spek 2.5). */
    today_sales: TodaySale[];
    /** Total hari ini tanpa order batal. */
    today_total: number;
}) {
    const [search, setSearch] = useState('');
    // Struk sekali tampil setelah simpan; keranjang tetap dikosongkan di
    // onSuccess — Sheet tidak menahan transaksi berikutnya.
    const [flashReceipt, clearFlashReceipt] = useFlash<Receipt>('receipt');
    // Struk dibuka ulang dari panel Hari ini — Sheet yang sama dengan flash.
    const [manualReceipt, setManualReceipt] = useState<Receipt | null>(null);
    const receipt = flashReceipt ?? manualReceipt;
    const closeReceipt = () => {
        clearFlashReceipt();
        setManualReceipt(null);
    };
    const form = useForm<SaleForm>({
        items: [],
        discount: '',
        payments: [{ method: 'cash', amount: '' }],
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
    // Diskon persen (spek 4.1): isian mentah di form, nominal diturunkan di
    // sini dan dikirim lewat transform saat simpan. Dalam mode % persen yang
    // dipertahankan — nominal ikut berubah bila keranjang berubah.
    const [discountMode, setDiscountMode] = useState<DiscountMode>('rp');
    const persen = Number(data.discount) || 0;
    const discountNominal =
        discountMode === 'pct'
            ? persenKeNominal(subtotal, persen)
            : Number(data.discount) || 0;
    const pctError =
        discountMode === 'pct' && persen >= 100
            ? 'Diskon harus di bawah 100%.'
            : undefined;
    const discount = Math.min(discountNominal, subtotal);
    const switchDiscountMode = (mode: DiscountMode) => {
        if (mode === discountMode) return;
        // Pindah mode mengonversi nilai yang ada, tidak mengosongkan field.
        const next =
            mode === 'pct'
                ? nominalKePersen(subtotal, Number(data.discount) || 0)
                : persenKeNominal(subtotal, persen);
        setData('discount', next > 0 ? String(next) : '');
        setDiscountMode(mode);
    };
    const total = subtotal - discount;
    // Split payment: hanya baris kedua yang diketik, baris pertama = sisa.
    const [first, second] = data.payments;
    const split = second
        ? bagiPembayaran(total, Number(second.amount) || 0)
        : null;
    const splitError =
        second && second.amount !== '' && !split
            ? `Isi antara Rp 1 dan ${formatRp(total - 1)}.`
            : undefined;
    const setMethod = (i: number, v: string[]) => {
        const m = METHODS.find((x) => x === v[0]);
        if (m)
            setData(
                'payments',
                data.payments.map((p, j) =>
                    j === i ? { ...p, method: m } : p,
                ),
            );
    };
    // Keranjang tertahan (spek 4.3). Lazy initializer, bukan useEffect: app
    // tanpa SSR (tidak ada ssr.tsx); `loadHeld` tetap aman tanpa `window`.
    const [held, setHeld] = useState<HeldCart[]>(() => loadHeld());
    // Layar sempit (spek 4.6): breakpoint lg = grid dua kolom POS pecah.
    const isDesktop = useMinWidth(1024);
    const [cartOpen, setCartOpen] = useState(false);
    const persistHeld = (next: HeldCart[]) => {
        setHeld(next);
        saveHeld(next);
    };
    const clearCart = () => {
        form.reset();
        form.clearErrors();
        setDiscountMode('rp');
    };
    const hold = (label: string) => {
        const next = holdCart(held, makeHeldCart(data, discountMode, label));
        if (next === 'full') return;
        persistHeld(next);
        clearCart();
        setCartOpen(false);
    };
    const restore = (cart: HeldCart, holdCurrent: boolean) => {
        const rest = dropCart(held, cart.id);
        // Satu slot baru saja kosong — menahan keranjang aktif tidak bisa penuh.
        persistHeld(
            holdCurrent
                ? [
                      makeHeldCart(
                          data,
                          discountMode,
                          defaultLabel(data.customer_name),
                      ),
                      ...rest,
                  ]
                : rest,
        );
        const { form: fields, skipped } = restoreCart(cart, products);
        form.clearErrors();
        setData(fields);
        setDiscountMode(cart.discountMode);
        if (skipped > 0)
            toast.warning(`${skipped} item tidak lagi tersedia dan dilewati`);
    };
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

    const submit = () => {
        // Server selalu menerima nominal rupiah. Nominal bayar dihitung di sini,
        // bukan disimpan di state — supaya ikut berubah bila keranjang berubah.
        form.transform((d) => ({
            ...d,
            discount: String(discountNominal),
            payments:
                split && second
                    ? [
                          { method: first.method, amount: split[0] },
                          { method: second.method, amount: split[1] },
                      ]
                    : [{ method: first.method, amount: total }],
        }));
        form.post(PosController.store().url, {
            preserveScroll: true,
            onSuccess: () => {
                // Sheet keranjang ditutup; Sheet struk dibuka oleh flash.
                setCartOpen(false);
                form.reset();
                setSearch('');
            },
        });
    };

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

    // Keranjang dirender SEKALI: kolom kanan di lg+, Sheet bawah di bawahnya
    // (spek 4.6) — lihat useMinWidth.
    const cart = (
        <aside
            className={`flex min-w-0 flex-col gap-4 ${isDesktop ? 'rounded-lg border p-5' : 'p-4 pt-12'}`}
        >
            <div className="flex items-center justify-between gap-2">
                <h2 className="font-heading text-base font-semibold">
                    Keranjang
                </h2>
                <HoldCartButton
                    empty={lines.length === 0}
                    full={held.length >= MAX_HELD}
                    defaultLabel={defaultLabel(data.customer_name)}
                    onHold={hold}
                />
            </div>

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
                                    {formatRp(l.product.price)} × {l.quantity}
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
                                    {l.quantity === 1 ? <Trash2 /> : <Minus />}
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
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-mono">{formatRp(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <label htmlFor="discount" className="text-muted-foreground">
                        Diskon
                    </label>
                    <div className="flex items-center gap-1">
                        <ToggleGroup
                            size="sm"
                            aria-label="Satuan diskon"
                            value={[discountMode]}
                            onValueChange={(v) => {
                                if (v[0] === 'rp' || v[0] === 'pct')
                                    switchDiscountMode(v[0]);
                            }}
                        >
                            <ToggleGroupItem value="rp">Rp</ToggleGroupItem>
                            <ToggleGroupItem value="pct">%</ToggleGroupItem>
                        </ToggleGroup>
                        {/* Rp: non-digit dibuang — rupiah selalu integer (R5). */}
                        <Input
                            id="discount"
                            inputMode={
                                discountMode === 'pct' ? 'decimal' : 'numeric'
                            }
                            placeholder="0"
                            className="h-8 w-24 text-right font-mono"
                            value={data.discount}
                            aria-invalid={Boolean(errors.discount ?? pctError)}
                            onChange={(e) =>
                                setData(
                                    'discount',
                                    discountMode === 'pct'
                                        ? rapikanPersen(e.target.value)
                                        : hanyaDigit(e.target.value),
                                )
                            }
                        />
                    </div>
                </div>
                {subtotal > 0 && discountNominal > 0 && !pctError && (
                    <p className="text-right text-xs text-muted-foreground">
                        {discountMode === 'pct'
                            ? `${persen}% = ${formatRp(discountNominal)}`
                            : `= ${nominalKePersen(subtotal, discountNominal)}% dari subtotal`}
                    </p>
                )}
                <InputError message={pctError ?? errors.discount} />
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
                    <span className="text-muted-foreground">— opsional</span>
                </label>
                <Input
                    id="customer_name"
                    placeholder="Kosongkan kalau tidak perlu dicatat"
                    value={data.customer_name}
                    onChange={(e) => setData('customer_name', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                    Tanpa nama, transaksi dicatat sebagai walk-in. Nama yang
                    sudah ada di Customer dipakai ulang.
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
                    onChange={(e) => setData('customer_phone', e.target.value)}
                />
                <InputError message={errors.customer_phone} />
            </div>

            <div className="flex flex-col gap-1.5">
                <span className="text-sm">Metode bayar</span>
                <ToggleGroup
                    aria-label="Metode bayar"
                    value={[first.method]}
                    onValueChange={(v) => setMethod(0, v)}
                >
                    {METHODS.map((m) => (
                        <ToggleGroupItem
                            key={m}
                            value={m}
                            disabled={second?.method === m}
                        >
                            {PAYMENT_METHOD_LABEL[m]}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
                {second ? (
                    <div className="flex flex-col gap-2 rounded-lg border p-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                {PAYMENT_METHOD_LABEL[first.method]} (sisa)
                            </span>
                            <span className="font-mono">
                                {split ? formatRp(split[0]) : '—'}
                            </span>
                        </div>
                        <div className="flex flex-col gap-2">
                            <ToggleGroup
                                size="sm"
                                aria-label="Metode pembayaran kedua"
                                value={[second.method]}
                                onValueChange={(v) => setMethod(1, v)}
                            >
                                {METHODS.map((m) => (
                                    <ToggleGroupItem
                                        key={m}
                                        value={m}
                                        disabled={first.method === m}
                                    >
                                        {PAYMENT_METHOD_LABEL[m]}
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                            <div className="flex items-center gap-1">
                                <Input
                                    aria-label="Nominal pembayaran kedua"
                                    inputMode="numeric"
                                    placeholder="0"
                                    className="h-8 min-w-0 flex-1 text-right font-mono"
                                    value={second.amount}
                                    aria-invalid={Boolean(splitError)}
                                    onChange={(e) =>
                                        setData('payments', [
                                            first,
                                            {
                                                ...second,
                                                amount: hanyaDigit(
                                                    e.target.value,
                                                ),
                                            },
                                        ])
                                    }
                                />
                                <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label="Hapus pembayaran kedua"
                                    onClick={() => setData('payments', [first])}
                                >
                                    <Trash2 />
                                </Button>
                            </div>
                        </div>
                        <InputError
                            message={
                                splitError ??
                                errors['payments.1.method'] ??
                                errors['payments.1.amount']
                            }
                        />
                    </div>
                ) : (
                    <Button
                        variant="link"
                        size="sm"
                        className="self-start px-0"
                        disabled={total < 2}
                        onClick={() =>
                            setData('payments', [
                                first,
                                {
                                    // Kasus nyata: tunai + QRIS.
                                    method:
                                        first.method === 'qris'
                                            ? 'cash'
                                            : 'qris',
                                    amount: '',
                                },
                            ])
                        }
                    >
                        + Bagi pembayaran
                    </Button>
                )}
                <InputError
                    message={errors.payments ?? errors['payments.0.method']}
                />
            </div>

            <Button
                size="lg"
                disabled={
                    lines.length === 0 ||
                    processing ||
                    Boolean(pctError) ||
                    // Baris kedua dibuka tapi nominalnya belum valid.
                    (Boolean(second) && !split)
                }
                onClick={submit}
            >
                Simpan & Bayar {total > 0 ? formatRp(total) : ''}
            </Button>
        </aside>
    );

    return (
        <>
            <Head title="POS" />
            <h1 className="sr-only">POS</h1>

            {/*
                Dua kolom sejajar, bukan wizard: 30 detik tidak cukup untuk
                berpindah langkah. Item, keranjang, dan tombol bayar harus
                terlihat serentak.
            */}
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-6 p-6 pb-24 lg:grid-cols-[1fr_22rem] lg:pb-6">
                <section className="flex min-w-0 flex-col gap-4">
                    {/* Tetap terlihat saat menggulir grid di layar sempit. */}
                    <div className="sticky top-0 z-10 bg-background lg:relative lg:z-auto">
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
                                <span className="line-clamp-2 text-sm font-medium">
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

                <div className="flex min-w-0 flex-col gap-4 self-start">
                    <HeldCarts
                        carts={held}
                        products={products}
                        cartActive={data.items.length > 0}
                        onRestore={restore}
                        onDrop={(id) => persistHeld(dropCart(held, id))}
                    />
                    {isDesktop && cart}
                    <TodaySales
                        sales={today_sales}
                        total={today_total}
                        onOpenReceipt={setManualReceipt}
                    />
                </div>
            </div>

            {!isDesktop && (
                <>
                    {/* Tidak menutupi grid saat tertutup — produk tetap target
                        sentuh pertama; pb-24 di grid memberi ruang. */}
                    <Button
                        size="lg"
                        className="fixed inset-x-4 bottom-4 z-40 h-12 shadow-lg"
                        disabled={lines.length === 0}
                        onClick={() => setCartOpen(true)}
                    >
                        Keranjang ({lines.reduce((n, l) => n + l.quantity, 0)})
                        {lines.length > 0 && ` · ${formatRp(total)}`}
                    </Button>
                    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
                        <SheetContent
                            side="bottom"
                            className="max-h-[85svh] overflow-y-auto"
                        >
                            <SheetTitle className="sr-only">
                                Keranjang
                            </SheetTitle>
                            {cart}
                        </SheetContent>
                    </Sheet>
                </>
            )}

            <ReceiptSheet
                receipt={receipt}
                studio={studio}
                onClose={closeReceipt}
            />
        </>
    );
}

Pos.layout = {
    breadcrumbs: [{ title: 'POS', href: posIndex() }],
};
