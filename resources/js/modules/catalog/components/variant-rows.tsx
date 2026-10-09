/**
 * Isian varian produk di halaman form Katalog (spek 7.3). Ikut tombol Simpan
 * halaman (bukan tersimpan langsung seperti foto) — harga varian harus
 * divalidasi bersama data item.
 *
 * Baris tersimpan tidak bisa dihapus, hanya dinonaktifkan: varian yang pernah
 * terjual dirujuk baris order lama. Baris baru boleh dibuang sebelum disimpan.
 */

import { Plus, X } from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatPersen, formatRp, hanyaDigit } from '@/lib/format';
import type { CatalogPhoto } from '@/modules/catalog/components/photo-gallery';
import { isLowMargin } from '@/modules/catalog/lib/filter';
import type { CatalogVariant } from '@/modules/catalog/types';

/** Sama dengan CatalogItemVariant::MAX_PER_ITEM. */
export const MAX_VARIANTS = 30;

/** Isian satu varian — angka tetap string selama diketik. */
export interface VariantRow {
    /** Kunci React: `v{id}` untuk tersimpan, acak untuk baris baru. */
    key: string;
    id: number | null;
    name: string;
    price: string;
    unit_cost: string;
    catalog_item_photo_id: number | null;
    is_active: boolean;
}

export function toVariantRows(variants: CatalogVariant[]): VariantRow[] {
    return variants.map((v) => ({
        key: `v${v.id}`,
        id: v.id,
        name: v.name,
        price: String(v.price),
        unit_cost: String(v.unit_cost),
        catalog_item_photo_id: v.catalog_item_photo_id,
        is_active: v.is_active,
    }));
}

/** Baris siap kirim: nama terisi, harga ≥ 1, HPP terisi. */
export function variantRowComplete(r: VariantRow): boolean {
    return r.name.trim() !== '' && Number(r.price) > 0 && r.unit_cost !== '';
}

const COVER = 'cover';
const GRID =
    'sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_7rem_3.5rem] sm:items-center';

