/**
 * Bagian form order yang dipakai Buat Order DAN Ubah Order (spek 1.2):
 * customer, item, jadwal & lokasi, catatan, plus ringkasan item.
 *
 * Dipilih komponen ber-props nilai/onChange, bukan satu form raksasa dengan
 * `mode`: bagian yang beda (jenis order + DP di Buat, "sudah dibayar" di
 * Ubah) tetap di halaman masing-masing, jadi tidak ada cabang mode di sini.
 *
 * Baris item lama (punya `id`) memakai harga TERSIMPAN (`unit_price`), bukan
 * harga katalog — harga deal tidak berubah walau katalog naik. Paketnya tidak
 * bisa diganti; ganti paket = hapus baris lalu tambah yang baru.
 */

import { Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatRp, hanyaDigit } from '@/lib/format';
import { categoryMatches } from '@/modules/order/lib/category';
import type { OrderType } from '@/modules/order/lib/category';
import type { ServiceCategory } from '@/types/domain';

export interface CustomerOption {
    id: number;
    name: string;
    phone: string | null;
}

export interface CatalogOption {
    id: number;
    name: string;
    price: number;
    category: ServiceCategory;
    /** Hanya dikirim halaman Ubah; undefined = aktif. */
    is_active?: boolean;
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
}

/** Field yang sama di Buat dan Ubah Order. */
export interface OrderFields {
    customer_id: string;
    service_date: string;
    service_time: string;
    location: string;
    notes: string;
    items: ItemRow[];
}

export interface Locked {
    schedule: boolean;
    items: boolean;
}

const UNLOCKED: Locked = { schedule: false, items: false };

/** Harga satu baris: tersimpan untuk baris lama, katalog untuk baris baru. */
export function lineTotal(row: ItemRow, catalog: CatalogOption[]): number {
    if (row.unit_price !== undefined) return row.unit_price * row.quantity;
    if (row.custom) return (Number(row.price) || 0) * row.quantity;
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
    return (
        catalog.find((x) => String(x.id) === row.catalog_item_id)?.name ?? null
    );
}

/** Baris custom wajib nama & harga (harga 0 boleh — bonus). */
export function rowsComplete(rows: ItemRow[]): boolean {
    return rows.every(
        (r) => !r.custom || ((r.name ?? '').trim() !== '' && r.price !== ''),
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
                  quantity: r.quantity,
              },
    );
}

export function Section({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="flex min-w-0 flex-col gap-4 rounded-lg border p-5">
            <h2 className="font-heading text-base font-semibold">{title}</h2>
            {children}
        </section>
    );
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
}) {
    // Baris baru hanya boleh paket aktif yang cocok dengan lini order.
    const services = catalog.filter(
        (c) => c.is_active !== false && categoryMatches(c.category, line),
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

    return (
        <>
            <Section title={header ? 'Jenis & customer' : 'Customer'}>
                <FieldGroup>
                    {header}
                    <Field>
                        <FieldLabel htmlFor="customer">Customer</FieldLabel>
                        {/* `items` supaya trigger menampilkan nama, bukan id. */}
                        <Select
                            items={customers.map((c) => ({
                                value: String(c.id),
                                label: c.name,
                            }))}
                            value={data.customer_id}
                            onValueChange={(v) =>
                                onChange({ customer_id: v ?? '' })
                            }
                        >
                            <SelectTrigger
                                id="customer"
                                aria-invalid={Boolean(errors.customer_id)}
                            >
                                <SelectValue placeholder="Pilih customer" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {customers.map((c) => (
                                        <SelectItem
                                            key={c.id}
                                            value={String(c.id)}
                                        >
                                            {c.name}
                                            {c.phone ? ` · ${c.phone}` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <InputError message={errors.customer_id} />
                        {customers.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                                Belum ada customer — tambahkan dulu di menu
                                Customer.
                            </p>
                        )}
                    </Field>
                </FieldGroup>
            </Section>

            <Section title="Item">
                <div className="flex flex-col gap-3">
                    {data.items.map((r, i) => {
                        const old = r.id !== undefined;
                        const rowError =
                            errors[`items.${i}.catalog_item_id`] ??
                            errors[`items.${i}.name`] ??
                            errors[`items.${i}.unit_price`] ??
                            errors[`items.${i}.quantity`];
                        // Baris lama: daftar memuat paket nonaktif supaya
                        // labelnya tetap tampil; select-nya dikunci.
                        const options = old ? catalog : services;
                        const total = lineTotal(r, catalog);
                        return (
                            <div key={r.key} className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    {r.custom ? (
                                        // Baris custom lama: nama & harga dikunci —
                                        // ubah = hapus baris lalu tambah baru.
                                        <div
                                            className="flex min-w-0 flex-1 items-center gap-2"
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
                                                className="w-32 font-mono"
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
                                        <div className="min-w-0 flex-1">
                                            <Select
                                                items={options.map((s) => ({
                                                    value: String(s.id),
                                                    label: old
                                                        ? `${r.name ?? s.name}${s.is_active === false ? ' (nonaktif)' : ''} · ${formatRp(r.unit_price ?? s.price)}`
                                                        : `${s.name} · ${formatRp(s.price)}`,
                                                }))}
                                                value={r.catalog_item_id}
                                                disabled={old || locked.items}
                                                onValueChange={(v) =>
                                                    updateRow(r.key, {
                                                        catalog_item_id:
                                                            v ?? '',
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
                                                    <SelectValue placeholder="Pilih paket dari katalog" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        {options.map((s) => (
                                                            <SelectItem
                                                                key={s.id}
                                                                value={String(
                                                                    s.id,
                                                                )}
                                                            >
                                                                {s.name} ·{' '}
                                                                {formatRp(
                                                                    s.price,
                                                                )}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <Input
                                        inputMode="numeric"
                                        aria-label="Qty"
                                        className="w-16 text-center font-mono"
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
                                    <span className="w-32 shrink-0 text-right font-mono text-sm">
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
            </Section>

            <Section title="Jadwal & lokasi">
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
            </Section>
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
                    <span className="shrink-0 font-mono">
                        {formatRp(l.total)}
                    </span>
                </div>
            ))}
            {lines.length === 0 && (
                <p className="text-muted-foreground">Belum ada item dipilih.</p>
            )}
        </div>
    );
}
