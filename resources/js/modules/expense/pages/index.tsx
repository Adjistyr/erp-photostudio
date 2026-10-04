/**
 * Biaya — Biaya Job + Biaya Operasional (prompt 4.11, porting
 * web/app/routes/biaya.tsx).
 *
 * Dua jenis biaya yang sering tertukar, dan tertukarnya merusak laporan:
 *
 * - **Biaya job** menempel ke satu order (fee fotografer, MUA, transport, sewa
 *   lokasi/alat). Ini "HPP jasa" — berbeda tiap job, jadi tidak bisa ditaruh di
 *   katalog. Masuk ke Biaya Langsung dan mengurangi margin lini terkait.
 * - **Biaya operasional** bulanan dan tidak bisa dinisbatkan ke order mana pun
 *   (sewa tempat, listrik, iklan). Masuk setelah Laba Kotor.
 *
 * Dipisah jadi dua tab, bukan satu tabel dengan kolom "jenis": kalau digabung,
 * owner akan mencatat sewa bulanan sebagai biaya job dan margin per lini jadi
 * bohong tanpa ada yang sadar. Yang sengaja TIDAK dilakukan: alokasi overhead
 * ke tiap job (business-flow bagian 7).
 *
 * Beda dari prototype: kedua tab difilter bulan yang sama (prototype
 * menampilkan biaya job semua waktu), supaya "Total keluar" tidak menjumlahkan
 * dua periode berbeda dan angkanya sama dengan Laba Rugi.
 */

import { Head, useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import ExpenseController from '@/actions/Modules/Expense/Controllers/ExpenseController';
import {
    KepalaUang,
    KosongTabel,
    SelKode,
    SelUang,
    TabelData,
} from '@/components/data-table';
import InputError from '@/components/input-error';
import { MonthNav } from '@/components/month-nav';
import { PageActions } from '@/components/page-actions';
import { LineMark } from '@/components/status-order';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatBulan, formatRp, formatTanggal, hanyaDigit } from '@/lib/format';
import { index as expensesIndex } from '@/routes/expenses';
import type { BusinessLine } from '@/types/domain';

type Mode = 'job' | 'operating';

interface JobCostRow {
    id: number;
    incurred_on: string;
    order_number: string;
    customer_name: string | null;
    business_line: BusinessLine;
    category: string;
    description: string;
    amount: number;
}

interface OperatingRow {
    id: number;
    spent_on: string;
    category: string;
    description: string;
    amount: number;
}

interface OrderOption {
    id: number;
    number: string;
    customer_name: string | null;
    service_date: string;
    job_cost: number;
}

interface Props {
    month: string;
    today: string;
    job_costs: JobCostRow[];
    operating_expenses: OperatingRow[];
    totals: { job: number; operating: number };
    orders: OrderOption[];
}

