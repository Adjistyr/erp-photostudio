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
import { Notice, PageHeader, Panel } from '@/components/page';
import { ProductPhoto } from '@/components/product-photo';
import { SummaryCard } from '@/components/summary-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useCan } from '@/hooks/use-can';
import {
    formatBulan,
    formatRp,
    formatTanggal,
    formatUmurPiutang,
} from '@/lib/format';
import {
    NextMaintenance,
    StatusBadge,
    WarrantyBadge,
} from '@/modules/asset/components/asset-badges';
import {
    CategorySummaryTable,
    ReplacementCard,
} from '@/modules/asset/components/asset-overview';
import type {
    CategorySummary,
    Replacements,
} from '@/modules/asset/components/asset-overview';
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

/** Nilai buku, alokasi & dana tidak dikirim untuk admin (spek 5.1) — dirender dari ada-tidaknya. */
interface Props {
    month: string;
    today: string;
    summary: {
        units: number;
        kinds: number;
        purchase_value: number;
        book_value?: number;
        allocation?: number;
    };
    due: {
        asset_id: number;
        name: string;
        model: string | null;
        days_until: number;
    }[];
    /** + thumbnail sampul (foto alat pertama, spek 8.2). */
    assets: (AssetRow & { photo_url: string | null; units_out: number })[];
    /** Belum kembali, lewat rencana kembali (spek 8.4). */
    overdue_checkouts: {
        asset_id: number;
        name: string;
        quantity: number;
        holder: string;
        due_back_on: string;
    }[];
    categories: { id: number; name: string }[];
    /** Spek 8.3 — aset dimiliki per kategori. */
    by_category: CategorySummary[];
    /** Spek 6.2 / 8.3 — habis umur ekonomis dalam 6 bulan. */
    replacements: Replacements;
}

