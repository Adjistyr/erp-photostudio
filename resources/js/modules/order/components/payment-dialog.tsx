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
import { formatPersen, formatRp, hanyaDigit } from '@/lib/format';
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
                    <div className="flex justify-between rounded-md bg-muted px-3 py-2 text-sm">
                        <span className="text-muted-foreground">
                            Sisa tagihan
                        </span>
                        <span className="font-mono font-medium">
                            {formatRp(order.balance)}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <FieldLabel htmlFor="amount">Nominal</FieldLabel>
                            {/* Non-digit dibuang: "1.250.000" yang ditempel
                                dari mutasi rekening jadi 1250000 (R5). */}
                            <Input
                                id="amount"
                                inputMode="numeric"
                                className="font-mono"
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
                        <Field>
                            <FieldLabel htmlFor="paid_on">Tanggal</FieldLabel>
                            <Input
                                id="paid_on"
                                type="date"
                                max={today()}
                                value={data.paid_on}
                                onChange={(e) =>
                                    setData('paid_on', e.target.value)
                                }
                            />
                            <InputError message={errors.paid_on} />
                        </Field>
                    </div>

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
            <Input
                id="proof"
                type="file"
                accept={PROOF_ACCEPT}
                aria-invalid={Boolean(error)}
                onChange={(e) => onChange(e.target.files?.[0] ?? null)}
            />
            {file && (
                <p className="text-xs text-muted-foreground">
                    {file.name} · {formatUkuran(file.size)}
                </p>
            )}
            <InputError message={error} />
        </Field>
    );
}

function formatUkuran(bytes: number): string {
    return bytes < 1024 * 1024
        ? `${Math.max(1, Math.round(bytes / 1024))} KB`
        : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
