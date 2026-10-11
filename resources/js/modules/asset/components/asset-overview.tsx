/**
 * Ringkasan per kategori + proyeksi penggantian di halaman Aset (spek 8.3,
 * melaksanakan 6.2).
 */

import { Link } from '@inertiajs/react';
import { CalendarClock, ChevronDown } from 'lucide-react';
import AssetController from '@/actions/Modules/Asset/Controllers/AssetController';
import { KepalaUang, SelUang } from '@/components/data-table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

export interface CategorySummary {
    name: string;
    kinds: number;
    units: number;
    purchase_value: number;
    book_value: number;
    allocation: number;
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
    maintenance_balance: number;
    shortfall: number;
}

/**
 * Tertutup secara default: daftar alat tetap di atas lipatan layar; judulnya
 * sudah menyebut jumlah kategori.
 */
export function CategorySummaryTable({ rows }: { rows: CategorySummary[] }) {
    if (rows.length === 0) return null;
    const sum = (key: keyof Omit<CategorySummary, 'name'>) =>
        rows.reduce((s, r) => s + r[key], 0);

    return (
        <Collapsible className="rounded-lg border">
            <CollapsibleTrigger
                render={
                    <Button
                        variant="ghost"
                        className="group w-full justify-between rounded-lg px-4"
                    />
                }
            >
                <span className="text-sm">
                    Per kategori · {rows.length} kategori
                </span>
                <ChevronDown className="transition-transform group-data-[panel-open]:rotate-180" />
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
                                <KepalaUang>Nilai buku</KepalaUang>
                                <KepalaUang>Maintenance / bln</KepalaUang>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((r) => (
                                <TableRow key={r.name}>
                                    <TableCell className="font-medium">
                                        {r.name}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        {r.kinds}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        {r.units}
                                    </TableCell>
                                    <SelUang nominal={r.purchase_value} />
                                    <SelUang nominal={r.book_value} />
                                    <SelUang nominal={r.allocation} />
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell className="font-semibold">
                                    Total
                                </TableCell>
                                <TableCell className="text-right font-mono font-semibold">
                                    {sum('kinds')}
                                </TableCell>
                                <TableCell className="text-right font-mono font-semibold">
                                    {sum('units')}
                                </TableCell>
                                <SelUang
                                    nominal={sum('purchase_value')}
                                    className="font-semibold"
                                />
                                <SelUang
                                    nominal={sum('book_value')}
                                    className="font-semibold"
                                />
                                <SelUang
                                    nominal={sum('allocation')}
                                    className="font-semibold"
                                />
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

/** Kosong → tidak dirender (bukan kartu kosong, spek 6.2). */
export function ReplacementCard({ data }: { data: Replacements }) {
    if (data.items.length === 0) return null;
    const short = data.shortfall > 0;

    return (
        <Alert>
            <CalendarClock />
            <AlertTitle>Penggantian 6 bulan ke depan</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
                <p>
                    {data.items.length} alat · perkiraan{' '}
                    <span className="font-mono text-foreground">
                        {formatRp(data.total_estimate)}
                    </span>{' '}
                    · dana maintenance{' '}
                    <span className="font-mono text-foreground">
                        {formatRp(data.maintenance_balance)}
                    </span>{' '}
                    —{' '}
                    {short ? (
                        <span className="font-semibold text-destructive">
                            kurang {formatRp(data.shortfall)}
                        </span>
                    ) : (
                        <span className="font-semibold text-success">
                            dana cukup
                        </span>
                    )}
                    . Perkiraan dari harga beli.
                </p>
                <ul className="flex flex-col gap-1">
                    {data.items.map((r) => (
                        <li
                            key={r.asset_id}
                            className="flex flex-wrap items-baseline justify-between gap-x-4"
                        >
                            <Link
                                href={AssetController.show(r.asset_id)}
                                className="text-foreground underline-offset-4 hover:underline"
                            >
                                {r.name}
                                {r.model ? ` (${r.model})` : ''}
                            </Link>
                            <span>
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
                                <span className="font-mono text-foreground">
                                    {formatRp(r.estimate)}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
            </AlertDescription>
        </Alert>
    );
}
