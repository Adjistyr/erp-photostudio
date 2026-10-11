/**
 * Catat Servis (dipindah dari halaman Aset ke komponen sendiri, spek 8.1) —
 * biaya dari dana maintenance, jadwal perawatan dihitung dari tanggal ini.
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
import type { AssetRow, MaintenanceType } from '@/modules/asset/types';

interface ServiceForm {
    type: MaintenanceType;
    description: string;
    performed_on: string;
    cost: string;
}

export function ServiceDialog({
    asset: a,
    today,
    balance,
    onClose,
}: {
    asset: AssetRow;
    today: string;
    balance: number;
    onClose: () => void;
}) {
    const form = useForm<ServiceForm>({
        type: 'routine',
        description: '',
        performed_on: today,
        cost: '',
    });
    const { data, setData, errors, processing } = form;

    const submit = () => {
        form.transform((d) => ({ ...d, cost: d.cost === '' ? '0' : d.cost }));
        form.post(AssetController.storeMaintenance(a.id).url, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Catat Servis — {a.name}</DialogTitle>
                    <DialogDescription>
                        Biayanya diambil dari dana maintenance, bukan dicatat di
                        Biaya. Jadwal perawatan berikutnya dihitung dari tanggal
                        ini.
                    </DialogDescription>
                </DialogHeader>

                <FieldGroup>
                    <Field>
                        <FieldLabel>Jenis</FieldLabel>
                        <ToggleGroup
                            value={[data.type]}
                            onValueChange={(v) => {
                                if (v[0] === 'routine' || v[0] === 'repair')
                                    setData('type', v[0]);
                            }}
                        >
                            <ToggleGroupItem value="routine">
                                Perawatan rutin
                            </ToggleGroupItem>
                            <ToggleGroupItem value="repair">
                                Perbaikan
                            </ToggleGroupItem>
                        </ToggleGroup>
                        <InputError message={errors.type} />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="service-description">
                            Keterangan
                        </FieldLabel>
                        <Input
                            id="service-description"
                            placeholder={
                                data.type === 'routine'
                                    ? 'Head cleaning'
                                    : 'Ganti kipas pendingin'
                            }
                            value={data.description}
                            aria-invalid={Boolean(errors.description)}
                            onChange={(e) =>
                                setData('description', e.target.value)
                            }
                        />
                        <InputError message={errors.description} />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <FieldLabel htmlFor="service-date">
                                Tanggal
                            </FieldLabel>
                            <Input
                                id="service-date"
                                type="date"
                                min={a.purchased_on}
                                max={today}
                                value={data.performed_on}
                                aria-invalid={Boolean(errors.performed_on)}
                                onChange={(e) =>
                                    setData('performed_on', e.target.value)
                                }
                            />
                            <InputError message={errors.performed_on} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="service-cost">
                                Biaya{' '}
                                <span className="text-muted-foreground">
                                    — boleh 0
                                </span>
                            </FieldLabel>
                            <Input
                                id="service-cost"
                                inputMode="numeric"
                                className="font-mono"
                                placeholder="0"
                                value={data.cost}
                                aria-invalid={Boolean(errors.cost)}
                                onChange={(e) =>
                                    setData('cost', hanyaDigit(e.target.value))
                                }
                            />
                            <InputError message={errors.cost} />
                        </Field>
                    </div>

                    <p className="font-mono text-xs text-muted-foreground">
                        Saldo dana maintenance {formatRp(balance)}
                    </p>
                </FieldGroup>

                <DialogFooter>
                    <DialogClose
                        render={<Button variant="outline">Batal</Button>}
                    />
                    <Button
                        disabled={data.description.trim() === '' || processing}
                        onClick={submit}
                    >
                        Simpan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
