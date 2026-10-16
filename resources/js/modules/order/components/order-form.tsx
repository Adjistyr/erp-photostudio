/**
 * Bagian form order yang dipakai Buat Order DAN Ubah Order (spek 1.2):
 * customer, item, jadwal & lokasi, catatan, termin (event, spek 6.4), plus
 * ringkasan item.
 *
 * Dipilih komponen ber-props nilai/onChange, bukan satu form raksasa dengan
 * `mode`: bagian yang beda (jenis order + DP di Buat, "sudah dibayar" di
 * Ubah) tetap di halaman masing-masing, jadi tidak ada cabang mode di sini.
 *
 * Baris item lama (punya `id`) memakai harga TERSIMPAN (`unit_price`), bukan
 * harga katalog — harga deal tidak berubah walau katalog naik. Paketnya tidak
 * bisa diganti; ganti paket = hapus baris lalu tambah yang baru.
 */

import { Plus, Trash2, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import InputError from '@/components/input-error';
import { Panel } from '@/components/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from '@/components/ui/combobox';
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatRp, hanyaDigit } from '@/lib/format';
import { bundleIncludes, variantLabel } from '@/modules/catalog';
import type { BundlePart } from '@/modules/catalog';
import {
    categoryMatches,
    isServiceCategory,
} from '@/modules/order/lib/category';
import type { OrderType } from '@/modules/order/lib/category';
import type { ScheduleRow } from '@/modules/order/lib/schedules';
import { ScheduleEditor } from '@/modules/order/components/schedule-editor';

export interface CustomerOption {
    id: number;
    name: string;
    phone: string | null;
    /** Sumber kenal customer — default sumber order (spek 6.6). */
    source?: string | null;
}

export interface CatalogOption {
    id: number;
    name: string;
    price: number;
    /** Jasa: ServiceCategory; produk: teks bebas (spek 7.5). */
    category: string;
    /** undefined = jasa (data lama/test); produk ikut sejak spek 7.5. */
    type?: 'product' | 'service';
    /** Hanya dikirim halaman Ubah; undefined = aktif. */
    is_active?: boolean;
    /** Varian aktif produk (spek 7.3/7.5); kosong = tanpa varian. */
    variants?: { id: number; name: string; price: number }[];
    /** Isi paket jasa (spek 6.3); kosong = bukan paket berkomponen. */
    components?: BundlePart[];
}

export interface ItemRow {
    key: number;
    /** Ada = baris lama yang tersimpan; undefined = baris baru. */
    id?: number;
    catalog_item_id: string;
    quantity: number;
    /** Harga tersimpan baris lama — dipakai, bukan harga katalog. */
    unit_price?: number;
    /** Nama tersimpan baris lama, atau nama yang diketik untuk item custom. */
    name?: string;
    /** Item custom (spek 1.3): nama + harga bebas, tanpa paket katalog. */
    custom?: boolean;
    /** Harga item custom yang sedang diketik (string selama diedit). */
    price?: string;
    /** Varian produk baris baru (spek 7.5); '' = belum dipilih / tanpa varian. */
    catalog_item_variant_id?: string;
}

/** Customer yang diketik di form order (spek 3.4) — dicocokkan/dibuat server. */
export interface NewCustomer {
    name: string;
    phone: string;
}

/** Field yang sama di Buat dan Ubah Order. */
export interface OrderFields {
    /** '' saat memakai customer baru. */
    customer_id: string;
    /** null = memilih customer yang sudah ada. */
    new_customer: NewCustomer | null;
    service_date: string;
    service_time: string;
    location: string;
    notes: string;
    /** Sumber lead order (spek 6.6); '' = tidak dicatat. */
    source: string;
    items: ItemRow[];
    /** Termin pembayaran (spek 6.4) — selalu kosong untuk studio/retail. */
    schedules: ScheduleRow[];
}

export interface Locked {
    schedule: boolean;
    items: boolean;
}

const UNLOCKED: Locked = { schedule: false, items: false };

/** Varian terpilih baris baru (spek 7.5), atau undefined. */
export function rowVariant(
    row: ItemRow,
    catalog: CatalogOption[],
): { id: number; name: string; price: number } | undefined {
    if (!row.catalog_item_variant_id) return undefined;
    return catalog
        .find((x) => String(x.id) === row.catalog_item_id)
        ?.variants?.find((v) => String(v.id) === row.catalog_item_variant_id);
}

