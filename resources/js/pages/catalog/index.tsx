/**
 * Katalog — daftar + dialog tambah/edit (prompt 4.1 & 4.2, porting
 * web/app/routes/katalog.tsx).
 *
 * Modul fondasi: POS, form order, dan laporan HPP bergantung ke sini. Aturan
 * isi yang gampang hilang: HPP & margin jasa ditampilkan "—", bukan Rp 0. HPP
 * jasa bukan nol — tidak tetap, dicatat per job. Menulis Rp 0 membuat margin
 * jasa terlihat 100%.
 */

import { Head, router, useForm } from '@inertiajs/react';
import { Eye, EyeOff, MoreHorizontal, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import CatalogItemController from '@/actions/App/Http/Controllers/CatalogItemController';
import {
    KepalaUang,
    KosongTabel,
    SelUang,
    TabelData,
} from '@/components/data-table';
import InputError from '@/components/input-error';
import { PageActions } from '@/components/page-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatPersen, formatRp, hanyaDigit } from '@/lib/format';
import { index as catalogIndex } from '@/routes/catalog';

type CatalogItemType = 'product' | 'service';

/** Bentuk props dari CatalogItemController@index. */
export interface CatalogItem {
    id: number;
    name: string;
    type: CatalogItemType;
    price: number;
    /** HPP bahan per unit; null untuk jasa. */
    unit_cost: number | null;
    category: string;
    is_active: boolean;
}

const FILTER = ['all', 'product', 'service'] as const;
type Filter = (typeof FILTER)[number];

export default function CatalogIndex({ items }: { items: CatalogItem[] }) {
    const [filter, setFilter] = useState<Filter>('all');
    /** null = dialog tertutup · 'new' = tambah · CatalogItem = edit item itu. */
    const [editing, setEditing] = useState<CatalogItem | 'new' | null>(null);

    const visible =
        filter === 'all' ? items : items.filter((i) => i.type === filter);

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
                <Button onClick={() => setEditing('new')}>
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

                {visible.length === 0 ? (
                    <KosongTabel
                        kalimat="Belum ada produk atau jasa. Tambahkan yang paling sering dijual dulu."
                        aksi={{
                            label: 'Tambah Item',
                            onClick: () => setEditing('new'),
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
                                <KepalaUang>Margin %</KepalaUang>
                                <TableHead>Status</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map((item) => (
                                <TableRow
                                    key={item.id}
                                    className={
                                        item.is_active ? '' : 'opacity-60'
                                    }
                                >
                                    <TableCell className="font-medium whitespace-nowrap">
                                        {item.name}
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
                                        {item.category}
                                    </TableCell>
                                    <SelUang nominal={item.price} />
                                    {/*
                                        "—" untuk jasa. Sengaja BUKAN Rp 0: nol
                                        berarti "tidak ada biaya", padahal yang
                                        benar "biayanya tidak tetap, dicatat per
                                        job".
                                    */}
                                    {item.unit_cost === null ? (
                                        <>
                                            <NotApplicable />
                                            <NotApplicable />
                                            <NotApplicable />
                                        </>
                                    ) : (
                                        <>
                                            <SelUang nominal={item.unit_cost} />
                                            <SelUang
                                                nominal={
                                                    item.price - item.unit_cost
                                                }
                                            />
                                            <TableCell className="text-right font-mono">
                                                {formatPersen(
                                                    (item.price -
                                                        item.unit_cost) /
                                                        item.price,
                                                )}
                                            </TableCell>
                                        </>
                                    )}
                                    <TableCell>
                                        {item.is_active ? (
                                            <Badge variant="success">
                                                Aktif
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">
                                                Nonaktif
                                            </Badge>
                                        )}
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
                                                            setEditing(item)
                                                        }
                                                    >
                                                        <Pencil />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            toggleActive(item)
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

            {editing && (
                // key: remount saat target berganti. Tanpa itu, membuka Edit
                // item lain menampilkan isian item sebelumnya dan owner bisa
                // menimpa harga produk yang salah tanpa sadar.
                <ItemDialog
                    key={editing === 'new' ? 'new' : editing.id}
                    item={editing === 'new' ? null : editing}
                    onClose={() => setEditing(null)}
                />
            )}
        </>
    );
}

CatalogIndex.layout = {
    breadcrumbs: [{ title: 'Katalog', href: catalogIndex() }],
};

function NotApplicable() {
    return (
        <TableCell className="text-right font-mono text-muted-foreground">
            —
        </TableCell>
    );
}

const TYPES = ['product', 'service'] as const;

/** Isian form — angka tetap string selama diketik, divalidasi server. */
interface ItemForm {
    name: string;
    type: CatalogItemType;
    price: string;
    unit_cost: string;
    category: string;
}

/** Satu dialog untuk tambah DAN edit (R9: tambah/edit item katalog → Dialog). */
function ItemDialog({
    item,
    onClose,
}: {
    item: CatalogItem | null;
    onClose: () => void;
}) {
    const form = useForm<ItemForm>({
        name: item?.name ?? '',
        type: item?.type ?? 'product',
        price: item ? String(item.price) : '',
        unit_cost: item?.unit_cost != null ? String(item.unit_cost) : '',
        category: item?.category ?? '',
    });
    const { data, setData, errors, processing } = form;

    const price = Number(data.price) || 0;
    const unitCost = Number(data.unit_cost) || 0;
    const editing = item !== null;
    const complete =
        data.name.trim() !== '' &&
        price > 0 &&
        (data.type === 'service' || data.unit_cost !== '');

    const submit = () => {
        // Jasa tidak membawa HPP sama sekali — server menolaknya.
        form.transform((d) => ({
            ...d,
            unit_cost: d.type === 'service' ? null : d.unit_cost,
        }));
        const options = { preserveScroll: true, onSuccess: onClose };
        if (editing) {
            form.put(CatalogItemController.update(item.id).url, options);
        } else {
            form.post(CatalogItemController.store().url, options);
        }
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {editing ? 'Edit Item Katalog' : 'Tambah Item Katalog'}
                    </DialogTitle>
                    <DialogDescription>
                        {editing
                            ? 'Perubahan harga hanya berlaku untuk transaksi berikutnya.'
                            : 'Produk fisik punya HPP bahan per unit; jasa tidak.'}
                    </DialogDescription>
                </DialogHeader>

                <FieldGroup>
                    <Field>
                        <FieldLabel>Jenis</FieldLabel>
                        <ToggleGroup
                            value={[data.type]}
                            onValueChange={(v) => {
                                const t = TYPES.find((x) => x === v[0]);
                                if (!t) return;
                                setData((d) => ({
                                    ...d,
                                    type: t,
                                    unit_cost: '',
                                }));
                            }}
                        >
                            <ToggleGroupItem value="product">
                                Produk fisik
                            </ToggleGroupItem>
                            <ToggleGroupItem value="service">
                                Jasa
                            </ToggleGroupItem>
                        </ToggleGroup>
                        <InputError message={errors.type} />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="name">Nama</FieldLabel>
                        <Input
                            id="name"
                            placeholder={
                                data.type === 'product'
                                    ? 'Keychain Foto Akrilik'
                                    : 'Paket Studio 1 Jam'
                            }
                            value={data.name}
                            aria-invalid={Boolean(errors.name)}
                            onChange={(e) => setData('name', e.target.value)}
                        />
                        <InputError message={errors.name} />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="category">
                            Kategori{' '}
                            <span className="text-muted-foreground">
                                — opsional
                            </span>
                        </FieldLabel>
                        <Input
                            id="category"
                            placeholder={
                                data.type === 'product' ? 'Cetak' : 'Studio'
                            }
                            value={data.category}
                            onChange={(e) =>
                                setData('category', e.target.value)
                            }
                        />
                        <InputError message={errors.category} />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <FieldLabel htmlFor="price">Harga jual</FieldLabel>
                            <Input
                                id="price"
                                inputMode="numeric"
                                className="font-mono"
                                placeholder="0"
                                value={data.price}
                                aria-invalid={Boolean(errors.price)}
                                onChange={(e) =>
                                    setData('price', hanyaDigit(e.target.value))
                                }
                            />
                            <InputError message={errors.price} />
                        </Field>

                        {/*
                            HPP hanya untuk produk. Untuk jasa field-nya
                            DIHILANGKAN dengan penjelasan pengganti, bukan
                            di-disable — field disabled mengundang pertanyaan
                            "kenapa tidak boleh diisi".
                        */}
                        {data.type === 'product' ? (
                            <Field>
                                <FieldLabel htmlFor="unit_cost">
                                    HPP bahan / unit
                                </FieldLabel>
                                <Input
                                    id="unit_cost"
                                    inputMode="numeric"
                                    className="font-mono"
                                    placeholder="0"
                                    value={data.unit_cost}
                                    aria-invalid={Boolean(errors.unit_cost)}
                                    onChange={(e) =>
                                        setData(
                                            'unit_cost',
                                            hanyaDigit(e.target.value),
                                        )
                                    }
                                />
                                <InputError message={errors.unit_cost} />
                            </Field>
                        ) : (
                            <div className="flex flex-col justify-center">
                                <p className="text-xs text-muted-foreground">
                                    Jasa tidak punya HPP tetap. Biaya crew,
                                    transport, dan sewa dicatat per order lewat
                                    menu Biaya.
                                </p>
                            </div>
                        )}
                    </div>

                    {data.type === 'product' && price > 0 && (
                        <p className="text-xs text-muted-foreground">
                            Margin{' '}
                            <span className="font-mono text-foreground">
                                {formatRp(price - unitCost)}
                            </span>{' '}
                            ({formatPersen((price - unitCost) / price)})
                            {data.unit_cost === '' &&
                                ' — isi HPP bahan supaya margin mencerminkan biaya sebenarnya.'}
                        </p>
                    )}
                </FieldGroup>

                <DialogFooter>
                    <DialogClose
                        render={<Button variant="outline">Batal</Button>}
                    />
                    <Button disabled={!complete || processing} onClick={submit}>
                        Simpan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
