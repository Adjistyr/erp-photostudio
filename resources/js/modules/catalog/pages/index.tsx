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
    Calculator,
    CornerDownRight,
    Eye,
    EyeOff,
    MoreHorizontal,
    Package,
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
import { Notice, PageHeader } from '@/components/page';
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
import { useCan } from '@/hooks/use-can';
import { formatPersen, formatRp } from '@/lib/format';
import { bundleIncludes } from '@/modules/catalog/lib/bundle';
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
    /**
     * Ambang margin rendah 0..1 dari config/studio.php (spek 3.6). Tidak
     * dikirim untuk admin bersama `unit_cost` (spek 5.1) — kolom HPP & margin
     * hanya dirender bila ada.
     */
    low_margin_ratio?: number;
}) {
    const can = useCan();
    const [filter, setFilter] = useState<Filter>('all');
    // Cari di klien (spek 3.6) — katalog kecil dan dimuat penuh.
    const [search, setSearch] = useState<ListFilters>({ q: '' });
    const visible = filterCatalog(items, { type: filter, q: search.q });
    const lowMarginNote =
        low_margin_ratio === undefined
            ? ''
            : `Merah bila di bawah ${formatPersen(low_margin_ratio)} — ambang di konfigurasi studio.`;
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
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Katalog"
                    description={
                        low_margin_ratio === undefined
                            ? 'Produk dan jasa yang dijual beserta harganya.'
                            : 'Produk dan jasa yang dijual, beserta harga dan HPP bahannya.'
                    }
                    actions={
                        // Mengelola katalog hanya owner (spek 5.1); admin melihat saja.
                        can.manage_catalog && (
                            // Halaman penuh, bukan dialog (spek 7.2).
                            <Button
                                nativeButton={false}
                                render={
                                    <Link
                                        href={CatalogItemController.create()}
                                    />
                                }
                            >
                                <Plus data-icon="inline-start" />
                                Tambah Item
                            </Button>
                        )
                    }
                />
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
                        aksi={
                            can.manage_catalog
                                ? {
                                      label: 'Tambah Item',
                                      onClick: () =>
                                          router.visit(
                                              CatalogItemController.create(),
                                          ),
                                  }
                                : undefined
                        }
                    />
                ) : (
                    <TabelData>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama</TableHead>
                                <TableHead>Jenis</TableHead>
                                <TableHead>Kategori</TableHead>
                                <KepalaUang>Harga jual</KepalaUang>
                                {low_margin_ratio !== undefined && (
                                    <>
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
                                    </>
                                )}
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
                                                    {/* Isi paket jasa (spek 6.3). */}
                                                    {item.components.length >
                                                        0 && (
                                                        <span className="text-xs font-normal text-muted-foreground">
                                                            {bundleIncludes(
                                                                item.components,
                                                            )}
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
                                            <TableCell className="text-right whitespace-nowrap">
                                                {/* "mulai" di baris sendiri — lebar kolom tetap
                                                selebar angka, tabel tetap muat 1280 px. */}
                                                <span className="block text-xs text-muted-foreground">
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
                                        job". Paket berkomponen (spek 6.3): HPP
                                        bahan hasil hitung; margin tetap "—"
                                        karena biaya job belum termasuk.
                                    */}
                                        {low_margin_ratio ===
                                        undefined ? null : item.unit_cost ==
                                              null ||
                                          item.variants.length > 0 ? (
                                            <>
                                                {item.bundle_cost != null ? (
                                                    <BundleCostCell
                                                        cost={item.bundle_cost}
                                                    />
                                                ) : (
                                                    <NotApplicable />
                                                )}
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
                                                    className={`text-right ${isLowMargin(item.price, item.unit_cost, low_margin_ratio) ? 'text-destructive' : ''}`}
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
                                            {can.manage_catalog && (
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
                                                            {/* Komponen paket (spek 6.3) — bagian di halaman Edit. */}
                                                            {item.type ===
                                                                'service' && (
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        router.visit(
                                                                            `${CatalogItemController.edit.url(item.id)}#komponen`,
                                                                        )
                                                                    }
                                                                >
                                                                    <Package />
                                                                    Komponen…
                                                                </DropdownMenuItem>
                                                            )}
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
                                            )}
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

                {low_margin_ratio !== undefined && (
                    <Notice>
                        HPP bahan hanya berlaku untuk produk fisik. HPP jasa
                        berbeda tiap job — fee crew, transport, sewa — dan
                        dicatat per order lewat menu Biaya. Paket jasa
                        berkomponen menampilkan HPP bahan komponennya (dihitung,
                        ikut ke order berikutnya).
                    </Notice>
                )}
            </div>
        </>
    );
}

CatalogIndex.layout = {
    breadcrumbs: [{ title: 'Katalog', href: catalogIndex() }],
};

/**
 * Varian di bawah produknya (spek 7.3) — harga, HPP, dan margin sendiri.
 * Tanpa `lowMarginRatio` (admin, spek 5.1) kolom HPP & margin tidak ada.
 */
function VariantSubRow({
    variant: v,
    dimmed,
    lowMarginRatio,
    lowMarginNote,
}: {
    variant: CatalogVariant;
    /** Produknya nonaktif — variannya ikut tidak dijual. */
    dimmed: boolean;
    lowMarginRatio?: number;
    lowMarginNote: string;
}) {
    const cost = v.unit_cost;
    const low =
        lowMarginRatio !== undefined &&
        cost !== undefined &&
        isLowMargin(v.price, cost, lowMarginRatio);
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
            {lowMarginRatio !== undefined && cost !== undefined && (
                <>
                    <SelUang nominal={cost} />
                    <SelUang nominal={v.price - cost} />
                    <TableCell
                        className={`text-right ${low ? 'text-destructive' : ''}`}
                        title={low ? lowMarginNote : undefined}
                    >
                        {formatPersen((v.price - cost) / v.price)}
                    </TableCell>
                </>
            )}
            <TableCell>
                {!v.is_active && <Badge variant="secondary">Nonaktif</Badge>}
            </TableCell>
            <TableCell />
        </TableRow>
    );
}

function NotApplicable() {
    return (
        <TableCell className="text-right text-muted-foreground">—</TableCell>
    );
}

/** HPP bahan paket berkomponen (spek 6.3) — hasil hitung, bukan isian. */
function BundleCostCell({ cost }: { cost: number }) {
    return (
        <TableCell className="text-right whitespace-nowrap">
            <Tooltip>
                <TooltipTrigger
                    render={
                        <span className="inline-flex cursor-help items-center gap-1" />
                    }
                >
                    <Calculator
                        className="size-3.5 text-muted-foreground"
                        aria-label="Dihitung dari komponen"
                    />
                    {formatRp(cost)}
                </TooltipTrigger>
                <TooltipContent>
                    Dihitung dari komponen paket dengan HPP katalog saat ini.
                </TooltipContent>
            </Tooltip>
        </TableCell>
    );
}