/** Produk bervarian wajib memilih varian sebelum disimpan (spek 7.3/7.5). */
export function needsVariant(row: ItemRow, catalog: CatalogOption[]): boolean {
    if (row.id !== undefined || row.custom) return false;
    const c = catalog.find((x) => String(x.id) === row.catalog_item_id);
    return (c?.variants?.length ?? 0) > 0 && !rowVariant(row, catalog);
}

/** Harga satu baris: tersimpan untuk baris lama, katalog (atau varian) untuk baris baru. */
export function lineTotal(row: ItemRow, catalog: CatalogOption[]): number {
    if (row.unit_price !== undefined) return row.unit_price * row.quantity;
    if (row.custom) return (Number(row.price) || 0) * row.quantity;
    const v = rowVariant(row, catalog);
    if (v) return v.price * row.quantity;
    const c = catalog.find((x) => String(x.id) === row.catalog_item_id);
    return c ? c.price * row.quantity : 0;
}

export function orderTotal(rows: ItemRow[], catalog: CatalogOption[]): number {
    return rows.reduce((s, r) => s + lineTotal(r, catalog), 0);
}

export function lineName(
    row: ItemRow,
    catalog: CatalogOption[],
): string | null {
    if (row.name !== undefined) return row.name.trim() || null;
    const name =
        catalog.find((x) => String(x.id) === row.catalog_item_id)?.name ?? null;
    const v = rowVariant(row, catalog);
    // Sama dengan nama baris order di server: "Produk – Varian".
    return name && v ? variantLabel(name, v.name) : name;
}

/**
 * Bagian customer di payload: `customer_id` ATAU `new_customer`, tidak
 * keduanya (server tetap memenangkan customer_id bila keduanya terkirim).
 */
export function customerPayload(
    data: Pick<OrderFields, 'customer_id' | 'new_customer'>,
): {
    customer_id: string | null;
    new_customer: NewCustomer | null;
} {
    if (data.customer_id !== '')
        return { customer_id: data.customer_id, new_customer: null };
    return {
        customer_id: null,
        new_customer: data.new_customer
            ? {
                  name: data.new_customer.name.trim(),
                  phone: data.new_customer.phone.trim(),
              }
            : null,
    };
}

/** Customer sudah dipilih atau nama customer baru sudah diisi. */
export function hasCustomer(
    data: Pick<OrderFields, 'customer_id' | 'new_customer'>,
): boolean {
    return (
        data.customer_id !== '' || (data.new_customer?.name.trim() ?? '') !== ''
    );
}

/** Cocok nama (tanpa beda huruf besar) atau HP (digit saja). */
export function customerMatches(c: CustomerOption, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (q === '') return true;
    const digits = q.replace(/\D/g, '');
    return (
        c.name.toLowerCase().includes(q) ||
        (digits.length >= 3 &&
            (c.phone ?? '').replace(/\D/g, '').includes(digits))
    );
}

/**
 * Baris custom wajib nama & harga (harga 0 boleh — bonus). Dengan katalog,
 * produk bervarian juga wajib varian (spek 7.5).
 */
export function rowsComplete(
    rows: ItemRow[],
    catalog: CatalogOption[] = [],
): boolean {
    return rows.every(
        (r) =>
            (!r.custom || ((r.name ?? '').trim() !== '' && r.price !== '')) &&
            !needsVariant(r, catalog),
    );
}

/**
 * Bentuk `items[]` yang dikirim ke server. Baris katalog TIDAK membawa
 * nama/harga (server menyalin dari katalog); baris custom tanpa
 * `catalog_item_id`.
 */
export function toPayload(rows: ItemRow[]): Record<string, unknown>[] {
    return rows.map((r) =>
        r.custom
            ? {
                  id: r.id ?? null,
                  catalog_item_id: null,
                  name: (r.name ?? '').trim(),
                  unit_price: Number(r.price) || 0,
                  quantity: r.quantity,
              }
            : {
                  id: r.id ?? null,
                  catalog_item_id: r.catalog_item_id,
                  catalog_item_variant_id: r.catalog_item_variant_id || null,
                  quantity: r.quantity,
              },
    );
}

/**
 * Sumber order setelah customer berganti (spek 6.6): ikut sumber customer
 * yang dipilih; customer baru/tanpa pilihan mempertahankan pilihan sekarang
 * (server mengisi dari customer bila tetap kosong).
 */
