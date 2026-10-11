/**
 * Aset & Maintenance — business-flow 8.9, bonus di luar quotation Paket B
 * (porting web/app/routes/aset.tsx).
 *
 * Menu sendiri di grup Data, bukan tab di Modal & Bagi Hasil: daftar aset
 * adalah data master yang dirujuk setiap ada servis, bukan laporan bulanan.
 *
 * Satu-satunya pintu menambah aset: otomatis mencatat investasinya (dan
 * setoran modal kalau dibayar owner), dan alokasi dana maintenance dihitung
 * dari daftar ini — tidak ada angka maintenance yang diketik tangan.
 */

import { Head, Link, router } from '@inertiajs/react';
import { Download, Plus, Settings2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import AssetController from '@/actions/Modules/Asset/Controllers/AssetController';
import {
    KepalaUang,
    KosongTabel,
    SelKode,
    SelUang,
    TabelData,
} from '@/components/data-table';
import { ListToolbar } from '@/components/list-toolbar';
import type { ListFilterDef, ListFilters } from '@/components/list-toolbar';
import { PageActions } from '@/components/page-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatBulan, formatRp, formatUmurPiutang } from '@/lib/format';
import {
    NextMaintenance,
    StatusBadge,
    WarrantyBadge,
} from '@/modules/asset/components/asset-badges';
import { filterAssets } from '@/modules/asset/lib/filter';
import type { AssetStatusFilter } from '@/modules/asset/lib/filter';
import { brandModel } from '@/modules/asset/types';
import type { AssetRow } from '@/modules/asset/types';
import { index as assetCategoriesIndex } from '@/routes/asset-categories';
import {
    index as assetsIndex,
    exportMethod as assetsExport,
} from '@/routes/assets';

const STATUS_FILTERS: { value: AssetStatusFilter; label: string }[] = [
    { value: 'active', label: 'Aktif' },
    { value: 'broken', label: 'Rusak' },
    { value: 'disposed', label: 'Dilepas' },
];

interface Props {
    month: string;
    today: string;
    summary: {
        units: number;
        kinds: number;
        purchase_value: number;
        book_value: number;
        allocation: number;
    };
    due: {
        asset_id: number;
        name: string;
        model: string | null;
        days_until: number;
    }[];
    assets: AssetRow[];
    categories: { id: number; name: string }[];
}

export default function AssetsIndex(props: Props) {
    const { month, summary, due, assets, categories, today } = props;
    // Cari & filter di klien (spek 3.6, 8.1) — daftar aset kecil dan dimuat penuh.
    const [search, setSearch] = useState<ListFilters>({ q: '' });
    const filters: ListFilterDef[] = [
        {
            key: 'category',
            label: 'Kategori',
            options: categories.map((c) => ({
                value: String(c.id),
                label: c.name,
            })),
        },
        { key: 'status', label: 'Status', options: STATUS_FILTERS },
    ];
    const visible = filterAssets(assets, {
        q: search.q,
        category: search.category ? Number(search.category) : undefined,
        status: STATUS_FILTERS.find((s) => s.value === search.status)?.value,
    });
    const open = (a: AssetRow) => router.visit(AssetController.show(a.id));

    return (
        <>
            <Head title="Aset & Maintenance" />
            <h1 className="sr-only">Aset & Maintenance</h1>

            <PageActions>
                {/* <a href>, bukan Link: Inertia tidak menangani unduhan. */}
                <Button
                    variant="outline"
                    nativeButton={false}
                    render={<a href={assetsExport().url} />}
                >
                    <Download data-icon="inline-start" />
                    Ekspor CSV
                </Button>
                <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={assetCategoriesIndex()} />}
                >
                    <Settings2 data-icon="inline-start" />
                    Kategori
                </Button>
                {/* Halaman penuh, bukan dialog (spek 8.1). */}
                <Button
                    nativeButton={false}
                    render={<Link href={AssetController.create()} />}
                >
                    <Plus data-icon="inline-start" />
                    Tambah Aset
                </Button>
            </PageActions>

            <div className="flex flex-col gap-6 p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Summary
                        label="Aset dimiliki"
                        value={`${summary.units} unit`}
                        note={`${summary.kinds} jenis alat`}
                    />
                    <Summary
                        label="Nilai beli"
                        value={formatRp(summary.purchase_value)}
                        note="harga saat dibeli"
                    />
                    <Summary
                        label="Nilai buku"
                        value={formatRp(summary.book_value)}
                        note="setelah penyusutan, hanya informasi"
                    />
                    <Summary
                        label={`Alokasi maintenance ${formatBulan(month)}`}
                        value={formatRp(summary.allocation)}
                        note="dihitung dari daftar ini, masuk Laba Rugi"
                    />
                </div>

                {due.length > 0 && (
                    <Alert>
                        <TriangleAlert />
                        <AlertTitle>{due.length} aset perlu dirawat</AlertTitle>
                        <AlertDescription>
                            {due.map((d) => (
                                <span key={d.asset_id} className="block">
                                    {d.name}
                                    {d.model ? ` (${d.model})` : ''} — perawatan{' '}
                                    {formatUmurPiutang(d.days_until)}.
                                </span>
                            ))}
                        </AlertDescription>
                    </Alert>
                )}

                {assets.length > 0 && (
                    <ListToolbar
                        value={search}
                        filters={filters}
                        placeholder="Cari kode, nama, merek, seri, atau lokasi…"
                        onChange={setSearch}
                    />
                )}

                {assets.length > 0 && visible.length === 0 ? (
                    <KosongTabel
                        kalimat="Tidak ada aset yang cocok."
                        aksi={{
                            label: 'Hapus filter',
                            onClick: () => setSearch({ q: '' }),
                        }}
                    />
                ) : assets.length === 0 ? (
                    <KosongTabel
                        kalimat="Belum ada aset. Catat alat studio supaya dana maintenance dihitung otomatis."
                        aksi={{
                            label: 'Tambah Aset',
                            onClick: () =>
                                router.visit(AssetController.create()),
                        }}
                    />
                ) : (
                    <TabelData>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Kode</TableHead>
                                <TableHead>Aset</TableHead>
                                <TableHead>Kategori</TableHead>
                                <KepalaUang>Unit</KepalaUang>
                                <KepalaUang>Harga beli</KepalaUang>
                                <KepalaUang>Maintenance / bln</KepalaUang>
                                <KepalaUang>Nilai buku</KepalaUang>
                                <TableHead>Perawatan berikutnya</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map((a) => {
                                const sub = [brandModel(a), a.location]
                                    .filter(Boolean)
                                    .join(' · ');
                                return (
                                    <TableRow
                                        key={a.id}
                                        // Dipudarkan seperti order Batal: riwayat, bukan yang aktif.
                                        className={`cursor-pointer ${a.disposed_on ? 'opacity-60' : ''}`}
                                        onClick={() => open(a)}
                                    >
                                        <SelKode>{a.code}</SelKode>
                                        <TableCell className="whitespace-normal">
                                            {/* Link untuk keyboard & buka-di-tab-baru; baris tetap bisa diklik. */}
                                            <Link
                                                href={AssetController.show(
                                                    a.id,
                                                )}
                                                className="font-medium hover:underline"
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                {a.name}
                                            </Link>
                                            {sub && (
                                                <span className="block text-xs text-muted-foreground">
                                                    {sub}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>{a.category}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {a.units}
                                        </TableCell>
                                        <SelUang nominal={a.purchase_total} />
                                        <SelUang nominal={a.allocation} />
                                        <SelUang nominal={a.book_value} />
                                        <TableCell className="whitespace-nowrap">
                                            <NextMaintenance asset={a} />
                                        </TableCell>
                                        <TableCell>
                                            <span className="flex flex-col items-start gap-1">
                                                <StatusBadge asset={a} />
                                                {!a.disposed_on && (
                                                    <WarrantyBadge
                                                        until={a.warranty_until}
                                                        today={today}
                                                        compact
                                                    />
                                                )}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </TabelData>
                )}

                <p className="text-xs text-muted-foreground">
                    Alokasi maintenance = harga × unit × persen, untuk aset yang
                    dimiliki di akhir bulan. Dikurangkan di Laba Rugi sebelum
                    laba bersih dan masuk dana maintenance. Nilai buku hanya
                    informasi — tidak masuk Laba Rugi, supaya keausan alat tidak
                    dibebankan dua kali. Klik baris untuk detail & riwayat
                    servis.
                </p>
            </div>
        </>
    );
}

AssetsIndex.layout = {
    breadcrumbs: [{ title: 'Aset & Maintenance', href: assetsIndex() }],
};

function Summary({
    label,
    value,
    note,
}: {
    label: string;
    value: string;
    note: string;
}) {
    return (
        <Card className="p-5">
            <CardHeader className="p-0">
                <CardDescription className="text-xs">{label}</CardDescription>
                {/* text-xl + nowrap: nilai di atas Rp 10 juta tidak terpotong dua baris di kartu 1280 px. */}
                <CardTitle className="font-mono text-xl font-semibold whitespace-nowrap">
                    {value}
                </CardTitle>
            </CardHeader>
            <p className="text-xs text-muted-foreground">{note}</p>
        </Card>
    );
}