export function VariantRows({
    rows,
    photos,
    errors,
    lowMarginRatio,
    onChange,
}: {
    rows: VariantRow[];
    /** Galeri item — pilihan foto varian; kosong di halaman Tambah. */
    photos: CatalogPhoto[];
    errors: Record<string, string | undefined>;
    lowMarginRatio: number;
    onChange: (rows: VariantRow[]) => void;
}) {
    const update = (key: string, patch: Partial<VariantRow>) =>
        onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    const photoItems = [
        { value: COVER, label: 'Sampul' },
        ...photos.map((p, i) => ({
            value: String(p.id),
            label: `Foto ${i + 1}`,
        })),
    ];

    return (
        <div className="flex flex-col gap-3">
            {rows.length > 0 && (
                <div
                    className={`hidden gap-2 px-1 text-xs text-muted-foreground sm:grid ${GRID}`}
                >
                    <span>Nama varian</span>
                    <span className="text-right">Harga jual</span>
                    <span className="text-right">HPP bahan</span>
                    <span>Foto</span>
                    <span>Aktif</span>
                </div>
            )}
            {rows.map((r, i) => {
                const price = Number(r.price) || 0;
                const cost = Number(r.unit_cost) || 0;
                const low =
                    price > 0 &&
                    r.unit_cost !== '' &&
                    isLowMargin(price, cost, lowMarginRatio);
                const rowErrors = [
                    errors[`variants.${i}.name`],
                    errors[`variants.${i}.price`],
                    errors[`variants.${i}.unit_cost`],
                    errors[`variants.${i}.catalog_item_photo_id`],
                    errors[`variants.${i}.id`],
                ].filter(Boolean);

                return (
                    <div
                        key={r.key}
                        className={`grid grid-cols-2 gap-2 rounded-lg border p-3 sm:border-0 sm:p-0 ${GRID} ${r.is_active ? '' : 'opacity-60'}`}
                    >
                        <Input
                            aria-label={`Nama varian ${i + 1}`}
                            placeholder="A4, Bulat, Hitam…"
                            maxLength={100}
                            className="col-span-2 sm:col-span-1"
                            value={r.name}
                            aria-invalid={Boolean(errors[`variants.${i}.name`])}
                            onChange={(e) =>
                                update(r.key, { name: e.target.value })
                            }
                        />
                        {/* Label terlihat hanya di layar sempit — di sm+ ada baris judul kolom. */}
                        <label className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground sm:hidden">
                                Harga jual
                            </span>
                            <Input
                                aria-label={`Harga jual varian ${i + 1}`}
                                placeholder="Harga jual"
                                inputMode="numeric"
                                className="text-right font-mono"
                                value={r.price}
                                aria-invalid={Boolean(
                                    errors[`variants.${i}.price`],
                                )}
                                onChange={(e) =>
                                    update(r.key, {
                                        price: hanyaDigit(e.target.value),
                                    })
                                }
                            />
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground sm:hidden">
                                HPP bahan
                            </span>
                            <Input
                                aria-label={`HPP varian ${i + 1}`}
                                placeholder="HPP bahan"
                                inputMode="numeric"
                                className="text-right font-mono"
                                value={r.unit_cost}
                                aria-invalid={Boolean(
                                    errors[`variants.${i}.unit_cost`],
                                )}
                                onChange={(e) =>
                                    update(r.key, {
                                        unit_cost: hanyaDigit(e.target.value),
                                    })
                                }
                            />
                        </label>
                        {/* `items` supaya trigger menampilkan label (gotcha #10). */}
                        <Select
                            items={photoItems}
                            value={
                                r.catalog_item_photo_id === null
                                    ? COVER
                                    : String(r.catalog_item_photo_id)
                            }
                            disabled={photos.length === 0}
                            onValueChange={(v) =>
                                update(r.key, {
                                    catalog_item_photo_id:
                                        !v || v === COVER ? null : Number(v),
                                })
                            }
                        >
                            <SelectTrigger
                                className="w-full"
                                aria-label={`Foto varian ${i + 1}`}
                                title={
                                    photos.length === 0
                                        ? 'Unggah foto di galeri dulu'
                                        : undefined
                                }
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {photoItems.map((p) => {
                                        const photo = photos.find(
                                            (x) => String(x.id) === p.value,
                                        );
                                        return (
                                            <SelectItem
                                                key={p.value}
                                                value={p.value}
                                            >
                                                {photo && (
                                                    <img
                                                        src={photo.thumb_url}
                                                        alt=""
                                                        className="size-6 rounded object-cover"
                                                    />
                                                )}
                                                {p.label}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <div className="flex items-center justify-end gap-1 sm:justify-start">
                            <Checkbox
                                aria-label={`Varian ${i + 1} aktif`}
                                checked={r.is_active}
                                onCheckedChange={(c) =>
                                    update(r.key, { is_active: c })
                                }
                            />
                            {/* Hanya baris baru — varian tersimpan cukup dinonaktifkan. */}
                            {r.id === null && (
                                <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label={`Buang varian ${i + 1}`}
                                    onClick={() =>
                                        onChange(
                                            rows.filter((x) => x.key !== r.key),
                                        )
                                    }
                                >
                                    <X />
                                </Button>
                            )}
                        </div>
                        {price > 0 && r.unit_cost !== '' && (
                            <p
                                className={`col-span-full px-1 text-xs ${low ? 'text-destructive' : 'text-muted-foreground'}`}
                            >
                                Margin {formatRp(price - cost)} (
                                {formatPersen((price - cost) / price)})
                            </p>
                        )}
                        {rowErrors.length > 0 && (
                            <div className="col-span-full">
                                <InputError message={rowErrors[0]} />
                            </div>
                        )}
                    </div>
                );
            })}
            <Button
                variant="outline"
                size="sm"
                className="self-start"
                disabled={rows.length >= MAX_VARIANTS}
                onClick={() =>
                    onChange([
                        ...rows,
                        {
                            key: `n${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                            id: null,
                            name: '',
                            price: '',
                            unit_cost: '',
                            catalog_item_photo_id: null,
                            is_active: true,
                        },
                    ])
                }
            >
                <Plus data-icon="inline-start" />
                Tambah varian
            </Button>
            <InputError message={errors.variants} />
        </div>
    );
}
