/**
 * Ringkasan per kategori + proyeksi penggantian di halaman Aset (spek 8.3,
 * melaksanakan 6.2).
 */

import { Link } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import AssetController from '@/actions/Modules/Asset/Controllers/AssetController';
import { KepalaUang, SelUang } from '@/components/data-table';
import { Panel } from '@/components/page';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatBulan, formatRp } from '@/lib/format';
import { replacementWhen } from '@/modules/asset/lib/replacement';

/** Nilai buku, alokasi, dan dana maintenance tidak dikirim untuk admin (spek 5.1). */
export interface CategorySummary {
    name: string;
    kinds: number;
    units: number;
    purchase_value: number;
    book_value?: number;
    allocation?: number;
}

export interface Replacements {
    items: {
        asset_id: number;
        name: string;
        model: string | null;
        due_on: string;
        months_until: number;
        estimate: number;
    }[];
    total_estimate: number;
    maintenance_balance?: number;
    shortfall?: number;
}

/**
 * Tertutup secara default: daftar alat tetap di atas lipatan layar; judulnya
 * sudah menyebut jumlah kategori.
 */
export function CategorySummaryTable({ rows }: { rows: CategorySummary[] }) {
    if (rows.length === 0) return null;
    const finance = rows[0].book_value !== undefined;
    const sum = (key: keyof Omit<CategorySummary, 'name'>) =>
        rows.reduce((s, r) => s + (r[key] ?? 0), 0);

    return (
        <Panel flush label="Ringkasan per kategori">
            <Collapsible>
                <CollapsibleTrigger
                    render={
                        <Button
                            variant="ghost"
                            className="group h-auto w-full justify-between rounded-none px-[18px] py-3.5"
                        />
                    }
                >
                    <span className="text-lg leading-tight font-medium tracking-[-0.01em]">
                        Per kategori
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {rows.length} kategori
                        <ChevronDown className="transition-transform group-data-[panel-open]:rotate-180" />
                    </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="overflow-x-auto border-t">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Kategori</TableHead>
                                    <KepalaUang>Jenis</KepalaUang>
                                    <KepalaUang>Unit</KepalaUang>
                                    <KepalaUang>Nilai beli</KepalaUang>
                                    {finance && (
                                        <>
                                            <KepalaUang>Nilai buku</KepalaUang>
                                            <KepalaUang>
                                                Maintenance / bln
                                            </KepalaUang>
                                        </>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((r) => (
                                    <TableRow key={r.name}>
                                        <TableCell className="font-medium">
                                            {r.name}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {r.kinds}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {r.units}
                                        </TableCell>
                                        <SelUang nominal={r.purchase_value} />
                                        {finance && (
                                            <>
                                                <SelUang
                                                    nominal={r.book_value ?? 0}
                                                />
                                                <SelUang
                                                    nominal={r.allocation ?? 0}
                                                />
                                            </>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell className="font-semibold">
                                        Total
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                        {sum('kinds')}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                        {sum('units')}
                                    </TableCell>
                                    <SelUang
                                        nominal={sum('purchase_value')}
                                        className="font-semibold"
                                    />
                                    {finance && (
                                        <>
                                            <SelUang
                                                nominal={sum('book_value')}
                                                className="font-semibold"
                                            />
                                            <SelUang
                                                nominal={sum('allocation')}
                                                className="font-semibold"
                                            />
                                        </>
                                    )}
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </Panel>
    );
}

/** Kosong → tidak dirender (bukan kartu kosong, spek 6.2). */
export function ReplacementCard({ data }: { data: Replacements }) {
    if (data.items.length === 0) return null;
    const { maintenance_balance: balance, shortfall } = data;

    return (
        <Panel
            title="Penggantian 6 bulan ke depan"
            aside={`${data.items.length} alat · ${formatRp(data.total_estimate)}`}
        >
            <div className="flex flex-col gap-3 text-sm">
                <p className="text-muted-foreground">
                    Perkiraan dari harga beli
                    {balance !== undefined && shortfall !== undefined && (
                        <>
                            {' '}
                            · dana maintenance{' '}
                            <span className="text-foreground">
                                {formatRp(balance)}
                            </span>{' '}
                            —{' '}
                            {shortfall > 0 ? (
                                <span className="font-semibold text-destructive">
                                    kurang {formatRp(shortfall)}
                                </span>
                            ) : (
                                <span className="font-semibold text-success">
                                    dana cukup
                                </span>
                            )}
                        </>
                    )}
                    .
                </p>
                <ul className="flex flex-col divide-y">
                    {data.items.map((r) => (
                        <li
                            key={r.asset_id}
                            className="flex flex-wrap items-baseline justify-between gap-x-4 py-2 first:pt-0 last:pb-0"
                        >
                            <Link
                                href={AssetController.show(r.asset_id)}
                                className="font-medium underline-offset-4 hover:underline"
                            >
                                {r.name}
                                {r.model ? ` (${r.model})` : ''}
                            </Link>
                            <span className="text-muted-foreground">
                                {formatBulan(r.due_on.slice(0, 7))} ·{' '}
                                <span
                                    className={
                                        r.months_until < 0
                                            ? 'text-destructive'
                                            : ''
                                    }
                                >
                                    {replacementWhen(r.months_until)}
                                </span>{' '}
                                ·{' '}
                                <span className="text-foreground">
                                    {formatRp(r.estimate)}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </Panel>
    );
}
