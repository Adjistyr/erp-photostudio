/**
 * Lepas Aset (dipindah dari halaman Aset ke komponen sendiri, spek 8.1) —
 * aset tidak dihapus; alokasi maintenance berhenti mulai bulan dilepas.
 */

import { useForm } from '@inertiajs/react';
import AssetController from '@/actions/Modules/Asset/Controllers/AssetController';
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
import type { AssetRow } from '@/modules/asset/types';

const DISPOSAL_REASONS = ['Dijual', 'Rusak total', 'Hilang'] as const;
type DisposalReason = (typeof DISPOSAL_REASONS)[number];

interface DisposeForm {
    reason: DisposalReason;
    disposed_on: string;
    sale_price: string;
}

export function DisposeDialog({
    asset: a,
    today,
    onClose,
}: {
    asset: AssetRow;
    today: string;
    onClose: () => void;
}) {
    const form = useForm<DisposeForm>({
        reason: 'Dijual',
        disposed_on: today,
        sale_price: '',
    });
    const { data, setData, errors, processing } = form;
    const sold = data.reason === 'Dijual';

    const submit = () => {
        form.transform((d) => ({
            ...d,
            sale_price: sold && d.sale_price !== '' ? d.sale_price : '0',
        }));
        form.patch(AssetController.dispose(a.id).url, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Lepas Aset — {a.name}</DialogTitle>
                    <DialogDescription>
                        Aset tidak dihapus — riwayat servis dan alokasi
                        bulan-bulan sebelumnya tetap ada. Alokasi maintenance
                        berhenti mulai bulan aset dilepas.
                    </DialogDescription>
                </DialogHeader>

                <FieldGroup>
                    <Field>
                        <FieldLabel>Alasan</FieldLabel>
                        <ToggleGroup
                            value={[data.reason]}
                            onValueChange={(v) => {
                                const r = DISPOSAL_REASONS.find(
                                    (x) => x === v[0],
                                );
                                if (r) setData('reason', r);
                            }}
                        >
                            {DISPOSAL_REASONS.map((r) => (
                                <ToggleGroupItem key={r} value={r}>
                                    {r}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                        <InputError message={errors.reason} />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <FieldLabel htmlFor="dispose-date">
                                Tanggal
                            </FieldLabel>
                            <Input
                                id="dispose-date"
                                type="date"
                                min={a.purchased_on}
                                max={today}
                                value={data.disposed_on}
                                aria-invalid={Boolean(errors.disposed_on)}
                                onChange={(e) =>
                                    setData('disposed_on', e.target.value)
                                }
                            />
                            <InputError message={errors.disposed_on} />
                        </Field>
                        {sold && (
                            <Field>
                                <FieldLabel htmlFor="dispose-price">
                                    Harga jual
                                </FieldLabel>
                                <Input
                                    id="dispose-price"
                                    inputMode="numeric"
                                    className="font-mono"
                                    placeholder="0"
                                    value={data.sale_price}
                                    aria-invalid={Boolean(errors.sale_price)}
                                    onChange={(e) =>
                                        setData(
                                            'sale_price',
                                            hanyaDigit(e.target.value),
                                        )
                                    }
                                />
                                <InputError message={errors.sale_price} />
                            </Field>
                        )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                        {sold
                            ? `Hasil jual masuk dana maintenance untuk membeli pengganti — bukan omzet. Nilai buku saat ini ${formatRp(a.book_value)}.`
                            : 'Tidak ada uang masuk. Kalau perlu pengganti, beli dari dana maintenance atau catat sebagai aset baru.'}
                    </p>
                </FieldGroup>

                <DialogFooter>
                    <DialogClose
                        render={<Button variant="outline">Batal</Button>}
                    />
                    <Button disabled={processing} onClick={submit}>
                        Lepas Aset
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
