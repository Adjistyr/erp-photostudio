/**
 * Termin pembayaran di form order — lini event saja (spek 6.4). Opsional:
 * tanpa termin, jatuh tempo = tanggal acara seperti biasa. Status termin
 * tidak diisi di sini; server menurunkannya dari pembayaran (FIFO).
 */

import { ChevronDown, Plus, Trash2, TriangleAlert } from 'lucide-react';
import InputError from '@/components/input-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { formatRp, hanyaDigit } from '@/lib/format';
import { scheduleSum, splitThree } from '@/modules/order/lib/schedules';
import type { ScheduleRow } from '@/modules/order/lib/schedules';

/** Server menerima 2–6 termin. */
const MAX_TERMIN = 6;

export function ScheduleEditor({
    rows,
    onChange,
    total,
    serviceDate,
    errors,
    notice,
}: {
    rows: ScheduleRow[];
    onChange: (rows: ScheduleRow[]) => void;
    total: number;
    serviceDate: string;
    errors: Record<string, string | undefined>;
    /** Peringatan aturan 5 di Ubah Order (termin akan dihapus). */
    notice?: string;
}) {
    const update = (key: number, patch: Partial<ScheduleRow>) =>
        onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    return (
        <Collapsible
            defaultOpen={rows.length > 0}
            className="flex min-w-0 flex-col rounded-lg border"
        >
            <CollapsibleTrigger
                render={
                    <Button
                        variant="ghost"
                        className="group h-auto w-full justify-between rounded-lg px-5 py-4"
                    />
                }
            >
                <span className="font-heading text-base font-semibold">
                    Termin pembayaran{' '}
                    <span className="text-sm font-normal text-muted-foreground">
                        {rows.length > 0
                            ? `— ${rows.length} termin`
                            : '— opsional'}
                    </span>
                </span>
                <ChevronDown className="transition-transform group-data-[panel-open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="flex flex-col gap-3 px-5 pb-5">
                    <p className="text-xs text-muted-foreground">
                        Untuk event besar yang dibayar bertahap. Piutang dan
                        pesan tagihan memakai termin terdekat yang belum lunas;
                        pembayaran menutup termin dari yang paling awal.
                    </p>
                    {notice && (
                        <Alert variant="destructive">
                            <TriangleAlert />
                            <AlertDescription>{notice}</AlertDescription>
                        </Alert>
                    )}

                    {rows.map((r, i) => (
                        <div key={r.key} className="flex flex-col gap-1">
                            <div className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[minmax(0,10rem)_10rem_1fr_auto]">
                                <Input
                                    aria-label={`Label termin ${i + 1}`}
                                    placeholder={`Termin ${i + 1}`}
                                    maxLength={50}
                                    value={r.label}
                                    onChange={(e) =>
                                        update(r.key, { label: e.target.value })
                                    }
                                    className="max-sm:col-span-2"
                                />
                                <Input
                                    type="date"
                                    aria-label={`Jatuh tempo termin ${i + 1}`}
                                    value={r.due_on}
                                    aria-invalid={Boolean(
                                        errors[`schedules.${i}.due_on`],
                                    )}
                                    onChange={(e) =>
                                        update(r.key, {
                                            due_on: e.target.value,
                                        })
                                    }
                                />
                                <Input
                                    inputMode="numeric"
                                    aria-label={`Nominal termin ${i + 1}`}
                                    placeholder="0"
                                    className="font-mono max-sm:col-start-1"
                                    value={r.amount}
                                    aria-invalid={Boolean(
                                        errors[`schedules.${i}.amount`],
                                    )}
                                    onChange={(e) =>
                                        update(r.key, {
                                            amount: hanyaDigit(e.target.value),
                                        })
                                    }
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Hapus termin ${i + 1}`}
                                    onClick={() =>
                                        onChange(
                                            rows.filter((x) => x.key !== r.key),
                                        )
                                    }
                                >
                                    <Trash2 />
                                </Button>
                            </div>
                            <InputError
                                message={
                                    errors[`schedules.${i}.due_on`] ??
                                    errors[`schedules.${i}.amount`] ??
                                    errors[`schedules.${i}.label`]
                                }
                            />
                        </div>
                    ))}

                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={total <= 0 || serviceDate === ''}
                            onClick={() =>
                                onChange(splitThree(total, serviceDate, today))
                            }
                        >
                            Bagi 3 (DP 30% · 50% H-7 · sisa H-1)
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={rows.length >= MAX_TERMIN}
                            onClick={() =>
                                onChange([
                                    ...rows,
                                    {
                                        key: Date.now(),
                                        due_on: '',
                                        amount: '',
                                        label: '',
                                    },
                                ])
                            }
                        >
                            <Plus data-icon="inline-start" />
                            Tambah termin
                        </Button>
                    </div>
                    {rows.length === 1 && (
                        <p className="text-xs text-muted-foreground">
                            Minimal 2 termin — satu termin sama dengan tanpa
                            termin.
                        </p>
                    )}
                    <InputError message={errors.schedules} />
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

/** Ringkasan kanan: Σ termin vs total, selisihnya langsung terlihat. */
export function ScheduleSummary({
    rows,
    total,
}: {
    rows: ScheduleRow[];
    total: number;
}) {
    if (rows.length === 0) return null;
    const diff = scheduleSum(rows) - total;

    return (
        <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
                <span>Jumlah {rows.length} termin</span>
                <span className="font-mono">{formatRp(scheduleSum(rows))}</span>
            </div>
            <div
                className={`flex justify-between ${diff === 0 ? 'text-success' : 'text-destructive'}`}
            >
                <span>
                    {diff === 0
                        ? 'Termin pas dengan total'
                        : diff < 0
                          ? 'Termin kurang dari total'
                          : 'Termin lebih dari total'}
                </span>
                <span className="font-mono">{formatRp(Math.abs(diff))}</span>
            </div>
        </div>
    );
}
