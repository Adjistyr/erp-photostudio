/**
 * Cari + filter untuk daftar (spek 3.1). Komponen ini TIDAK memanggil router:
 * pemanggil mode server menulis `router.get(...)` dengan `cleanQuery()`,
 * pemanggil mode klien menyaring state sendiri — satu komponen, dua mode.
 *
 * Input cari di-debounce 300 ms (setiap ketikan bukan request); Select
 * langsung. Tombol Reset hanya muncul bila ada nilai aktif.
 */

import { Search, X } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
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
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';

export type ListFilters = { q: string } & Record<string, string | undefined>;

export interface ListFilterDef {
    key: string;
    label: string;
    options: { value: string; label: string }[];
}

/** Nilai Select untuk "semua" — Base UI Select tidak memakai string kosong sebagai nilai. */
const ALL = '__all';

/**
 * Query string rapi: buang kunci kosong dan `page` (filter berubah → kembali
 * ke halaman 1).
 */
export function cleanQuery(
    value: Record<string, string | undefined>,
): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(value)) {
        if (k !== 'page' && v !== undefined && v !== '') out[k] = v;
    }
    return out;
}

export function hasActiveFilter(
    value: Record<string, string | undefined>,
): boolean {
    return Object.keys(cleanQuery(value)).length > 0;
}

export function ListToolbar({
    value,
    filters = [],
    placeholder = 'Cari nomor, nama, atau HP…',
    onChange,
    total,
    children,
}: {
    value: ListFilters;
    filters?: ListFilterDef[];
    placeholder?: string;
    onChange: (next: ListFilters) => void;
    /** "123 order" — jumlah hasil setelah filter. */
    total?: { count: number; noun: string };
    /** Kontrol tambahan (mis. rentang tanggal) di baris yang sama. */
    children?: ReactNode;
}) {
    // q lokal supaya ketikan tidak menunggu request; dikirim setelah debounce.
    const [q, setQ] = useState(value.q);
    const sendQ = useDebouncedCallback((next: string) =>
        onChange({ ...value, q: next }),
    );
    const active = hasActiveFilter({ ...value, q });

    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-56 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    aria-label="Cari"
                    placeholder={placeholder}
                    className="pl-9"
                    value={q}
                    onChange={(e) => {
                        setQ(e.target.value);
                        sendQ(e.target.value);
                    }}
                />
            </div>
            {filters.map((f) => {
                const items = [
                    { value: ALL, label: `${f.label}: semua` },
                    ...f.options.map((o) => ({
                        value: o.value,
                        label: `${f.label}: ${o.label}`,
                    })),
                ];
                return (
                    <Select
                        key={f.key}
                        items={items}
                        value={value[f.key] ?? ALL}
                        onValueChange={(v) =>
                            onChange({
                                ...value,
                                q,
                                [f.key]: !v || v === ALL ? undefined : v,
                            })
                        }
                    >
                        <SelectTrigger aria-label={f.label} className="w-auto">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {items.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                );
            })}
            {children}
            {active && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        setQ('');
                        onChange({ q: '' });
                    }}
                >
                    <X data-icon="inline-start" />
                    Reset
                </Button>
            )}
            {total && (
                <span className="ml-auto text-xs text-muted-foreground">
                    {total.count} {total.noun}
                </span>
            )}
        </div>
    );
}
