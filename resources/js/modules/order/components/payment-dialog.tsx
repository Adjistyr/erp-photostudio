/**
 * Dialog Catat Pembayaran (prompt 4.10, porting
 * web/app/components/dialog-catat-pembayaran.tsx). Komponen bersama — dipakai
 * Detail Order dan nanti layar Piutang, supaya tombol "Catat Pembayaran" di
 * mana pun tidak melempar owner ke layar lain.
 *
 * Yang diperagakan: status bayar TIDAK diinput. Pratinjau di bawah form
 * menunjukkan status yang akan dihasilkan angka yang baru diketik.
 */

import { useForm } from '@inertiajs/react';
import { Paperclip } from 'lucide-react';
import OrderPaymentController from '@/actions/Modules/Order/Controllers/OrderPaymentController';
import InputError from '@/components/input-error';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatPersen, formatRp } from '@/lib/format';
import { AmountPercentField } from '@/components/amount-percent-field';
import { PAYMENT_METHOD_LABEL } from '@/modules/order/types';
import type { PayableOrder, PaymentMethod } from '@/modules/order/types';

const METHODS: PaymentMethod[] = ['cash', 'transfer', 'qris'];

/** Sama dengan validasi server (StorePaymentRequest, spek 6.7). */
export const PROOF_ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf';

/** Bukti hanya untuk uang yang lewat bank — tunai tidak punya bukti. */
export function acceptsProof(method: PaymentMethod): boolean {
    return method !== 'cash';
}

interface PaymentForm {
    amount: string;
    method: PaymentMethod;
    paid_on: string;
    proof: File | null;
}

/** Tanggal lokal hari ini "YYYY-MM-DD" — bukan toISOString (UTC, bisa geser hari). */
function today(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function PaymentDialog({
    order,
    onClose,
}: {
    order: PayableOrder;
    onClose: () => void;
}) {
    // Prefill pelunasan penuh: kasus paling sering; owner tinggal mengubahnya
    // kalau customer bayar sebagian.
    const form = useForm<PaymentForm>({
        amount: String(order.balance),
        method: 'transfer',
        paid_on: today(),
        proof: null,
    });
    const { data, setData, errors, processing } = form;
    const amount = Number(data.amount) || 0;

    const submit = () => {
        form.transform((d) => ({
            ...d,
            proof: acceptsProof(d.method) ? d.proof : null,
        }));
        form.post(OrderPaymentController.store(order.id).url, {
            preserveScroll: true,
            // File bukti → multipart.
            forceFormData: true,
            onSuccess: onClose,
        });
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Catat Pembayaran</DialogTitle>
                    <DialogDescription>
                        {order.number} — {order.customer_name ?? 'Walk-in'}
                    </DialogDescription>
                </DialogHeader>

                <FieldGroup>
                    <div className="flex justify-between rounded-2xl bg-muted px-4 py-2.5 text-sm">
                        <span className="text-muted-foreground">
                            Sisa tagihan
                        </span>
                        <span className="font-medium">
                            {formatRp(order.balance)}
                        </span>
                    </div>

                    <Field>
                        <FieldLabel htmlFor="amount">Nominal</FieldLabel>
                        {/* Rp atau % dari total order; yang dikirim selalu
                            nominal, dijepit ke sisa tagihan. */}
                        <AmountPercentField
                            id="amount"
                            total={order.total}
                            cap={order.balance}
                            value={data.amount}
                            invalid={Boolean(errors.amount)}
                            onValueChange={(v) => setData('amount', v)}
                        />
                        <InputError message={errors.amount} />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="paid_on">Tanggal</FieldLabel>
                        <Input
                            id="paid_on"
                            type="date"
                            max={today()}
                            value={data.paid_on}
                            onChange={(e) => setData('paid_on', e.target.value)}
                        />
                        <InputError message={errors.paid_on} />
                    </Field>

                    <Field>
                        <FieldLabel>Metode</FieldLabel>
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
                    </Field>

                    {acceptsProof(data.method) && (
                        <ProofField
                            file={data.proof}
                            error={errors.proof}
                            onChange={(f) => setData('proof', f)}
                        />
                    )}

                    {amount > 0 && amount <= order.balance && (
                        <p className="text-xs text-muted-foreground">
                            Setelah dicatat, status order jadi{' '}
                            <span className="font-medium text-foreground">
                                {amount >= order.balance
                                    ? 'Lunas'
                                    : `DP ${formatPersen((order.paid + amount) / order.total)}`}
                            </span>
                            . Status bayar tidak diinput — dihitung dari total
                            pembayaran.
                        </p>
                    )}
                </FieldGroup>

                <DialogFooter>
                    <DialogClose
                        render={<Button variant="outline">Batal</Button>}
                    />
                    <Button
                        disabled={amount <= 0 || processing}
                        onClick={submit}
                    >
                        Simpan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/** Unggah bukti transfer/QRIS (opsional, ≤ 2 MB — batas dicek server). */
export function ProofField({
    file,
    error,
    onChange,
}: {
    file: File | null;
    error?: string;
    onChange: (file: File | null) => void;
}) {
    return (
        <Field>
            <FieldLabel htmlFor="proof">Bukti transfer (opsional)</FieldLabel>
            {/* Input file asli disembunyikan: tombolnya bertuliskan "Choose
                File / No file chosen" mengikuti bahasa browser, bukan UI. */}
            <label className="flex min-w-0 cursor-pointer items-center gap-2 rounded-4xl border border-input bg-card py-1 pr-3 pl-1 text-sm focus-within:ring-[3px] focus-within:ring-ring/50 has-aria-invalid:border-destructive">
                <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-4xl bg-muted px-3 font-medium">
                    <Paperclip className="size-3.5" aria-hidden="true" />
                    {file ? 'Ganti file' : 'Pilih file'}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                    {file
                        ? `${file.name} · ${formatUkuran(file.size)}`
                        : 'JPG, PNG, WEBP, atau PDF · maks 2 MB'}
                </span>
                <input
                    id="proof"
                    type="file"
                    accept={PROOF_ACCEPT}
                    className="sr-only"
                    aria-invalid={Boolean(error)}
                    onChange={(e) => onChange(e.target.files?.[0] ?? null)}
                />
            </label>
            <InputError message={error} />
        </Field>
    );
}

function formatUkuran(bytes: number): string {
    return bytes < 1024 * 1024
        ? `${Math.max(1, Math.round(bytes / 1024))} KB`
        : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
