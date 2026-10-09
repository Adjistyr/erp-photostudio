/**
 * Katalog — daftar (prompt 4.1 & 4.2, porting web/app/routes/katalog.tsx).
 * Tambah/edit dulu dialog; sejak spek 7.2 halaman penuh (`form.tsx`).
 *
 * Modul fondasi: POS, form order, dan laporan HPP bergantung ke sini. Aturan
 * isi yang gampang hilang: HPP & margin jasa ditampilkan "—", bukan Rp 0. HPP
 * jasa bukan nol — tidak tetap, dicatat per job. Menulis Rp 0 membuat margin
 * jasa terlihat 100%.
 */

import { Head, Link, router } from '@inertiajs/react';
import {
    CornerDownRight,
    Eye,
    EyeOff,
    MoreHorizontal,
    Pencil,
    Plus,
} from 'lucide-react';
import { Fragment, useState } from 'react';
import CatalogItemController from '@/actions/Modules/Catalog/Controllers/CatalogItemController';
import {
    KepalaUang,
    KosongTabel,
    SelUang,
    TabelData,
} from '@/components/data-table';
import { ListToolbar } from '@/components/list-toolbar';
import type { ListFilters } from '@/components/list-toolbar';
import { PageActions } from '@/components/page-actions';
import { ProductPhoto } from '@/components/product-photo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatPersen, formatRp } from '@/lib/format';
import { filterCatalog, isLowMargin } from '@/modules/catalog/lib/filter';
import type { CatalogItem, CatalogVariant } from '@/modules/catalog/types';
import { index as catalogIndex } from '@/routes/catalog';

const FILTER = ['all', 'product', 'service'] as const;
type Filter = (typeof FILTER)[number];