export default function ExpensesIndex(props: Props) {
    const { month, job_costs, operating_expenses, totals } = props;
    const [tab, setTab] = useState<Mode>('job');
    /**
     * Dialog dibuka dengan mode yang mengikuti tab aktif. Owner yang sedang
     * melihat daftar biaya job hampir pasti mau mencatat biaya job — memaksanya
     * memilih jenis lagi adalah langkah yang jawabannya sudah dia berikan.
     */
    const [open, setOpen] = useState(false);

    return (
        <>
            <Head title="Biaya" />
            <h1 className="sr-only">Biaya</h1>

            <PageActions>
                <Button onClick={() => setOpen(true)}>
                    <Plus data-icon="inline-start" />
                    Catat Biaya
                </Button>
            </PageActions>

            <div className="flex flex-col gap-6 p-6">
                <MonthNav
                    month={month}
                    href={(m) => expensesIndex({ query: { month: m } })}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Summary
                        label="Biaya langsung (job)"
                        value={formatRp(totals.job)}
                        note="menempel ke order, mengurangi margin lini"
                    />
                    <Summary
                        label="Biaya operasional"
                        value={formatRp(totals.operating)}
                        note="bulanan, tidak dialokasikan ke lini"
                    />
                    <Summary
                        label={`Total keluar ${formatBulan(month)}`}
                        value={formatRp(totals.job + totals.operating)}
                        note="belum termasuk HPP bahan produk"
                    />
                </div>

                <Tabs
                    value={tab}
                    onValueChange={(v) => {
                        if (v === 'job' || v === 'operating') setTab(v);
                    }}
                >
                    <TabsList>
                        <TabsTrigger value="job">Biaya Job</TabsTrigger>
                        <TabsTrigger value="operating">
                            Biaya Operasional
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent
                        value="job"
                        className="mt-4 flex flex-col gap-3"
                    >
                        {job_costs.length === 0 ? (
                            <KosongTabel
                                kalimat="Belum ada biaya langsung tercatat bulan ini. Catat fee crew, transport, dan sewa setelah acara selesai."
                                aksi={{
                                    label: 'Catat Biaya',
                                    onClick: () => setOpen(true),
                                }}
                            />
                        ) : (
                            <TabelData>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>Order</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Lini</TableHead>
                                        <TableHead>Kategori</TableHead>
                                        <TableHead>Keterangan</TableHead>
                                        <KepalaUang>Nominal</KepalaUang>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {job_costs.map((j) => (
                                        <TableRow key={j.id}>
                                            <TableCell className="whitespace-nowrap">
                                                {formatTanggal(j.incurred_on)}
                                            </TableCell>
                                            <SelKode>{j.order_number}</SelKode>
                                            <TableCell className="whitespace-nowrap">
                                                {j.customer_name ?? 'Walk-in'}
                                            </TableCell>
                                            <TableCell>
                                                <LineMark
                                                    line={j.business_line}
                                                />
                                            </TableCell>
                                            <TableCell>{j.category}</TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {j.description}
                                            </TableCell>
                                            <SelUang nominal={j.amount} />
                                        </TableRow>
                                    ))}
                                </TableBody>
                                <TableFooter>
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="font-semibold"
                                        >
                                            Total biaya job
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-semibold">
                                            {formatRp(totals.job)}
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            </TabelData>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Biaya job dicatat setelah acara, bukan saat deal —
                            nilainya baru pasti setelah dikerjakan, dan ini yang
                            menentukan job benar-benar untung atau tidak.
                        </p>
                    </TabsContent>

                    <TabsContent
                        value="operating"
                        className="mt-4 flex flex-col gap-3"
                    >
                        {operating_expenses.length === 0 ? (
                            <KosongTabel
                                kalimat="Belum ada biaya operasional tercatat bulan ini."
                                aksi={{
                                    label: 'Catat Biaya',
                                    onClick: () => setOpen(true),
                                }}
                            />
                        ) : (
                            <TabelData>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>Kategori</TableHead>
                                        <TableHead>Keterangan</TableHead>
                                        <KepalaUang>Nominal</KepalaUang>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {operating_expenses.map((e) => (
                                        <TableRow key={e.id}>
                                            <TableCell className="whitespace-nowrap">
                                                {formatTanggal(e.spent_on)}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {e.category}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {e.description}
                                            </TableCell>
                                            <SelUang nominal={e.amount} />
                                        </TableRow>
                                    ))}
                                </TableBody>
                                <TableFooter>
                                    <TableRow>
                                        <TableCell
                                            colSpan={3}
                                            className="font-semibold"
                                        >
                                            Total biaya operasional
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-semibold">
                                            {formatRp(totals.operating)}
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            </TabelData>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Biaya operasional tidak dibagi-bagi ke tiap order.
                            Di skala ini, alokasi overhead menambah kerumitan
                            besar dengan manfaat yang tidak terasa — cukup
                            dikurangkan sekali dari laba kotor.
                        </p>
                    </TabsContent>
                </Tabs>
            </div>

            {open && (
                // Remount tiap kali dibuka: form pendek ini selalu diisi dari nol.
                <ExpenseDialog
                    initialMode={tab}
                    today={props.today}
                    orders={props.orders}
                    onClose={() => setOpen(false)}
                />
            )}
        </>
    );
}

ExpensesIndex.layout = {
    breadcrumbs: [{ title: 'Biaya', href: expensesIndex() }],
};

/** Kategori = saran, bukan daftar tertutup di server — bisnis baru jalan sebulan. */
const CATEGORIES: Record<Mode, string[]> = {
    job: ['Crew', 'Transport', 'Sewa alat', 'Sewa lokasi', 'Bahan'],
    operating: [
        'Sewa tempat',
        'Utilitas',
        'Marketing',
        'Gaji tetap',
        'Lain-lain',
    ],
};

interface ExpenseForm {
    order_id: string;
    category: string;
    description: string;
    amount: string;
    date: string;
}

function ExpenseDialog({
    initialMode,
    today,
    orders,
    onClose,
}: {
    initialMode: Mode;
    today: string;
    orders: OrderOption[];
    onClose: () => void;
}) {
    const [mode, setMode] = useState<Mode>(initialMode);
    const form = useForm<ExpenseForm>({
        order_id: '',
        category: '',
        description: '',
        amount: '',
        date: today,
    });
    const { data, setData, processing } = form;
    // Error tanggal berkunci incurred_on / spent_on (nama kolom server), bukan
    // `date` di form — dibaca lewat Record biasa.
    const errors: Record<string, string | undefined> = form.errors;
    const amount = Number(data.amount) || 0;
    const complete =
        amount > 0 &&
        data.category !== '' &&
        (mode === 'operating' || data.order_id !== '');
    const selected = orders.find((o) => String(o.id) === data.order_id);

    const submit = () => {
        form.transform((d) =>
            mode === 'job'
                ? {
                      order_id: d.order_id,
                      category: d.category,
                      description: d.description,
                      amount: d.amount,
                      incurred_on: d.date,
                  }
                : {
                      category: d.category,
                      description: d.description,
                      amount: d.amount,
                      spent_on: d.date,
                  },
        );
        form.post(
            mode === 'job'
                ? ExpenseController.storeJobCost().url
                : ExpenseController.storeOperatingExpense().url,
            { preserveScroll: true, onSuccess: onClose },
        );
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Catat Biaya</DialogTitle>
                    <DialogDescription>
                        Jenisnya menentukan di mana biaya ini muncul di Laba
                        Rugi.
                    </DialogDescription>
                </DialogHeader>

                <FieldGroup>
                    <Field>
                        <FieldLabel>Jenis biaya</FieldLabel>
                        <ToggleGroup
                            value={[mode]}
                            onValueChange={(v) => {
                                if (v[0] !== 'job' && v[0] !== 'operating')
                                    return;
                                setMode(v[0]);
                                setData('category', '');
                            }}
                        >
                            <ToggleGroupItem value="job">
                                Biaya job
                            </ToggleGroupItem>
                            <ToggleGroupItem value="operating">
                                Operasional
                            </ToggleGroupItem>
                        </ToggleGroup>
                        <p className="text-xs text-muted-foreground">
                            {mode === 'job'
                                ? 'Menempel ke satu order dan mengurangi margin lini order itu.'
                                : 'Bulanan, tidak dinisbatkan ke order mana pun. Dikurangkan setelah laba kotor.'}
                        </p>
                        {/*
                            Dua salah catat yang memotong laba dua kali
                            (business-flow 8.2 & 8.4): beli alat/renovasi dicatat
                            sebagai biaya, dan servis alat dicatat sebagai biaya
                            padahal sudah disisihkan lewat dana maintenance.
                            Ditaruh di sini karena di sinilah owner memutuskan
                            "ini biaya".
                        */}
                        <p className="text-xs text-muted-foreground">
                            Beli alat atau renovasi? Itu investasi, bukan biaya.
                            Servis alat dibayar dari dana maintenance. Keduanya
                            dicatat di menu Modal & Bagi Hasil.
                        </p>
                    </Field>

                    {mode === 'job' && (
                        <Field>
                            <FieldLabel htmlFor="order">Order</FieldLabel>
                            <Select
                                items={orders.map((o) => ({
                                    value: String(o.id),
                                    label: `${o.number} · ${o.customer_name ?? 'Walk-in'}`,
                                }))}
                                value={data.order_id}
                                onValueChange={(v) =>
                                    setData('order_id', v ?? '')
                                }
                            >
                                <SelectTrigger
                                    id="order"
                                    className="w-full"
                                    aria-invalid={Boolean(errors.order_id)}
                                >
                                    <SelectValue placeholder="Pilih order" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {orders.map((o) => (
                                            <SelectItem
                                                key={o.id}
                                                value={String(o.id)}
                                            >
                                                {o.number} ·{' '}
                                                {o.customer_name ?? 'Walk-in'} ·{' '}
                                                {formatTanggal(o.service_date)}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <InputError message={errors.order_id} />
                            {selected && (
                                <p className="text-xs text-muted-foreground">
                                    Biaya job {selected.number} saat ini{' '}
                                    {formatRp(selected.job_cost)}.
                                </p>
                            )}
                        </Field>
                    )}

                    <Field>
                        <FieldLabel htmlFor="category">Kategori</FieldLabel>
                        <Select
                            value={data.category}
                            onValueChange={(v) => setData('category', v ?? '')}
                        >
                            <SelectTrigger
                                id="category"
                                className="w-full"
                                aria-invalid={Boolean(errors.category)}
                            >
                                <SelectValue placeholder="Pilih kategori" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {CATEGORIES[mode].map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {c}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <InputError message={errors.category} />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="description">
                            Keterangan{' '}
                            <span className="text-muted-foreground">
                                — opsional
                            </span>
                        </FieldLabel>
                        <Input
                            id="description"
                            placeholder={
                                mode === 'job'
                                    ? 'Fee fotografer utama'
                                    : 'Listrik + internet'
                            }
                            value={data.description}
                            onChange={(e) =>
                                setData('description', e.target.value)
                            }
                        />
                        <InputError message={errors.description} />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <FieldLabel htmlFor="date">Tanggal</FieldLabel>
                            <Input
                                id="date"
                                type="date"
                                max={today}
                                value={data.date}
                                aria-invalid={Boolean(
                                    errors.incurred_on ?? errors.spent_on,
                                )}
                                onChange={(e) =>
                                    setData('date', e.target.value)
                                }
                            />
                            <InputError
                                message={errors.incurred_on ?? errors.spent_on}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="amount">Nominal</FieldLabel>
                            {/* Non-digit dibuang — rupiah di app ini selalu integer (R5). */}
                            <Input
                                id="amount"
                                inputMode="numeric"
                                className="font-mono"
                                placeholder="0"
                                value={data.amount}
                                aria-invalid={Boolean(errors.amount)}
                                onChange={(e) =>
                                    setData(
                                        'amount',
                                        hanyaDigit(e.target.value),
                                    )
                                }
                            />
                            <InputError message={errors.amount} />
                        </Field>
                    </div>
                </FieldGroup>

                <DialogFooter>
                    <DialogClose
                        render={<Button variant="outline">Batal</Button>}
                    />
                    <Button disabled={!complete || processing} onClick={submit}>
                        Simpan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Summary({
    label,
    value,
    note,
}: {
    label: string;
    value: string;
    note: string;
}) {
    return (
        <Card className="p-5">
            <CardHeader className="p-0">
                <CardDescription className="text-xs">{label}</CardDescription>
                <CardTitle className="font-mono text-2xl font-semibold">
                    {value}
                </CardTitle>
            </CardHeader>
            <p className="text-xs text-muted-foreground">{note}</p>
        </Card>
    );
}
