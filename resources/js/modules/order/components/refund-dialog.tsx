/**
 * Dialog Catat Retur / pengembalian uang (spek 4.2, K3). Uang KELUAR pada
 * tanggal pengembalian — mengurangi omzet bulan itu, bukan bulan pembayaran
 * asli (yang mungkin sudah tutup buku). Status bayar & sisa tagihan tidak
 * berubah: customer tidak berutang lagi karena uangnya dikembalikan.
 */

import { useForm } from '@inertiajs/react';
import OrderRefundController from '@/actions/Modules/Order/Controllers/OrderRefundController';
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
import { formatRp, hanyaDigit } from '@/lib/format';
import { PAYMENT_METHOD_LABEL } from '@/modules/order/types';
import type { PaymentMethod } from '@/modules/order/types';

const METHODS: PaymentMethod[] = ['cash', 'transfer', 'qris'];

/** Tanggal lokal hari ini "YYYY-MM-DD" — bukan toISOString (UTC, bisa geser hari). */
function today(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function RefundDialog({
    order,
    onClose,
}: {
    order: {
        id: number;
        number: string;
        customer_name: string | null;
        refundable: number;
    };
    onClose: () => void;
}) {
    const form = useForm({
        amount: '',
        method: 'cash' as PaymentMethod,
        refunded_on: today(),
        reason: '',
    });
    const { data, setData, errors, processing } = form;
    const amount = Number(data.amount) || 0;

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Catat Retur</DialogTitle>
                    <DialogDescription>
                        {order.number} — {order.customer_name ?? 'Walk-in'}.
                        Uang yang dikembalikan mengurangi omzet tanggal
                        pengembalian; status bayar tidak berubah.
                    </DialogDescription>
                </DialogHeader>

                <FieldGroup>
                    <div className="flex justify-between rounded-md bg-muted px-3 py-2 text-sm">
                        <span className="text-muted-foreground">
                            Bisa dikembalikan
                        </span>
                        <span className="font-mono font-medium">
                            {formatRp(order.refundable)}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <FieldLabel htmlFor="refund_amount">
                                Jumlah
                            </FieldLabel>
                            <Input
                                id="refund_amount"
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
                            <FieldLabel htmlFor="refunded_on">
                                Tanggal
                            </FieldLabel>
                            <Input
                                id="refunded_on"
                                type="date"
                                max={today()}
                                value={data.refunded_on}
                                onChange={(e) =>
                                    setData('refunded_on', e.target.value)
                                }
                            />
                            <InputError message={errors.refunded_on} />
                        </Field>
                    </div>

                    <Field>
                        <FieldLabel>Dikembalikan lewat</FieldLabel>
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

                    <Field>
                        <FieldLabel htmlFor="refund_reason">Alasan</FieldLabel>
                        <Input
                            id="refund_reason"
                            placeholder="Cetak salah, DP dikembalikan, …"
                            value={data.reason}
                            aria-invalid={Boolean(errors.reason)}
                            onChange={(e) => setData('reason', e.target.value)}
                        />
                        <InputError message={errors.reason} />
                    </Field>
                </FieldGroup>

                <DialogFooter>
                    <DialogClose
                        render={<Button variant="outline">Batal</Button>}
                    />
                    <Button
                        variant="destructive"
                        disabled={
                            amount <= 0 ||
                            amount > order.refundable ||
                            data.reason.trim() === '' ||
                            processing
                        }
                        onClick={() =>
                            form.post(
                                OrderRefundController.store(order.id).url,
                                {
                                    preserveScroll: true,
                                    onSuccess: onClose,
                                },
                            )
                        }
                    >
                        Catat Retur
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