export default function CatalogIndex({
    items,
    low_margin_ratio,
}: {
    items: CatalogItem[];
    /** Ambang margin rendah 0..1 dari config/studio.php (spek 3.6). */
    low_margin_ratio: number;
}) {
    const [filter, setFilter] = useState<Filter>('all');
    // Cari di klien (spek 3.6) — katalog kecil dan dimuat penuh.
    const [search, setSearch] = useState<ListFilters>({ q: '' });
    const visible = filterCatalog(items, { type: filter, q: search.q });
    const lowMarginNote = `Merah bila di bawah ${formatPersen(low_margin_ratio)} — ambang di konfigurasi studio.`;
    const tersesat = items.filter((i) => i.unknown_category).length;

    const toggleActive = (item: CatalogItem) => {
        router.patch(
            CatalogItemController.toggleActive(item.id).url,
            {},
            { preserveScroll: true },
        );
    };

    return (
        <>
            <Head title="Katalog" />
            <h1 className="sr-only">Katalog</h1>
            <PageActions>
                {/* Halaman penuh, bukan dialog (spek 7.2). */}
                <Button
                    nativeButton={false}
                    render={<Link href={CatalogItemController.create()} />}
                >
                    <Plus data-icon="inline-start" />
                    Tambah Item
                </Button>
            </PageActions>

            <div className="flex flex-col gap-6 p-6">
                <Tabs
                    value={filter}
                    onValueChange={(v) => {
                        const f = FILTER.find((x) => x === v);
                        if (f) setFilter(f);
                    }}
                >
                    <TabsList>
                        <TabsTrigger value="all">Semua</TabsTrigger>
                        <TabsTrigger value="product">Produk</TabsTrigger>
                        <TabsTrigger value="service">Jasa</TabsTrigger>
                    </TabsList>
                </Tabs>

                {tersesat > 0 && (
                    <Alert variant="destructive">
                        <AlertTitle>
                            {tersesat} jasa tidak muncul di Buat Order
                        </AlertTitle>
                        <AlertDescription>
                            Kategorinya tidak dikenal. Buka Edit dan pilih
                            Studio, Event, atau Add-on.
                        </AlertDescription>
                    </Alert>
                )}

                <ListToolbar
                    value={search}
                    placeholder="Cari nama atau kategori…"
                    onChange={setSearch}
                />

                {visible.length === 0 && search.q.trim() !== '' ? (
                    <KosongTabel
                        kalimat="Tidak ada item yang cocok."
                        aksi={{
                            label: 'Hapus pencarian',
                            onClick: () => setSearch({ q: '' }),
                        }}
                    />
                ) : visible.length === 0 ? (
                    <KosongTabel
                        kalimat="Belum ada produk atau jasa. Tambahkan yang paling sering dijual dulu."
                        aksi={{
                            label: 'Tambah Item',
                            onClick: () =>
                                router.visit(CatalogItemController.create()),
                        }}
                    />
                ) : (
                    <TabelData>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama</TableHead>
                                <TableHead>Jenis</TableHead>
                                <TableHead>Kategori</TableHead>
                                <KepalaUang>Harga jual</KepalaUang>
                                <KepalaUang>HPP bahan</KepalaUang>
                                <KepalaUang>Margin</KepalaUang>
                                <KepalaUang>
                                    <Tooltip>
                                        <TooltipTrigger
                                            render={
                                                <span className="cursor-help underline decoration-dotted decoration-from-font underline-offset-4" />
                                            }
                                        >
                                            Margin %
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {lowMarginNote}
                                        </TooltipContent>
                                    </Tooltip>
                                </KepalaUang>
                                <TableHead>Status</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map((item) => (
                                <Fragment key={item.id}>
                                    <TableRow
                                        className={
                                            item.is_active ? '' : 'opacity-60'
                                        }
                                    >
                                        {/* Nama boleh terlipat: thumbnail + badge Profil membuat
                                        tabel meluap di laptop 1280 px bila nama satu baris. */}
                                        <TableCell className="min-w-40 font-medium whitespace-normal">
                                            <span className="flex items-center gap-2">
                                                <ProductPhoto
                                                    url={
                                                        item.photos[0]
                                                            ?.thumb_url
                                                    }
                                                    className="size-8 rounded-md"
                                                />
                                                <span className="flex flex-col">
                                                    {item.name}
                                                    {item.variants.length >
                                                        0 && (
                                                        <span className="text-xs font-normal text-muted-foreground">
                                                            {
                                                                item.variants
                                                                    .length
                                                            }{' '}
                                                            varian
                                                        </span>
                                                    )}
                                                </span>
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    item.type === 'service'
                                                        ? 'outline'
                                                        : 'secondary'
                                                }
                                            >
                                                {item.type === 'service'
                                                    ? 'Jasa'
                                                    : 'Produk'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {item.unknown_category ? (
                                                <Badge
                                                    variant="destructive"
                                                    title="Tidak muncul di Buat Order — ubah kategorinya"
                                                >
                                                    {item.category} · tidak
                                                    dikenal
                                                </Badge>
                                            ) : (
                                                item.category
                                            )}
                                        </TableCell>
                                        {item.variants.length > 0 ? (
                                            // Harga sebenarnya per varian (sub-baris di bawah).
                                            <TableCell className="text-right font-mono whitespace-nowrap">
                                                {/* "mulai" di baris sendiri — lebar kolom tetap
                                                selebar angka, tabel tetap muat 1280 px. */}
                                                <span className="block font-sans text-xs text-muted-foreground">
                                                    mulai
                                                </span>
                                                {formatRp(item.price)}
                                            </TableCell>
                                        ) : (
                                            <SelUang nominal={item.price} />
                                        )}
                                        {/*
                                        "—" untuk jasa. Sengaja BUKAN Rp 0: nol
                                        berarti "tidak ada biaya", padahal yang
                                        benar "biayanya tidak tetap, dicatat per
                                        job".
                                    */}
                                        {item.unit_cost === null ||
                                        item.variants.length > 0 ? (
                                            <>
                                                <NotApplicable />
                                                <NotApplicable />
                                                <NotApplicable />
                                            </>
                                        ) : (
                                            <>
                                                <SelUang
                                                    nominal={item.unit_cost}
                                                />
                                                <SelUang
                                                    nominal={
                                                        item.price -
                                                        item.unit_cost
                                                    }
                                                />
                                                {/* Produk bermargin tipis menonjol tanpa
                                                harus membaca angkanya satu per satu. */}
                                                <TableCell
                                                    className={`text-right font-mono ${isLowMargin(item.price, item.unit_cost, low_margin_ratio) ? 'text-destructive' : ''}`}
                                                    title={
                                                        isLowMargin(
                                                            item.price,
                                                            item.unit_cost,
                                                            low_margin_ratio,
                                                        )
                                                            ? lowMarginNote
                                                            : undefined
                                                    }
                                                >
                                                    {formatPersen(
                                                        (item.price -
                                                            item.unit_cost) /
                                                            item.price,
                                                    )}
                                                </TableCell>
                                            </>
                                        )}
                                        <TableCell>
                                            <span className="flex gap-1">
                                                {item.is_active ? (
                                                    <Badge variant="success">
                                                        Aktif
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary">
                                                        Nonaktif
                                                    </Badge>
                                                )}
                                                {/* Di kolom Status, bukan Nama: lebar Nama menentukan
                                                apakah tabel muat di laptop 1280 px. */}
                                                {item.is_public && (
                                                    <Badge
                                                        variant="outline"
                                                        title="Tampil di company profile"
                                                    >
                                                        Profil
                                                    </Badge>
                                                )}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {/* Tidak ada Hapus — item yang pernah
                                            terjual hanya dinonaktifkan supaya
                                            riwayat order tidak rusak. */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger
                                                    render={
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            aria-label={`Aksi ${item.name}`}
                                                        />
                                                    }
                                                >
                                                    <MoreHorizontal />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuGroup>
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                router.visit(
                                                                    CatalogItemController.edit(
                                                                        item.id,
                                                                    ),
                                                                )
                                                            }
                                                        >
                                                            <Pencil />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                toggleActive(
                                                                    item,
                                                                )
                                                            }
                                                        >
                                                            {item.is_active ? (
                                                                <EyeOff />
                                                            ) : (
                                                                <Eye />
                                                            )}
                                                            {item.is_active
                                                                ? 'Nonaktifkan'
                                                                : 'Aktifkan'}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuGroup>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                    {item.variants.map((v) => (
                                        <VariantSubRow
                                            key={`v${v.id}`}
                                            variant={v}
                                            dimmed={!item.is_active}
                                            lowMarginRatio={low_margin_ratio}
                                            lowMarginNote={lowMarginNote}
                                        />
                                    ))}
                                </Fragment>
                            ))}
                        </TableBody>
                    </TabelData>
                )}

                <p className="text-xs text-muted-foreground">
                    HPP bahan hanya berlaku untuk produk fisik. HPP jasa berbeda
                    tiap job — fee crew, transport, sewa — dan dicatat per order
                    lewat menu Biaya.
                </p>
            </div>
        </>
    );
}