export function sourceAfterCustomer(
    customers: CustomerOption[],
    customerId: string,
    current: string,
): string {
    if (customerId === '') return current;
    return customers.find((c) => String(c.id) === customerId)?.source ?? '';
}

export function OrderFormFields({
    line,
    data,
    onChange,
    errors,
    customers,
    catalog,
    locked = UNLOCKED,
    header,
    sources,
    scheduleNotice,
}: {
    line: OrderType;
    data: OrderFields;
    onChange: (patch: Partial<OrderFields>) => void;
    errors: Record<string, string | undefined>;
    customers: CustomerOption[];
    catalog: CatalogOption[];
    locked?: Locked;
    /** Isi tambahan di atas customer (mis. jenis order di Buat Order). */
    header?: ReactNode;
    /** Pilihan sumber order (spek 6.6); undefined = tidak dicatat (retail). */
    sources?: string[];
    /** Peringatan aturan 5 (Ubah Order: termin akan dihapus karena total berubah). */
    scheduleNotice?: string;
}) {
    // Baris baru: paket jasa aktif yang cocok dengan lini order + produk
    // aktif (spek 7.5 — cetak tambahan, album, bingkai).
    const services = catalog.filter(
        (c) =>
            c.type !== 'product' &&
            c.is_active !== false &&
            isServiceCategory(c.category) &&
            categoryMatches(c.category, line),
    );
    const products = catalog.filter(
        (c) => c.type === 'product' && c.is_active !== false,
    );
    const updateRow = (key: number, patch: Partial<ItemRow>) =>
        onChange({
            items: data.items.map((r) =>
                r.key === key ? { ...r, ...patch } : r,
            ),
        });
    const scheduleHint = locked.schedule
        ? 'Order sudah diserahkan — jadwal terkunci.'
        : undefined;
    const chosenCustomer = customers.find(
        (c) => String(c.id) === data.customer_id,
    );
    const sourceFromCustomer =
        data.source !== '' && chosenCustomer?.source === data.source;

    return (
        <>
            <Panel title={header ? 'Jenis & customer' : 'Customer'}>
                <FieldGroup>
                    {header}
                    <Field>
                        <FieldLabel htmlFor="customer">Customer</FieldLabel>
                        <CustomerPicker
                            customers={customers}
                            customerId={data.customer_id}
                            newCustomer={data.new_customer}
                            errors={errors}
                            onChange={(patch) =>
                                onChange(
                                    sources && patch.customer_id !== undefined
                                        ? {
                                              ...patch,
                                              source: sourceAfterCustomer(
                                                  customers,
                                                  patch.customer_id,
                                                  data.source,
                                              ),
                                          }
                                        : patch,
                                )
                            }
                        />
                    </Field>
                    {sources && (
                        <Field>
                            <FieldLabel htmlFor="source">
                                Sumber order
                            </FieldLabel>
                            <Select
                                items={[
                                    { value: '', label: 'Tidak dicatat' },
                                    ...sources.map((s) => ({
                                        value: s,
                                        label: s,
                                    })),
                                ]}
                                value={data.source}
                                onValueChange={(v) =>
                                    onChange({ source: v ?? '' })
                                }
                            >
                                <SelectTrigger
                                    id="source"
                                    className="w-full"
                                    aria-invalid={Boolean(errors.source)}
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="">
                                            Tidak dicatat
                                        </SelectItem>
                                        {sources.map((s) => (
                                            <SelectItem key={s} value={s}>
                                                {s}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            {sourceFromCustomer && (
                                <FieldDescription>
                                    dari data customer
                                </FieldDescription>
                            )}
                            <InputError message={errors.source} />
                        </Field>
                    )}
                </FieldGroup>
            </Panel>

            <Panel title="Item">
                <div className="flex flex-col gap-3">
                    {data.items.map((r, i) => {
                        const old = r.id !== undefined;
                        const rowError =
                            errors[`items.${i}.catalog_item_id`] ??
                            errors[`items.${i}.catalog_item_variant_id`] ??
                            errors[`items.${i}.name`] ??
                            errors[`items.${i}.unit_price`] ??
                            errors[`items.${i}.quantity`];
                        // Baris lama: daftar memuat paket nonaktif supaya
                        // labelnya tetap tampil; select-nya dikunci.
                        const options = old
                            ? catalog
                            : [...services, ...products];
                        const chosen = catalog.find(
                            (c) => String(c.id) === r.catalog_item_id,
                        );
                        const variants =
                            !old && chosen?.variants?.length
                                ? chosen.variants
                                : [];
                        const total = lineTotal(r, catalog);
                        // Isi paket (spek 6.3) — baris baru saja; baris lama memakai snapshot di Detail Order.
                        const includes = old
                            ? null
                            : bundleIncludes(chosen?.components, r.quantity);
                        return (
                            <div key={r.key} className="flex flex-col gap-1">
                                <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                                    {r.custom ? (
                                        // Baris custom lama: nama & harga dikunci —
                                        // ubah = hapus baris lalu tambah baru.
                                        <div
                                            className="flex min-w-0 basis-full items-center gap-2 sm:flex-1 sm:basis-auto"
                                            title={
                                                old
                                                    ? 'Ubah item custom: hapus baris ini lalu tambah yang baru'
                                                    : undefined
                                            }
                                        >
                                            <Badge variant="outline">
                                                Custom
                                            </Badge>
                                            <Input
                                                aria-label="Nama item custom"
                                                placeholder="Nama item (mis. Drone 2 jam)"
                                                className="min-w-0 flex-1"
                                                disabled={old || locked.items}
                                                aria-invalid={Boolean(
                                                    errors[`items.${i}.name`],
                                                )}
                                                value={r.name ?? ''}
                                                onChange={(e) =>
                                                    updateRow(r.key, {
                                                        name: e.target.value,
                                                    })
                                                }
                                            />
                                            <Input
                                                aria-label="Harga item custom"
                                                inputMode="numeric"
                                                placeholder="Harga"
                                                className="w-32"
                                                disabled={old || locked.items}
                                                aria-invalid={Boolean(
                                                    errors[
                                                        `items.${i}.unit_price`
                                                    ],
                                                )}
                                                value={r.price ?? ''}
                                                onChange={(e) =>
                                                    updateRow(r.key, {
                                                        price: hanyaDigit(
                                                            e.target.value,
                                                        ),
                                                    })
                                                }
                                            />
                                        </div>
                                    ) : (
                                        <div className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
                                            <Select
                                                items={options.map((s) => ({
                                                    value: String(s.id),
                                                    label: old
                                                        ? `${r.name ?? s.name}${s.is_active === false ? ' (nonaktif)' : ''} · ${formatRp(r.unit_price ?? s.price)}`
                                                        : // Produk bervarian: harga ada di pilihan varian.
                                                          s.variants?.length
                                                          ? `${s.name} · ${s.variants.length} varian`
                                                          : `${s.name} · ${formatRp(s.price)}`,
                                                }))}
                                                value={r.catalog_item_id}
                                                disabled={old || locked.items}
                                                onValueChange={(v) =>
                                                    updateRow(r.key, {
                                                        catalog_item_id:
                                                            v ?? '',
                                                        // Ganti item → varian lama tidak berlaku.
                                                        catalog_item_variant_id:
                                                            '',
                                                    })
                                                }
                                            >
                                                <SelectTrigger
                                                    className="w-full"
                                                    aria-invalid={Boolean(
                                                        rowError,
                                                    )}
                                                    title={
                                                        old
                                                            ? 'Ganti paket: hapus baris ini lalu tambah yang baru'
                                                            : undefined
                                                    }
                                                >
                                                    <SelectValue placeholder="Pilih paket atau produk" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {old ? (
                                                        <SelectGroup>
                                                            {options.map(
                                                                (s) => (
                                                                    <SelectItem
                                                                        key={
                                                                            s.id
                                                                        }
                                                                        value={String(
                                                                            s.id,
                                                                        )}
                                                                    >
                                                                        {s.name}
                                                                    </SelectItem>
                                                                ),
                                                            )}
                                                        </SelectGroup>
                                                    ) : (
                                                        <>
                                                            {/* Label di dalam Group (gotcha #1). */}
                                                            <SelectGroup>
                                                                <SelectLabel>
                                                                    Paket jasa
                                                                </SelectLabel>
                                                                {services.map(
                                                                    (s) => (
                                                                        <SelectItem
                                                                            key={
                                                                                s.id
                                                                            }
                                                                            value={String(
                                                                                s.id,
                                                                            )}
                                                                        >
                                                                            {
                                                                                s.name
                                                                            }{' '}
                                                                            ·{' '}
                                                                            {formatRp(
                                                                                s.price,
                                                                            )}
                                                                        </SelectItem>
                                                                    ),
                                                                )}
                                                            </SelectGroup>
                                                            {products.length >
                                                                0 && (
                                                                <SelectGroup>
                                                                    <SelectLabel>
                                                                        Produk
                                                                    </SelectLabel>
                                                                    {products.map(
                                                                        (s) => (
                                                                            <SelectItem
                                                                                key={
                                                                                    s.id
                                                                                }
                                                                                value={String(
                                                                                    s.id,
                                                                                )}
                                                                            >
                                                                                {
                                                                                    s.name
                                                                                }{' '}
                                                                                ·{' '}
                                                                                {s
                                                                                    .variants
                                                                                    ?.length
                                                                                    ? `${s.variants.length} varian`
                                                                                    : formatRp(
                                                                                          s.price,
                                                                                      )}
                                                                            </SelectItem>
                                                                        ),
                                                                    )}
                                                                </SelectGroup>
                                                            )}
                                                        </>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <Input
                                        inputMode="numeric"
                                        aria-label="Qty"
                                        className="w-16 text-center"
                                        disabled={locked.items}
                                        value={String(r.quantity)}
                                        onChange={(e) =>
                                            updateRow(r.key, {
                                                quantity: Math.max(
                                                    1,
                                                    Number(
                                                        hanyaDigit(
                                                            e.target.value,
                                                        ),
                                                    ) || 1,
                                                ),
                                            })
                                        }
                                    />
                                    <span className="w-32 shrink-0 text-right text-sm max-sm:ml-auto">
                                        {total > 0 ? formatRp(total) : '—'}
                                    </span>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        aria-label="Hapus baris item"
                                        disabled={
                                            data.items.length === 1 ||
                                            locked.items
                                        }
                                        onClick={() =>
                                            onChange({
                                                items: data.items.filter(
                                                    (x) => x.key !== r.key,
                                                ),
                                            })
                                        }
                                    >
                                        <Trash2 />
                                    </Button>
                                </div>
                                {/* Varian produk (spek 7.5) — baris baru saja. */}
                                {variants.length > 0 && (
                                    <div className="flex items-center gap-2 pl-2">
                                        <span className="text-xs text-muted-foreground">
                                            Varian
                                        </span>
                                        {/* `items` supaya trigger menampilkan label (gotcha #10). */}
                                        <Select
                                            items={variants.map((v) => ({
                                                value: String(v.id),
                                                label: `${v.name} · ${formatRp(v.price)}`,
                                            }))}
                                            value={
                                                r.catalog_item_variant_id ?? ''
                                            }
                                            onValueChange={(v) =>
                                                updateRow(r.key, {
                                                    catalog_item_variant_id:
                                                        v ?? '',
                                                })
                                            }
                                        >
                                            <SelectTrigger
                                                className="w-64"
                                                aria-label="Varian produk"
                                                aria-invalid={needsVariant(
                                                    r,
                                                    catalog,
                                                )}
                                            >
                                                <SelectValue placeholder="Pilih varian" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    {variants.map((v) => (
                                                        <SelectItem
                                                            key={v.id}
                                                            value={String(v.id)}
                                                        >
                                                            {v.name} ·{' '}
                                                            {formatRp(v.price)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                {includes && (
                                    <p className="pl-2 text-xs text-muted-foreground">
                                        {includes}
                                    </p>
                                )}
                                <InputError message={rowError} />
                            </div>
                        );
                    })}

                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={locked.items}
                            onClick={() =>
                                onChange({
                                    items: [
                                        ...data.items,
                                        {
                                            key: Date.now(),
                                            catalog_item_id: '',
                                            quantity: 1,
                                        },
                                    ],
                                })
                            }
                        >
                            <Plus data-icon="inline-start" />
                            Tambah item
                        </Button>
                        {/* Harga nego di luar katalog (spek 1.3) — tanpa HPP;
                            biaya nyatanya dicatat sebagai biaya job. */}
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={locked.items}
                            onClick={() =>
                                onChange({
                                    items: [
                                        ...data.items,
                                        {
                                            key: Date.now(),
                                            catalog_item_id: '',
                                            quantity: 1,
                                            custom: true,
                                            name: '',
                                            price: '',
                                        },
                                    ],
                                })
                            }
                        >
                            <Plus data-icon="inline-start" />
                            Item custom
                        </Button>
                    </div>
                    <InputError message={errors.items} />
                    {locked.items && (
                        <p className="text-xs text-muted-foreground">
                            Order sudah diserahkan — item terkunci. Koreksi
                            harga setelah serah dicatat sebagai retur.
                        </p>
                    )}

                    {line === 'event' && !locked.items && (
                        <p className="text-xs text-muted-foreground">
                            Paket event sering dinegosiasi per deal — pakai Item
                            custom untuk harga di luar katalog.
                        </p>
                    )}
                </div>
            </Panel>

            <Panel title="Jadwal & lokasi">
                <FieldGroup>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field>
                            <FieldLabel htmlFor="service_date">
                                Tanggal {line === 'event' ? 'acara' : 'sesi'}
                            </FieldLabel>
                            {/* <input type="date"> bawaan: locale ikut sistem,
                                keyboard jalan, nol dependency. */}
                            <Input
                                id="service_date"
                                type="date"
                                disabled={locked.schedule}
                                value={data.service_date}
                                aria-invalid={Boolean(errors.service_date)}
                                onChange={(e) =>
                                    onChange({ service_date: e.target.value })
                                }
                            />
                            {scheduleHint && (
                                <FieldDescription>
                                    {scheduleHint}
                                </FieldDescription>
                            )}
                            <InputError message={errors.service_date} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="service_time">
                                Jam{' '}
                                <span className="text-muted-foreground">
                                    — opsional
                                </span>
                            </FieldLabel>
                            <Input
                                id="service_time"
                                type="time"
                                disabled={locked.schedule}
                                value={data.service_time}
                                onChange={(e) =>
                                    onChange({ service_time: e.target.value })
                                }
                            />
                            <InputError message={errors.service_time} />
                        </Field>
                    </div>

                    <Field>
                        <FieldLabel htmlFor="location">
                            Lokasi{' '}
                            {line === 'studio' && (
                                <span className="text-muted-foreground">
                                    — kosongkan kalau di studio
                                </span>
                            )}
                        </FieldLabel>
                        <Input
                            id="location"
                            disabled={locked.schedule}
                            placeholder={
                                line === 'studio' ? 'Studio' : 'Nama venue'
                            }
                            value={data.location}
                            onChange={(e) =>
                                onChange({ location: e.target.value })
                            }
                        />
                        <InputError message={errors.location} />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="notes">
                            Catatan{' '}
                            <span className="text-muted-foreground">
                                — opsional
                            </span>
                        </FieldLabel>
                        <Textarea
                            id="notes"
                            rows={3}
                            value={data.notes}
                            onChange={(e) =>
                                onChange({ notes: e.target.value })
                            }
                        />
                        <InputError message={errors.notes} />
                    </Field>
                </FieldGroup>
            </Panel>

            {line === 'event' && (
                <ScheduleEditor
                    rows={data.schedules}
                    onChange={(schedules) => onChange({ schedules })}
                    total={orderTotal(data.items, catalog)}
                    serviceDate={data.service_date}
                    errors={errors}
                    notice={scheduleNotice}
                />
            )}
        </>
    );
}

/** Daftar item di ringkasan kanan — harga sama dengan baris form. */
export function SummaryLines({
    items,
    catalog,
}: {
    items: ItemRow[];
    catalog: CatalogOption[];
}) {
    const lines = items.flatMap((r) => {
        const name = lineName(r, catalog);
        return name
            ? [
                  {
                      key: r.key,
                      name,
                      qty: r.quantity,
                      total: lineTotal(r, catalog),
                  },
              ]
            : [];
    });

    return (
        <div className="flex flex-col gap-2 text-sm">
            {lines.map((l) => (
                <div key={l.key} className="flex justify-between gap-2">
                    <span className="min-w-0 truncate text-muted-foreground">
                        {l.name} × {l.qty}
                    </span>
                    <span className="shrink-0">{formatRp(l.total)}</span>
                </div>
            ))}
            {lines.length === 0 && (
                <p className="text-muted-foreground">Belum ada item dipilih.</p>
            )}
        </div>
    );
}

/**
 * Pemilih customer dengan pencarian (spek 3.4). Ketikan yang tidak cocok
 * persis dengan nama mana pun menawarkan "Buat customer '…'" — admin tidak
 * perlu bolak-balik ke menu Customer untuk customer yang baru deal lewat chat.
 * Dedup (HP lalu nama) dilakukan server, jadi memilih "buat" untuk orang yang
 * ternyata sudah ada tidak membuat baris ganda.
 */
function CustomerPicker({
    customers,
    customerId,
    newCustomer,
    errors,
    onChange,
}: {
    customers: CustomerOption[];
    customerId: string;
    newCustomer: NewCustomer | null;
    errors: Record<string, string | undefined>;
    onChange: (patch: Partial<OrderFields>) => void;
}) {
    const [query, setQuery] = useState('');

    if (newCustomer) {
        return (
            <div className="flex flex-col gap-2 rounded-2xl border border-dashed p-3">
                <div className="flex items-center gap-2">
                    <Badge variant="secondary">Customer baru</Badge>
                    <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label="Batal buat customer baru"
                        onClick={() => onChange({ new_customer: null })}
                    >
                        <X />
                    </Button>
                </div>
                <Input
                    id="customer"
                    aria-label="Nama customer baru"
                    value={newCustomer.name}
                    aria-invalid={Boolean(
                        errors['new_customer.name'] ?? errors.customer_id,
                    )}
                    onChange={(e) =>
                        onChange({
                            new_customer: {
                                ...newCustomer,
                                name: e.target.value,
                            },
                        })
                    }
                />
                <Input
                    aria-label="No HP customer baru"
                    inputMode="tel"
                    placeholder="No HP (opsional) — 08…"
                    value={newCustomer.phone}
                    aria-invalid={Boolean(errors['new_customer.phone'])}
                    onChange={(e) =>
                        onChange({
                            new_customer: {
                                ...newCustomer,
                                phone: e.target.value,
                            },
                        })
                    }
                />
                <InputError
                    message={
                        errors['new_customer.name'] ??
                        errors['new_customer.phone'] ??
                        errors.customer_id
                    }
                />
                <p className="text-xs text-muted-foreground">
                    Nama atau HP yang sudah ada di Customer dipakai ulang, tidak
                    dibuat ganda.
                </p>
            </div>
        );
    }

    const selected = customers.find((c) => String(c.id) === customerId) ?? null;
    const typed = query.trim();
    const exact = customers.some(
        (c) => c.name.toLowerCase() === typed.toLowerCase(),
    );

    return (
        <div className="flex flex-col gap-2">
            <Combobox
                items={customers}
                value={selected}
                onValueChange={(c: CustomerOption | null) =>
                    onChange({
                        customer_id: c ? String(c.id) : '',
                        new_customer: null,
                    })
                }
                itemToStringLabel={(c: CustomerOption) => c.name}
                isItemEqualToValue={(a: CustomerOption, b: CustomerOption) =>
                    a.id === b.id
                }
                filter={(c: CustomerOption, q: string) => customerMatches(c, q)}
                onInputValueChange={setQuery}
            >
                <ComboboxInput
                    id="customer"
                    className="w-full"
                    placeholder="Cari nama atau HP…"
                    aria-invalid={Boolean(errors.customer_id)}
                />
                <ComboboxContent>
                    <ComboboxEmpty>
                        Belum ada customer dengan nama itu.
                    </ComboboxEmpty>
                    <ComboboxList>
                        {(c: CustomerOption) => (
                            <ComboboxItem key={c.id} value={c}>
                                {c.name}
                                {c.phone && (
                                    <span className="text-muted-foreground">
                                        · {c.phone}
                                    </span>
                                )}
                            </ComboboxItem>
                        )}
                    </ComboboxList>
                </ComboboxContent>
            </Combobox>
            {/* Hanya untuk ketikan berhuruf — angka saja adalah pencarian HP, bukan nama. */}
            {/\p{L}/u.test(typed) && !exact && (
                <Button
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() =>
                        onChange({
                            customer_id: '',
                            new_customer: { name: typed, phone: '' },
                        })
                    }
                >
                    <UserPlus data-icon="inline-start" />
                    Buat customer &ldquo;{typed}&rdquo;
                </Button>
            )}
            <InputError message={errors.customer_id} />
        </div>
    );
}