export default function AssetsIndex(props: Props) {
    const { month, summary, due, assets, categories, today } = props;
    const can = useCan();
    const { book_value: bookValue, allocation } = summary;
    const { by_category, replacements, overdue_checkouts } = props;
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
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <Head title="Aset & Maintenance" />
            <PageHeader
                title="Aset & Maintenance"
                description="Alat studio, jadwal perawatan, dan peminjaman."
                actions={
                    <>
                        {/* <a href>, bukan Link: Inertia tidak menangani unduhan.
                            Ekspor memuat nilai buku — hanya owner (spek 5.1). */}
                        {can.view_finance && (
                            <Button
                                variant="outline"
                                nativeButton={false}
                                render={<a href={assetsExport().url} />}
                            >
                                <Download data-icon="inline-start" />
                                Ekspor CSV
                            </Button>
                        )}
                        {/* Register alat dikelola owner; admin mencatat servis & status. */}
                        {can.manage_assets && (
                            <>
                                <Button
                                    variant="outline"
                                    nativeButton={false}
                                    render={
                                        <Link href={assetCategoriesIndex()} />
                                    }
                                >
                                    <Settings2 data-icon="inline-start" />
                                    Kategori
                                </Button>
                                {/* Halaman penuh, bukan dialog (spek 8.1). */}
                                <Button
                                    nativeButton={false}
                                    render={
                                        <Link href={AssetController.create()} />
                                    }
                                >
                                    <Plus data-icon="inline-start" />
                                    Tambah Aset
                                </Button>
                            </>
                        )}
                    </>
                }
            />

            <div
                className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${bookValue !== undefined ? 'xl:grid-cols-4' : ''}`}
            >
                <SummaryCard
                    label="Aset dimiliki"
                    value={`${summary.units} unit`}
                    note={`${summary.kinds} jenis alat`}
                />
                <SummaryCard
                    label="Nilai beli"
                    value={formatRp(summary.purchase_value)}
                    note="harga saat dibeli"
                />
                {bookValue !== undefined && (
                    <SummaryCard
                        label="Nilai buku"
                        value={formatRp(bookValue)}
                        note="setelah penyusutan, hanya informasi"
                    />
                )}
                {allocation !== undefined && (
                    <SummaryCard
                        label={`Alokasi maintenance ${formatBulan(month)}`}
                        value={formatRp(allocation)}
                        note="dihitung dari daftar ini, masuk Laba Rugi"
                    />
                )}
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

            {overdue_checkouts.length > 0 && (
                <Alert variant="destructive">
                    <TriangleAlert />
                    <AlertTitle>
                        {overdue_checkouts.length} peminjaman belum kembali
                    </AlertTitle>
                    <AlertDescription>
                        {overdue_checkouts.map((c, i) => (
                            <span key={i} className="block">
                                <Link
                                    href={AssetController.show(c.asset_id)}
                                    className="underline underline-offset-4"
                                >
                                    {c.name}
                                </Link>{' '}
                                × {c.quantity} — dibawa {c.holder}, rencana
                                kembali {formatTanggal(c.due_back_on)}.
                            </span>
                        ))}
                    </AlertDescription>
                </Alert>
            )}

            <ReplacementCard data={replacements} />
            <CategorySummaryTable rows={by_category} />

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
                    aksi={
                        can.manage_assets
                            ? {
                                  label: 'Tambah Aset',
                                  onClick: () =>
                                      router.visit(AssetController.create()),
                              }
                            : undefined
                    }
                />
            ) : (
                <Panel
                    title="Daftar aset"
                    aside={`${visible.length} dari ${assets.length} aset`}
                    flush
                >
                    <TabelData>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Kode</TableHead>
                                <TableHead>Aset</TableHead>
                                <KepalaUang>Unit</KepalaUang>
                                <KepalaUang>Harga beli</KepalaUang>
                                {bookValue !== undefined && (
                                    <>
                                        <KepalaUang>
                                            Maintenance / bln
                                        </KepalaUang>
                                        <KepalaUang>Nilai buku</KepalaUang>
                                    </>
                                )}
                                <TableHead>Perawatan berikutnya</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map((a) => {
                                // Kategori di baris kecil, bukan kolom sendiri (spek 8.2):
                                // thumbnail sampul butuh ruang, kategori tetap bisa difilter.
                                const sub = [
                                    a.category,
                                    brandModel(a),
                                    a.location,
                                ]
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
                                        <TableCell className="min-w-56 whitespace-normal">
                                            <span className="flex items-center gap-2">
                                                <ProductPhoto
                                                    url={a.photo_url}
                                                    className="size-8 rounded-md"
                                                />
                                                <span>
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
                                                </span>
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {a.units}
                                        </TableCell>
                                        <SelUang nominal={a.purchase_total} />
                                        {a.allocation !== undefined &&
                                            a.book_value !== undefined && (
                                                <>
                                                    <SelUang
                                                        nominal={a.allocation}
                                                    />
                                                    <SelUang
                                                        nominal={a.book_value}
                                                    />
                                                </>
                                            )}
                                        <TableCell className="whitespace-nowrap">
                                            <NextMaintenance asset={a} />
                                        </TableCell>
                                        <TableCell>
                                            <span className="flex flex-col items-start gap-1">
                                                <StatusBadge asset={a} />
                                                {a.units_out > 0 && (
                                                    <Badge
                                                        variant="outline"
                                                        title="Sedang dibawa keluar (spek 8.4)"
                                                    >
                                                        Dipinjam {a.units_out}/
                                                        {a.units}
                                                    </Badge>
                                                )}
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
                </Panel>
            )}

            <Notice>
                {bookValue !== undefined &&
                    'Alokasi maintenance = harga × unit × persen, untuk aset yang dimiliki di akhir bulan. Dikurangkan di Laba Rugi sebelum laba bersih dan masuk dana maintenance. Nilai buku hanya informasi — tidak masuk Laba Rugi, supaya keausan alat tidak dibebankan dua kali. '}
                Klik baris untuk detail & riwayat servis.
            </Notice>
        </div>
    );
}

AssetsIndex.layout = {
    breadcrumbs: [{ title: 'Aset & Maintenance', href: assetsIndex() }],
};