CatalogIndex.layout = {
    breadcrumbs: [{ title: 'Katalog', href: catalogIndex() }],
};

/** Varian di bawah produknya (spek 7.3) — harga, HPP, dan margin sendiri. */
function VariantSubRow({
    variant: v,
    dimmed,
    lowMarginRatio,
    lowMarginNote,
}: {
    variant: CatalogVariant;
    /** Produknya nonaktif — variannya ikut tidak dijual. */
    dimmed: boolean;
    lowMarginRatio: number;
    lowMarginNote: string;
}) {
    const low = isLowMargin(v.price, v.unit_cost, lowMarginRatio);
    return (
        <TableRow
            className={`bg-muted/30 ${dimmed || !v.is_active ? 'opacity-60' : ''}`}
        >
            <TableCell className="whitespace-normal">
                <span className="flex items-center gap-2 pl-10 text-sm">
                    <CornerDownRight className="size-3.5 shrink-0 text-muted-foreground" />
                    {v.name}
                </span>
            </TableCell>
            <TableCell />
            <TableCell />
            <SelUang nominal={v.price} />
            <SelUang nominal={v.unit_cost} />
            <SelUang nominal={v.price - v.unit_cost} />
            <TableCell
                className={`text-right font-mono ${low ? 'text-destructive' : ''}`}
                title={low ? lowMarginNote : undefined}
            >
                {formatPersen((v.price - v.unit_cost) / v.price)}
            </TableCell>
            <TableCell>
                {!v.is_active && <Badge variant="secondary">Nonaktif</Badge>}
            </TableCell>
            <TableCell />
        </TableRow>
    );
}

function NotApplicable() {
    return (
        <TableCell className="text-right font-mono text-muted-foreground">
            —
        </TableCell>
    );
}
