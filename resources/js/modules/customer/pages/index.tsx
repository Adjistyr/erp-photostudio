/**
 * Customer — daftar + detail + tambah/edit (prompt 4.3 & 4.4, porting
 * web/app/routes/customer.tsx).
 *
 * Bukan CRM sales pipeline — client hanya butuh pendataan customer untuk
 * blast (business-flow 5.6). Detail memakai Sheet, bukan halaman: owner
 * membandingkan beberapa customer berurutan tanpa kehilangan posisi scroll &
 * filter di tabel.
 */

import { Head, useForm } from '@inertiajs/react';
import { Pencil, Plus, Send } from 'lucide-react';
import { useState } from 'react';
import CustomerController from '@/actions/Modules/Customer/Controllers/CustomerController';
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
import {
    LineMark,
    PaymentBadge,
    WorkProgress,
    orderRowClass,
} from '@/components/status-order';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import { formatJadwal, formatRp, formatTanggal, keNomorWa } from '@/lib/format';
import { index as customersIndex } from '@/routes/customers';
import { BUSINESS_LINES } from '@/types/domain';
import type { BusinessLine, PaymentStatus, WorkStatus } from '@/types/domain';

/** Order di riwayat customer — status bayar & persen DP dihitung server. */
interface CustomerOrder {
    id: number;
    number: string;
    items_summary: string;
    service_date: string;
    service_time: string | null;
    total: number;
    balance: number;
    work_status: WorkStatus;
    payment_status: PaymentStatus;
    paid_percent: number;
}

/** Bentuk props dari CustomerController@index. */
interface CustomerSummary {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    source: string | null;
    notes: string | null;
    /** Order non-Batal. */
    order_count: number;
    order_value: number;
    paid: number;
    /** Sisa tagihan order non-Batal. */
    outstanding: number;
    lines: BusinessLine[];
    last_transaction: string | null;
    /** SEMUA order termasuk Batal (riwayat), terbaru dulu. */
    orders: CustomerOrder[];
}

type Filter = 'all' | BusinessLine;

const FILTER_LABEL: Record<BusinessLine, string> = {
    studio: 'Pernah studio',
    event: 'Pernah event',
    retail: 'Pernah retail',
};

