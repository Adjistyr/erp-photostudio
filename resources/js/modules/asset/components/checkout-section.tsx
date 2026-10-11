/**
 * Peminjaman alat ke event di halaman detail aset (spek 8.4): siapa membawa,
 * untuk order mana, kapan kembali. Bukan catatan uang — salah catat boleh
 * dihapus.
 */

import { useForm } from '@inertiajs/react';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import AssetCheckoutController from '@/actions/Modules/Asset/Controllers/AssetCheckoutController';
import { ConfirmDelete } from '@/components/confirm-delete';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { formatTanggal, hanyaDigit } from '@/lib/format';
import { defaultDueBack } from '@/modules/asset/lib/checkout';
import type {
    AssetCheckout,
    AssetDetail,
    OrderOption,
} from '@/modules/asset/types';

/** Nilai Select "tanpa order" — Base UI Select tidak memakai string kosong. */
const NO_ORDER = 'none';

export function CheckoutSection({
    asset: a,
    orders,
    today,
}: {
    asset: AssetDetail;
    orders: OrderOption[];
    today: string;
}) {
    const [lending, setLending] = useState(false);
    const [returning, setReturning] = useState<AssetCheckout | null>(null);
    const open = a.checkouts.filter((c) => c.returned_on === null);
    const history = a.checkouts.filter((c) => c.returned_on !== null);
    // Alasan tombol nonaktif ditulis, bukan disembunyikan.
    const blocked = a.disposed_on
        ? 'Aset sudah dilepas.'
        : a.status === 'broken'
          ? 'Aset sedang rusak.'
          : a.available_units === 0
            ? 'Semua unit sedang dipinjam.'
            : null;

    return (
        <section className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">
                    Peminjaman{' '}
                    <span className="font-normal text-muted-foreground">
                        · tersedia {a.available_units} dari {a.units} unit
                    </span>
                </h3>
                <div className="flex items-center gap-2">
                    {blocked && (
                        <span className="text-xs text-muted-foreground">
                            {blocked}
                        </span>
                    )}
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={blocked !== null}
                        onClick={() => setLending(true)}
                    >
                        <LogOut data-icon="inline-start" />
                        Pinjamkan
                    </Button>
                </div>
            </div>
            <div className="overflow-hidden rounded-lg border">
                {a.checkouts.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                        Belum pernah dibawa keluar.
                    </p>
                ) : (
                    <ul className="flex flex-col divide-y text-sm">
                        {[...open, ...history].map((c) => (
                            <li
                                key={c.id}
                                className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 ${c.returned_on ? 'text-muted-foreground' : ''}`}
                            >
                                <span className="font-medium text-foreground">
                                    {c.quantity} × {c.holder}
                                </span>
                                {c.order && (
                                    <span>
                                        <span className="font-mono">
                                            {c.order.number}
                                        </span>
                                        {c.order.customer_name
                                            ? ` · ${c.order.customer_name}`
                                            : ''}
                                    </span>
                                )}
                                <span className="text-xs">
                                    keluar {formatTanggal(c.checked_out_on)}
                                    {c.returned_on
                                        ? ` · kembali ${formatTanggal(c.returned_on)}`
                                        : c.due_back_on
                                          ? ` · rencana kembali ${formatTanggal(c.due_back_on)}`
                                          : ''}
                                </span>
                                {c.overdue && (
                                    <Badge variant="destructive">
                                        Lewat jadwal
                                    </Badge>
                                )}
                                {c.note && (
                                    <span className="w-full text-xs text-muted-foreground">
                                        {c.note}
                                    </span>
                                )}
                                <span className="ml-auto flex items-center gap-1">
                                    {c.returned_on === null && (
                                        <Button
                                            size="sm"
                                            onClick={() => setReturning(c)}
                                        >
                                            Kembalikan
                                        </Button>
                                    )}
                                    <ConfirmDelete
                                        url={
                                            AssetCheckoutController.destroy({
                                                asset: a.id,
                                                checkout: c.id,
                                            }).url
                                        }
                                        label={`peminjaman ${c.holder}`}
                                        title="Hapus catatan peminjaman?"
                                        description="Hanya untuk salah catat — riwayat peminjaman ini hilang."
                                        hint=""
                                    />
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {lending && (
                <LendDialog
                    asset={a}
                    orders={orders}
                    today={today}
                    onClose={() => setLending(false)}
                />
            )}
            {returning && (
                <ReturnDialog
                    assetId={a.id}
                    checkout={returning}
                    today={today}
                    onClose={() => setReturning(null)}
                />
            )}
        </section>
    );
}

interface LendForm {
    quantity: string;
    holder: string;
    order_id: string;
    checked_out_on: string;
    due_back_on: string;
    note: string;
}

function LendDialog({
    asset: a,
    orders,
    today,
    onClose,
}: {
    asset: AssetDetail;
    orders: OrderOption[];
    today: string;
    onClose: () => void;
}) {
    const form = useForm<LendForm>({
        quantity: '1',
        holder: '',
        order_id: NO_ORDER,
        checked_out_on: today,
        due_back_on: '',
        note: '',
    });
    const { data, setData, errors, processing } = form;
    const orderItems = [
        { value: NO_ORDER, label: 'Tanpa order' },
        ...orders.map((o) => ({
            value: String(o.id),
            label: `${o.number}${o.customer_name ? ` · ${o.customer_name}` : ''} · ${formatTanggal(o.service_date)}`,
        })),
    ];

    const submit = () => {
        form.transform((d) => ({
            ...d,
            order_id: d.order_id === NO_ORDER ? null : d.order_id,
            due_back_on: d.due_back_on || null,
        }));
        form.post(AssetCheckoutController.store(a.id).url, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Pinjamkan — {a.name}</DialogTitle>
                    <DialogDescription>
                        Tersedia {a.available_units} dari {a.units} unit. Catat
                        sebelum alat dibawa keluar supaya terlihat mana yang
                        belum kembali.
                    </DialogDescription>
                </DialogHeader>
                <FieldGroup>
                    <div className="grid grid-cols-[6rem_1fr] gap-4">
                        <Field>
                            <FieldLabel htmlFor="lend-qty">Jumlah</FieldLabel>
                            <Input
                                id="lend-qty"
                                inputMode="numeric"
                                className="font-mono"
                                value={data.quantity}
                                aria-invalid={Boolean(errors.quantity)}
                                onChange={(e) =>
                                    setData(
                                        'quantity',
                                        hanyaDigit(e.target.value),
                                    )
                                }
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="lend-holder">
                                Dibawa oleh
                            </FieldLabel>
                            <Input
                                id="lend-holder"
                                autoFocus
                                maxLength={100}
                                placeholder="Nama crew"
                                value={data.holder}
                                aria-invalid={Boolean(errors.holder)}
                                onChange={(e) =>
                                    setData('holder', e.target.value)
                                }
                            />
                        </Field>
                    </div>
                    <InputError message={errors.quantity ?? errors.holder} />
                    <Field>
                        <FieldLabel htmlFor="lend-order">
                            Untuk order{' '}
                            <span className="text-muted-foreground">
                                — opsional
                            </span>
                        </FieldLabel>
                        {/* `items` supaya trigger menampilkan label (gotcha #10). */}
                        <Select
                            items={orderItems}
                            value={data.order_id}
                            onValueChange={(v) => {
                                const o = orders.find(
                                    (x) => String(x.id) === v,
                                );
                                // Rencana kembali default = tanggal order (aturan 3),
                                // tapi tidak sebelum tanggal keluar — order yang sudah
                                // lewat (opsi mencakup 30 hari ke belakang) membuat
                                // tanggal tidak sah.
                                setData((d) => ({
                                    ...d,
                                    order_id: v ?? NO_ORDER,
                                    due_back_on:
                                        o && d.due_back_on === ''
                                            ? defaultDueBack(
                                                  o.service_date,
                                                  d.checked_out_on,
                                              )
                                            : d.due_back_on,
                                }));
                            }}
                        >
                            <SelectTrigger id="lend-order" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {orderItems.map((o) => (
                                        <SelectItem
                                            key={o.value}
                                            value={o.value}
                                        >
                                            {o.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <InputError message={errors.order_id} />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <FieldLabel htmlFor="lend-out">
                                Tanggal keluar
                            </FieldLabel>
                            <Input
                                id="lend-out"
                                type="date"
                                max={today}
                                value={data.checked_out_on}
                                onChange={(e) =>
                                    setData('checked_out_on', e.target.value)
                                }
                            />
                            <InputError message={errors.checked_out_on} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="lend-due">
                                Rencana kembali
                            </FieldLabel>
                            <Input
                                id="lend-due"
                                type="date"
                                min={data.checked_out_on}
                                value={data.due_back_on}
                                onChange={(e) =>
                                    setData('due_back_on', e.target.value)
                                }
                            />
                            <InputError message={errors.due_back_on} />
                        </Field>
                    </div>
                    <Field>
                        <FieldLabel htmlFor="lend-note">
                            Catatan{' '}
                            <span className="text-muted-foreground">
                                — opsional
                            </span>
                        </FieldLabel>
                        <Input
                            id="lend-note"
                            maxLength={255}
                            placeholder="Kelengkapan: tas, charger, 2 baterai…"
                            value={data.note}
                            onChange={(e) => setData('note', e.target.value)}
                        />
                    </Field>
                </FieldGroup>
                <DialogFooter>
                    <DialogClose
                        render={<Button variant="outline">Batal</Button>}
                    />
                    <Button
                        disabled={
                            data.holder.trim() === '' ||
                            data.quantity === '' ||
                            processing
                        }
                        onClick={submit}
                    >
                        Pinjamkan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ReturnDialog({
    assetId,
    checkout: c,
    today,
    onClose,
}: {
    assetId: number;
    checkout: AssetCheckout;
    today: string;
    onClose: () => void;
}) {
    const form = useForm({ returned_on: today, broken: false });
    const { data, setData, errors, processing } = form;

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Kembalikan {c.quantity} unit dari {c.holder}
                    </DialogTitle>
                    <DialogDescription>
                        Seluruh catatan ini dikembalikan. Bila sebagian masih
                        dibawa, catat ulang sisanya setelah ini.
                    </DialogDescription>
                </DialogHeader>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="return-date">
                            Tanggal kembali
                        </FieldLabel>
                        <Input
                            id="return-date"
                            type="date"
                            min={c.checked_out_on}
                            max={today}
                            value={data.returned_on}
                            onChange={(e) =>
                                setData('returned_on', e.target.value)
                            }
                        />
                        <InputError message={errors.returned_on} />
                    </Field>
                    <Field orientation="horizontal">
                        <Checkbox
                            id="return-broken"
                            checked={data.broken}
                            onCheckedChange={(v) => setData('broken', v)}
                        />
                        <FieldLabel
                            htmlFor="return-broken"
                            className="font-normal"
                        >
                            Kembali dalam keadaan rusak — tandai aset Rusak
                        </FieldLabel>
                    </Field>
                </FieldGroup>
                <DialogFooter>
                    <DialogClose
                        render={<Button variant="outline">Batal</Button>}
                    />
                    <Button
                        disabled={processing}
                        onClick={() =>
                            form.patch(
                                AssetCheckoutController.return({
                                    asset: assetId,
                                    checkout: c.id,
                                }).url,
                                { preserveScroll: true, onSuccess: onClose },
                            )
                        }
                    >
                        Kembalikan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
