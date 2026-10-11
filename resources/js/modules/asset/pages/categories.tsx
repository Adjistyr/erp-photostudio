/**
 * Kategori aset dikelola owner (spek 8.1; dulu daftar tetap di kode). Umur &
 * interval di sini hanya DEFAULT untuk aset baru — mengubahnya tidak
 * menyentuh aset yang sudah ada. Kategori yang masih dipakai tidak bisa
 * dihapus (server menolak, alasannya tampil di dialog hapus).
 */

import { Head, useForm } from '@inertiajs/react';
import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import AssetCategoryController from '@/actions/Modules/Asset/Controllers/AssetCategoryController';
import { ConfirmDelete } from '@/components/confirm-delete';
import { TabelData } from '@/components/data-table';
import InputError from '@/components/input-error';
import { PageActions } from '@/components/page-actions';
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
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { hanyaDigit } from '@/lib/format';
import type { AssetCategoryOption } from '@/modules/asset/types';
import { index as assetCategoriesIndex } from '@/routes/asset-categories';
import { index as assetsIndex } from '@/routes/assets';

interface CategoryRow extends AssetCategoryOption {
    assets_count: number;
}

export default function AssetCategories({
    categories,
}: {
    categories: CategoryRow[];
}) {
    /** null = tertutup · 'new' = tambah · baris = ubah. */
    const [editing, setEditing] = useState<CategoryRow | 'new' | null>(null);

    return (
        <>
            <Head title="Kategori aset" />
            <h1 className="sr-only">Kategori aset</h1>
            <PageActions>
                <Button onClick={() => setEditing('new')}>
                    <Plus data-icon="inline-start" />
                    Tambah kategori
                </Button>
            </PageActions>

            <div className="flex flex-col gap-4 p-6">
                <TabelData>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Kategori</TableHead>
                            <TableHead>Prefiks kode</TableHead>
                            <TableHead className="text-right">
                                Umur default
                            </TableHead>
                            <TableHead className="text-right">
                                Rawat tiap
                            </TableHead>
                            <TableHead className="text-right">Aset</TableHead>
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {categories.map((c) => (
                            <TableRow key={c.id}>
                                <TableCell className="font-medium">
                                    {c.name}
                                </TableCell>
                                <TableCell className="font-mono">
                                    {c.code_prefix}
                                    <span className="ml-2 text-xs text-muted-foreground">
                                        berikutnya {c.next_code}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {c.useful_life_months} bln
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {c.maintenance_interval_months === null
                                        ? '—'
                                        : `${c.maintenance_interval_months} bln`}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {c.assets_count}
                                </TableCell>
                                <TableCell>
                                    <span className="flex justify-end gap-1">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            aria-label={`Ubah ${c.name}`}
                                            onClick={() => setEditing(c)}
                                        >
                                            <Pencil />
                                        </Button>
                                        <ConfirmDelete
                                            url={
                                                AssetCategoryController.destroy(
                                                    c.id,
                                                ).url
                                            }
                                            label={`kategori ${c.name}`}
                                            hint=""
                                            title={`Hapus kategori ${c.name}?`}
                                            description={
                                                c.assets_count > 0
                                                    ? `Masih dipakai ${c.assets_count} aset — tidak bisa dihapus sebelum asetnya dipindah.`
                                                    : 'Kategori belum dipakai aset mana pun.'
                                            }
                                        />
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </TabelData>
                <p className="text-xs text-muted-foreground">
                    Umur & interval adalah default yang terisi saat menambah
                    aset baru. Mengubahnya tidak mengubah aset yang sudah
                    tercatat; prefiks dipakai kode otomatis (mis. KAM-001).
                </p>
            </div>

            {editing && (
                <CategoryDialog
                    key={editing === 'new' ? 'new' : editing.id}
                    category={editing === 'new' ? null : editing}
                    onClose={() => setEditing(null)}
                />
            )}
        </>
    );
}

AssetCategories.layout = {
    breadcrumbs: [
        { title: 'Aset & Maintenance', href: assetsIndex() },
        { title: 'Kategori aset', href: assetCategoriesIndex() },
    ],
};

interface CategoryForm {
    name: string;
    code_prefix: string;
    useful_life_months: string;
    maintenance_interval_months: string;
}

function CategoryDialog({
    category,
    onClose,
}: {
    category: CategoryRow | null;
    onClose: () => void;
}) {
    const form = useForm<CategoryForm>({
        name: category?.name ?? '',
        code_prefix: category?.code_prefix ?? '',
        useful_life_months: String(category?.useful_life_months ?? 36),
        maintenance_interval_months:
            category?.maintenance_interval_months == null
                ? ''
                : String(category.maintenance_interval_months),
    });
    const { data, setData, errors, processing } = form;

    const submit = () => {
        form.transform((d) => ({
            ...d,
            maintenance_interval_months:
                d.maintenance_interval_months === ''
                    ? null
                    : d.maintenance_interval_months,
        }));
        const options = { preserveScroll: true, onSuccess: onClose };
        if (category) {
            form.put(AssetCategoryController.update(category.id).url, options);
        } else {
            form.post(AssetCategoryController.store().url, options);
        }
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {category ? `Ubah ${category.name}` : 'Tambah kategori'}
                    </DialogTitle>
                    <DialogDescription>
                        Default umur & interval hanya untuk aset baru.
                    </DialogDescription>
                </DialogHeader>
                <FieldGroup>
                    <div className="grid grid-cols-[1fr_8rem] gap-4">
                        <Field>
                            <FieldLabel htmlFor="cat-name">Nama</FieldLabel>
                            <Input
                                id="cat-name"
                                maxLength={50}
                                placeholder="Drone"
                                value={data.name}
                                aria-invalid={Boolean(errors.name)}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                            />
                            <InputError message={errors.name} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="cat-prefix">
                                Prefiks
                            </FieldLabel>
                            <Input
                                id="cat-prefix"
                                maxLength={6}
                                className="font-mono uppercase"
                                placeholder="DRN"
                                value={data.code_prefix}
                                aria-invalid={Boolean(errors.code_prefix)}
                                onChange={(e) =>
                                    setData('code_prefix', e.target.value)
                                }
                            />
                            <InputError message={errors.code_prefix} />
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <FieldLabel htmlFor="cat-life">
                                Umur default (bulan)
                            </FieldLabel>
                            <Input
                                id="cat-life"
                                inputMode="numeric"
                                className="font-mono"
                                value={data.useful_life_months}
                                aria-invalid={Boolean(
                                    errors.useful_life_months,
                                )}
                                onChange={(e) =>
                                    setData(
                                        'useful_life_months',
                                        hanyaDigit(e.target.value),
                                    )
                                }
                            />
                            <InputError message={errors.useful_life_months} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="cat-interval">
                                Rawat tiap (bulan)
                            </FieldLabel>
                            <Input
                                id="cat-interval"
                                inputMode="numeric"
                                className="font-mono"
                                placeholder="tanpa jadwal"
                                value={data.maintenance_interval_months}
                                aria-invalid={Boolean(
                                    errors.maintenance_interval_months,
                                )}
                                onChange={(e) =>
                                    setData(
                                        'maintenance_interval_months',
                                        hanyaDigit(e.target.value),
                                    )
                                }
                            />
                            <FieldDescription>
                                Kosongkan bila tanpa jadwal berkala.
                            </FieldDescription>
                            <InputError
                                message={errors.maintenance_interval_months}
                            />
                        </Field>
                    </div>
                </FieldGroup>
                <DialogFooter>
                    <DialogClose
                        render={<Button variant="outline">Batal</Button>}
                    />
                    <Button
                        disabled={
                            data.name.trim() === '' ||
                            data.code_prefix.trim() === '' ||
                            processing
                        }
                        onClick={submit}
                    >
                        Simpan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