export default function CustomersIndex({
    customers,
    sources,
}: {
    customers: CustomerSummary[];
    sources: string[];
}) {
    const [filter, setFilter] = useState<Filter>('all');
    // Simpan id, bukan objek: setelah edit, Sheet membaca data terbaru dari props.
    const [detailId, setDetailId] = useState<number | null>(null);
    /** null = tertutup · 'new' = tambah · CustomerSummary = edit. */
    const [editing, setEditing] = useState<CustomerSummary | 'new' | null>(
        null,
    );

    const visible =
        filter === 'all'
            ? customers
            : customers.filter((c) => c.lines.includes(filter));
    const detail = customers.find((c) => c.id === detailId) ?? null;

    return (
        <>
            <Head title="Customer" />
            <h1 className="sr-only">Customer</h1>
            <PageActions>
                {/*
                    Tambah ada meski customer terkumpul dari order: owner sering
                    dapat kontak lebih dulu (DM Instagram, teman) sebelum ada
                    transaksi sama sekali.
                */}
                <Button onClick={() => setEditing('new')}>
                    <Plus data-icon="inline-start" />
                    Tambah Customer
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
                                {FILTER_LABEL[l]}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                {visible.length === 0 ? (
                    <KosongTabel
                        kalimat="Customer akan terkumpul otomatis dari setiap transaksi."
                        aksi={{
                            label: 'Tambah Customer',
                            onClick: () => setEditing('new'),
                        }}
                    />
                ) : (
                    <TabelData>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama</TableHead>
                                <TableHead>No HP</TableHead>
                                <TableHead>Sumber</TableHead>
                                <TableHead>Pernah beli</TableHead>
                                <TableHead className="text-right">
                                    Order
                                </TableHead>
                                <KepalaUang>Nilai order</KepalaUang>
                                {/*
                                    "Sudah dibayar" bersebelahan dengan "Nilai
                                    order": di basis kas, customer dengan nilai
                                    order terbesar belum tentu yang paling banyak
                                    menyetor uang.
                                */}
                                <KepalaUang>Sudah dibayar</KepalaUang>
                                <TableHead>Transaksi terakhir</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map((c) => (
                                <TableRow
                                    key={c.id}
                                    className="cursor-pointer"
                                    onClick={() => setDetailId(c.id)}
                                >
                                    <TableCell className="font-medium whitespace-nowrap">
                                        {c.name}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs whitespace-nowrap">
                                        {c.phone ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {c.source ?? '—'}
                                    </TableCell>
                                    <TableCell>
                                        <span className="flex gap-3">
                                            {c.lines.length === 0 ? (
                                                <span className="text-muted-foreground">
                                                    —
                                                </span>
                                            ) : (
                                                c.lines.map((l) => (
                                                    <LineMark
                                                        key={l}
                                                        line={l}
                                                    />
                                                ))
                                            )}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        {c.order_count}
                                    </TableCell>
                                    <SelUang nominal={c.order_value} />
                                    <SelUang nominal={c.paid} />
                                    <TableCell className="whitespace-nowrap">
                                        {c.last_transaction
                                            ? formatTanggal(c.last_transaction)
                                            : '—'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </TabelData>
                )}

                <p className="text-xs text-muted-foreground">
                    Customer terkumpul otomatis dari transaksi. Order yang
                    dibatalkan tidak menaikkan nilai order, tapi tetap muncul di
                    riwayat.
                </p>
            </div>

            <CustomerSheet
                customer={detail}
                onClose={() => setDetailId(null)}
                onEdit={(c) => setEditing(c)}
            />
            {editing && (
                <CustomerDialog
                    key={editing === 'new' ? 'new' : editing.id}
                    customer={editing === 'new' ? null : editing}
                    sources={sources}
                    onClose={() => setEditing(null)}
                />
            )}
        </>
    );
}

CustomersIndex.layout = {
    breadcrumbs: [{ title: 'Customer', href: customersIndex() }],
};

/** "Tanggal" order: jam hanya kalau sumbernya punya jam (retail tidak). */
function orderSchedule(o: CustomerOrder): string {
    return formatJadwal(
        o.service_time ? `${o.service_date}T${o.service_time}` : o.service_date,
    );
}

function CustomerSheet({
    customer,
    onClose,
    onEdit,
}: {
    customer: CustomerSummary | null;
    onClose: () => void;
    onEdit: (c: CustomerSummary) => void;
}) {
    return (
        <Sheet open={customer !== null} onOpenChange={(o) => !o && onClose()}>
            {/*
                Lebar ditulis dengan prefix varian yang SAMA dengan bawaan
                sheet (data-[side=right]:sm:max-w-sm). `sm:max-w-2xl` biasa
                kalah spesifisitas dan tidak di-merge tailwind-merge, jadi
                panel tetap sempit dan isi tabel terpotong.
            */}
            <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-2xl">
                {customer && (
                    <>
                        <SheetHeader>
                            <SheetTitle>{customer.name}</SheetTitle>
                            <SheetDescription>
                                {customer.phone ?? 'Tanpa nomor HP'}
                                {customer.email ? ` · ${customer.email}` : ''}
                                {customer.source
                                    ? ` · dari ${customer.source}`
                                    : ''}
                            </SheetDescription>
                        </SheetHeader>

                        <div className="flex flex-col gap-6 p-4">
                            <div className="grid grid-cols-3 gap-4">
                                <Figure
                                    label="Order"
                                    value={String(customer.order_count)}
                                />
                                <Figure
                                    label="Nilai order"
                                    value={formatRp(customer.order_value)}
                                />
                                <Figure
                                    label="Sisa tagihan"
                                    value={formatRp(customer.outstanding)}
                                    urgent={customer.outstanding > 0}
                                />
                            </div>

                            {customer.notes && (
                                <div className="rounded-md bg-muted p-3 text-sm">
                                    {customer.notes}
                                </div>
                            )}

                            <section className="flex flex-col gap-2">
                                <h3 className="text-sm font-semibold">
                                    Riwayat transaksi
                                </h3>
                                {customer.orders.length === 0 ? (
                                    <p className="rounded-lg border px-3 py-2 text-sm text-muted-foreground">
                                        Belum ada transaksi — kontak ini masih
                                        lead.
                                    </p>
                                ) : (
                                    <div className="overflow-hidden rounded-lg border">
                                        <Table className={KELAS_DENSITY}>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>No</TableHead>
                                                    <TableHead>Item</TableHead>
                                                    <TableHead>
                                                        Tanggal
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        Total
                                                    </TableHead>
                                                    <TableHead>
                                                        Status
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {customer.orders.map((o) => (
                                                    <TableRow
                                                        key={o.id}
                                                        className={orderRowClass(
                                                            o.work_status,
                                                        )}
                                                    >
                                                        <SelKode>
                                                            {o.number}
                                                        </SelKode>
                                                        <TableCell className="max-w-48 truncate text-muted-foreground">
                                                            {o.items_summary}
                                                        </TableCell>
                                                        <TableCell className="whitespace-nowrap">
                                                            {orderSchedule(o)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono">
                                                            {formatRp(o.total)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="flex flex-col items-start gap-1">
                                                                <WorkProgress
                                                                    status={
                                                                        o.work_status
                                                                    }
                                                                />
                                                                <PaymentBadge
                                                                    status={
                                                                        o.payment_status
                                                                    }
                                                                    paidPercent={
                                                                        o.paid_percent
                                                                    }
                                                                />
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </section>

                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => onEdit(customer)}
                                >
                                    <Pencil data-icon="inline-start" />
                                    Edit
                                </Button>
                                {customer.phone && (
                                    <Button
                                        variant="outline"
                                        nativeButton={false}
                                        render={
                                            <a
                                                href={`https://wa.me/${keNomorWa(customer.phone)}`}
                                                target="_blank"
                                                rel="noreferrer"
                                            />
                                        }
                                    >
                                        <Send data-icon="inline-start" />
                                        Buka WhatsApp
                                    </Button>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}

function Figure({
    label,
    value,
    urgent,
}: {
    label: string;
    value: string;
    urgent?: boolean;
}) {
    return (
        <div className="flex flex-col gap-1 rounded-lg border p-3">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span
                className={`font-mono text-lg font-semibold ${urgent ? 'text-destructive' : ''}`}
            >
                {value}
            </span>
        </div>
    );
}

interface CustomerForm {
    name: string;
    phone: string;
    email: string;
    source: string;
    notes: string;
}

function CustomerDialog({
    customer,
    sources,
    onClose,
}: {
    customer: CustomerSummary | null;
    sources: string[];
    onClose: () => void;
}) {
    const form = useForm<CustomerForm>({
        name: customer?.name ?? '',
        phone: customer?.phone ?? '',
        email: customer?.email ?? '',
        source: customer?.source ?? '',
        notes: customer?.notes ?? '',
    });
    const { data, setData, errors, processing } = form;
    const editing = customer !== null;

    const submit = () => {
        const options = { preserveScroll: true, onSuccess: onClose };
        if (editing) {
            form.put(CustomerController.update(customer.id).url, options);
        } else {
            form.post(CustomerController.store().url, options);
        }
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {editing ? 'Edit Customer' : 'Tambah Customer'}
                    </DialogTitle>
                    <DialogDescription>
                        {editing
                            ? 'Perubahan berlaku untuk semua riwayat customer ini.'
                            : 'Untuk kontak yang masuk sebelum ada transaksi. Customer dari transaksi terkumpul sendiri.'}
                    </DialogDescription>
                </DialogHeader>

                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="name">Nama</FieldLabel>
                        <Input
                            id="name"
                            placeholder="Nama customer"
                            value={data.name}
                            aria-invalid={Boolean(errors.name)}
                            onChange={(e) => setData('name', e.target.value)}
                        />
                        <InputError message={errors.name} />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <FieldLabel htmlFor="phone">
                                No HP{' '}
                                <span className="text-muted-foreground">
                                    — opsional
                                </span>
                            </FieldLabel>
                            <Input
                                id="phone"
                                inputMode="tel"
                                className="font-mono"
                                placeholder="0812-3344-5566"
                                value={data.phone}
                                onChange={(e) =>
                                    setData('phone', e.target.value)
                                }
                            />
                            <InputError message={errors.phone} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="email">
                                Email{' '}
                                <span className="text-muted-foreground">
                                    — opsional
                                </span>
                            </FieldLabel>
                            <Input
                                id="email"
                                type="email"
                                placeholder="nama@gmail.com"
                                value={data.email}
                                aria-invalid={Boolean(errors.email)}
                                onChange={(e) =>
                                    setData('email', e.target.value)
                                }
                            />
                            <InputError message={errors.email} />
                        </Field>
                    </div>

                    <Field>
                        <FieldLabel htmlFor="source">
                            Sumber tahu{' '}
                            <span className="text-muted-foreground">
                                — opsional
                            </span>
                        </FieldLabel>
                        <Select
                            value={data.source}
                            onValueChange={(v) => setData('source', v ?? '')}
                        >
                            <SelectTrigger id="source">
                                <SelectValue placeholder="Dari mana tahu studio?" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {sources.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <InputError message={errors.source} />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="notes">
                            Catatan{' '}
                            <span className="text-muted-foreground">
                                — opsional
                            </span>
                        </FieldLabel>
                        <Input
                            id="notes"
                            placeholder="Rencana prewed Desember"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                        />
                        <InputError message={errors.notes} />
                    </Field>

                    {!data.phone.trim() && !data.email.trim() && (
                        <p className="text-xs text-muted-foreground">
                            Tanpa nomor HP maupun email, customer ini tidak akan
                            muncul di daftar blast.
                        </p>
                    )}
                </FieldGroup>

                <DialogFooter>
                    <DialogClose
                        render={<Button variant="outline">Batal</Button>}
                    />
                    <Button
                        disabled={data.name.trim() === '' || processing}
                        onClick={submit}
                    >
                        Simpan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
