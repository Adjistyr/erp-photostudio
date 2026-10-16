/**
 * Komponen paket jasa (spek 6.3) di halaman Edit Katalog: produk + qty per
 * paket. Tersimpan lewat tombol sendiri (PUT `catalog.components.update`,
 * mengganti seluruh daftar) — bukan tombol Simpan halaman, seperti foto.
 *
 * HPP paket dihitung server SAAT transaksi lalu disalin ke baris order;
 * angka di sini hanya pratinjau. Komponen yang dibuang benar-benar dihapus
 * dari paket; produk nonaktif tidak bisa ditambahkan, tapi yang sudah ada
 * tetap dihitung.
 */

import { useForm } from '@inertiajs/react';
import { Plus, X } from 'lucide-react';
import CatalogItemController from '@/actions/Modules/Catalog/Controllers/CatalogItemController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatRp, hanyaDigit } from '@/lib/format';
import { bundleCostOf } from '@/modules/catalog/lib/bundle';
import type { BundleComponent, ComponentOption } from '@/modules/catalog/types';

/** Sama dengan UpdateBundleComponentsRequest::MAX_COMPONENTS. */
export const MAX_COMPONENTS = 20;

interface ComponentRow {
    key: string;
    /** '' = belum dipilih. */
    component_id: string;
    quantity: string;
}

const GRID = 'grid-cols-[minmax(0,1fr)_5rem_2.25rem] items-center';

export function BundleComponents({
    itemId,
    components,
    options,
}: {
    itemId: number;
    components: BundleComponent[];
    /** Produk aktif + komponen paket ini yang sudah nonaktif. */
    options: ComponentOption[];
}) {
    const form = useForm<{ components: ComponentRow[] }>({
        components: components.map((c) => ({
            key: `c${c.id}`,
            component_id: String(c.id),
            quantity: String(c.quantity),
        })),
    });
    const rows = form.data.components;
    // Error baris berkunci "components.0.component_id" — tidak ada di tipe form.
    const errors: Record<string, string | undefined> = form.errors;
    const byId = new Map(options.map((o) => [String(o.id), o]));
    const items = options.map((o) => ({
        value: String(o.id),
        label: o.is_active ? o.name : `${o.name} (nonaktif)`,
    }));
    const cost = bundleCostOf(
        rows.map((r) => ({
            quantity: Number(r.quantity) || 0,
            unit_cost: byId.get(r.component_id)?.unit_cost ?? null,
        })),
    );
    const complete = rows.every(
        (r) => r.component_id !== '' && Number(r.quantity) >= 1,
    );

    const setRows = (next: ComponentRow[]) => form.setData('components', next);
    const update = (key: string, patch: Partial<ComponentRow>) =>
        setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

    const save = () => {
        form.transform((d) => ({
            components: d.components.map((r) => ({
                component_id: Number(r.component_id),
                quantity: Number(r.quantity),
            })),
        }));
        form.put(CatalogItemController.updateComponents(itemId).url, {
            preserveScroll: true,
            // Isian Data item di halaman yang sama belum tentu disimpan.
            preserveState: true,
            onSuccess: () => form.setDefaults(),
        });
    };

    return (
        <div className="flex flex-col gap-3">
            {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    Belum ada komponen. Tambahkan produk yang selalu ikut paket
                    ini, mis. 5× Cetak 4R.
                </p>
            ) : (
                <div
                    className={`grid gap-2 px-1 text-xs text-muted-foreground ${GRID}`}
                >
                    <span>Produk</span>
                    <span className="text-right">Qty / paket</span>
                    <span />
                </div>
            )}
            {rows.map((r, i) => {
                const rowError =
                    errors[`components.${i}.component_id`] ??
                    errors[`components.${i}.quantity`];
                return (
                    <div key={r.key} className="flex flex-col gap-1">
                        <div className={`grid gap-2 ${GRID}`}>
                            {/* `items` supaya trigger menampilkan nama, bukan id (gotcha #10). */}
                            <Select
                                items={items}
                                value={r.component_id}
                                onValueChange={(v) =>
                                    update(r.key, { component_id: v ?? '' })
                                }
                            >
                                <SelectTrigger
                                    className="w-full"
                                    aria-label={`Produk komponen ${i + 1}`}
                                    aria-invalid={Boolean(
                                        errors[`components.${i}.component_id`],
                                    )}
                                >
                                    <SelectValue placeholder="Pilih produk" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {items.map((o) => (
                                            <SelectItem
                                                key={o.value}
                                                value={o.value}
                                                // Produk yang sudah dipilih di baris lain tidak bisa dobel.
                                                disabled={rows.some(
                                                    (x) =>
                                                        x.key !== r.key &&
                                                        x.component_id ===
                                                            o.value,
                                                )}
                                            >
                                                {o.label}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <Input
                                aria-label={`Qty komponen ${i + 1}`}
                                inputMode="numeric"
                                className="text-right font-mono"
                                value={r.quantity}
                                aria-invalid={Boolean(
                                    errors[`components.${i}.quantity`],
                                )}
                                onChange={(e) =>
                                    update(r.key, {
                                        quantity: hanyaDigit(e.target.value),
                                    })
                                }
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                aria-label={`Keluarkan komponen ${i + 1}`}
                                onClick={() =>
                                    setRows(rows.filter((x) => x.key !== r.key))
                                }
                            >
                                <X />
                            </Button>
                        </div>
                        <InputError message={rowError} />
                    </div>
                );
            })}
            <Button
                variant="outline"
                size="sm"
                className="self-start"
                disabled={rows.length >= MAX_COMPONENTS}
                onClick={() =>
                    setRows([
                        ...rows,
                        {
                            key: `n${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                            component_id: '',
                            quantity: '1',
                        },
                    ])
                }
            >
                <Plus data-icon="inline-start" />
                Tambah komponen
            </Button>
            <InputError message={errors.components} />

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                <span className="text-sm">
                    HPP bahan paket saat ini:{' '}
                    <span className="font-mono font-semibold">
                        {rows.length === 0 ? '—' : formatRp(cost)}
                    </span>
                </span>
                <Button
                    size="sm"
                    disabled={!form.isDirty || !complete || form.processing}
                    onClick={save}
                >
                    Simpan komponen
                </Button>
            </div>
            <p className="text-xs text-muted-foreground">
                HPP dihitung ulang saat paket masuk order dan disalin ke baris
                order — order lama tidak berubah. Harga paket tetap diketik di
                atas.
            </p>
        </div>
    );
}
