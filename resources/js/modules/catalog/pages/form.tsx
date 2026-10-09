/**
 * Katalog — Tambah/Edit item (spek 7.2). Halaman penuh, bukan dialog: isi
 * item sudah mencakup profil publik dan galeri foto (7.1), dan akan
 * bertambah varian produk. Tata letak mengikuti Ubah Order — isian di kiri,
 * ringkasan + tombol di kanan.
 *
 * Aturan isi yang gampang hilang tetap sama dengan dialog lama: HPP hanya
 * untuk produk; jasa tidak punya HPP tetap (dicatat per job).
 */

import { Head, Link, useForm } from '@inertiajs/react';
import CatalogItemController from '@/actions/Modules/Catalog/Controllers/CatalogItemController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatPersen, formatRp, hanyaDigit } from '@/lib/format';
import { PhotoGallery } from '@/modules/catalog/components/photo-gallery';
import { isLowMargin } from '@/modules/catalog/lib/filter';
import type {
    CatalogItem,
    CatalogItemType,
    ServiceCategoryOption,
} from '@/modules/catalog/types';
import { index as catalogIndex } from '@/routes/catalog';

const TYPES = ['product', 'service'] as const;

/** Isian form — angka tetap string selama diketik, divalidasi server. */
interface ItemForm {
    name: string;
    type: CatalogItemType;
    price: string;
    unit_cost: string;
    category: string;
    description: string;
    is_public: boolean;
}

/** Satu halaman untuk tambah DAN edit — `item` null = tambah. */
export default function CatalogForm({
    item,
    service_categories,
    low_margin_ratio,
}: {
    item: CatalogItem | null;
    service_categories: ServiceCategoryOption[];
    /** Ambang margin rendah 0..1 (spek 3.6) — ringkasan memerah di bawahnya. */
    low_margin_ratio: number;
}) {
    const form = useForm<ItemForm>({
        name: item?.name ?? '',
        type: item?.type ?? 'product',
        price: item ? String(item.price) : '',
        unit_cost: item?.unit_cost != null ? String(item.unit_cost) : '',
        category: item?.category ?? '',
        description: item?.description ?? '',
        is_public: item?.is_public ?? false,
    });
    const { data, setData, errors, processing } = form;

    const price = Number(data.price) || 0;
    const unitCost = Number(data.unit_cost) || 0;
    const editing = item !== null;
    const complete =
        data.name.trim() !== '' &&
        price > 0 &&
        (data.type === 'service'
            ? data.category !== ''
            : data.unit_cost !== '');
    const lowMargin =
        data.type === 'product' &&
        price > 0 &&
        isLowMargin(price, unitCost, low_margin_ratio);

    const submit = () => {
        // Jasa tidak membawa HPP sama sekali — server menolaknya.
        form.transform((d) => ({
            ...d,
            unit_cost: d.type === 'service' ? null : d.unit_cost,
        }));
        if (editing) {
            // Server kembali ke daftar Katalog.
            form.put(CatalogItemController.update(item.id).url);
        } else {
            // Server pindah ke halaman Edit item baru — foto ditambahkan di sana.
            form.post(CatalogItemController.store().url);
        }
    };

    const title = editing ? `Edit ${item.name}` : 'Tambah Item Katalog';

    return (
        <>
            <Head title={title} />
            <h1 className="sr-only">{title}</h1>

            <div className="grid min-w-0 grid-cols-1 gap-6 p-6 xl:grid-cols-[1fr_20rem]">
                <div className="flex min-w-0 flex-col gap-6">
                    <section className="flex flex-col gap-4 rounded-lg border p-5">
                        <h2 className="font-heading text-base font-semibold">
                            Data item
                        </h2>
                        <FieldGroup>
                            <Field>
                                <FieldLabel>Jenis</FieldLabel>
                                <ToggleGroup
                                    value={[data.type]}
                                    onValueChange={(v) => {
                                        const t = TYPES.find((x) => x === v[0]);
                                        if (!t) return;
                                        // Kategori ikut direset: teks bebas produk
                                        // tidak boleh terbawa jadi kategori jasa.
                                        setData((d) => ({
                                            ...d,
                                            type: t,
                                            unit_cost: '',
                                            category: '',
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
                                    autoFocus={!editing}
                                    placeholder={
                                        data.type === 'product'
                                            ? 'Keychain Foto Akrilik'
                                            : 'Paket Studio 1 Jam'
                                    }
                                    value={data.name}
                                    aria-invalid={Boolean(errors.name)}
                                    onChange={(e) =>
                                        setData('name', e.target.value)
                                    }
                                />
                                <InputError message={errors.name} />
                            </Field>

                            {data.type === 'service' ? (
                                <Field>
                                    <FieldLabel htmlFor="category">
                                        Kategori
                                    </FieldLabel>
                                    {/* `items` supaya trigger menampilkan label (gotcha #10). */}
                                    <Select
                                        items={service_categories}
                                        value={data.category}
                                        onValueChange={(v) =>
                                            setData('category', v ?? '')
                                        }
                                    >
                                        <SelectTrigger
                                            id="category"
                                            aria-invalid={Boolean(
                                                errors.category,
                                            )}
                                        >
                                            <SelectValue placeholder="Pilih kategori" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {service_categories.map((c) => (
                                                    <SelectItem
                                                        key={c.value}
                                                        value={c.value}
                                                    >
                                                        {c.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <FieldDescription>
                                        Menentukan di mana paket muncul saat
                                        Buat Order.
                                    </FieldDescription>
                                    <InputError message={errors.category} />
                                </Field>
                            ) : (
                                <Field>
                                    <FieldLabel htmlFor="category">
                                        Kategori{' '}
                                        <span className="text-muted-foreground">
                                            — opsional
                                        </span>
                                    </FieldLabel>
                                    <Input
                                        id="category"
                                        placeholder="Cetak"
                                        value={data.category}
                                        onChange={(e) =>
                                            setData('category', e.target.value)
                                        }
                                    />
                                    <InputError message={errors.category} />
                                </Field>
                            )}

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field>
                                    <FieldLabel htmlFor="price">
                                        Harga jual
                                    </FieldLabel>
                                    <Input
                                        id="price"
                                        inputMode="numeric"
                                        className="font-mono"
                                        placeholder="0"
                                        value={data.price}
                                        aria-invalid={Boolean(errors.price)}
                                        onChange={(e) =>
                                            setData(
                                                'price',
                                                hanyaDigit(e.target.value),
                                            )
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
                                            aria-invalid={Boolean(
                                                errors.unit_cost,
                                            )}
                                            onChange={(e) =>
                                                setData(
                                                    'unit_cost',
                                                    hanyaDigit(e.target.value),
                                                )
                                            }
                                        />
                                        <InputError
                                            message={errors.unit_cost}
                                        />
                                    </Field>
                                ) : (
                                    <div className="flex flex-col justify-center">
                                        <p className="text-xs text-muted-foreground">
                                            Jasa tidak punya HPP tetap. Biaya
                                            crew, transport, dan sewa dicatat
                                            per order lewat menu Biaya.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </FieldGroup>
                    </section>

                    <section className="flex flex-col gap-4 rounded-lg border p-5">
                        <div className="flex flex-col gap-0.5">
                            <h2 className="font-heading text-base font-semibold">
                                Profil publik
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Untuk website company profile nanti — nama,
                                deskripsi, dan foto. HPP tidak pernah ikut
                                tampil. Tidak mengubah POS atau form order.
                            </p>
                        </div>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="description">
                                    Deskripsi{' '}
                                    <span className="text-muted-foreground">
                                        — opsional
                                    </span>
                                </FieldLabel>
                                <Textarea
                                    id="description"
                                    rows={4}
                                    maxLength={2000}
                                    placeholder={
                                        data.type === 'product'
                                            ? 'Akrilik 5 cm, cetak dua sisi.'
                                            : 'Sesi 1 jam, 2 background, 10 file edit.'
                                    }
                                    value={data.description}
                                    aria-invalid={Boolean(errors.description)}
                                    onChange={(e) =>
                                        setData('description', e.target.value)
                                    }
                                />
                                <InputError message={errors.description} />
                            </Field>
                            <Field orientation="horizontal">
                                <Checkbox
                                    id="is_public"
                                    checked={data.is_public}
                                    onCheckedChange={(c) =>
                                        setData('is_public', c)
                                    }
                                />
                                <FieldLabel
                                    htmlFor="is_public"
                                    className="font-normal"
                                >
                                    Tampil di company profile
                                </FieldLabel>
                            </Field>
                        </FieldGroup>
                    </section>

                    <section className="flex flex-col gap-4 rounded-lg border p-5">
                        {editing ? (
                            <PhotoGallery
                                itemId={item.id}
                                itemName={item.name}
                                photos={item.photos}
                            />
                        ) : (
                            <>
                                <span className="text-sm font-medium">
                                    Foto
                                </span>
                                <p className="text-xs text-muted-foreground">
                                    Foto bisa ditambahkan setelah item disimpan
                                    — halaman ini langsung pindah ke mode Edit.
                                </p>
                            </>
                        )}
                    </section>
                </div>

                <aside className="flex min-w-0 flex-col gap-4 self-start rounded-lg border p-5 xl:sticky xl:top-6">
                    <div className="flex flex-col gap-0.5">
                        <h2 className="font-heading text-base font-semibold">
                            {editing ? item.name : 'Item baru'}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            {editing
                                ? 'Perubahan harga hanya berlaku untuk transaksi berikutnya.'
                                : 'Produk fisik punya HPP bahan per unit; jasa tidak.'}
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                Harga jual
                            </span>
                            <span className="font-mono">{formatRp(price)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                HPP bahan
                            </span>
                            <span className="font-mono text-muted-foreground">
                                {data.type === 'product'
                                    ? formatRp(unitCost)
                                    : '—'}
                            </span>
                        </div>
                        <Separator />
                        <div className="flex items-baseline justify-between">
                            <span className="font-medium">Margin</span>
                            {data.type === 'product' && price > 0 ? (
                                <span
                                    className={`font-mono font-semibold ${lowMargin ? 'text-destructive' : ''}`}
                                >
                                    {formatRp(price - unitCost)} (
                                    {formatPersen((price - unitCost) / price)})
                                </span>
                            ) : (
                                <span className="font-mono text-muted-foreground">
                                    —
                                </span>
                            )}
                        </div>
                        {data.type === 'product' &&
                            price > 0 &&
                            data.unit_cost === '' && (
                                <p className="text-xs text-muted-foreground">
                                    Isi HPP bahan supaya margin mencerminkan
                                    biaya sebenarnya.
                                </p>
                            )}
                        {lowMargin && data.unit_cost !== '' && (
                            <p className="text-xs text-destructive">
                                Margin di bawah {formatPersen(low_margin_ratio)}{' '}
                                — ambang di konfigurasi studio.
                            </p>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            nativeButton={false}
                            render={<Link href={catalogIndex()} />}
                        >
                            Batal
                        </Button>
                        <Button
                            className="flex-1"
                            disabled={!complete || processing}
                            onClick={submit}
                        >
                            Simpan
                        </Button>
                    </div>
                    {editing && (
                        <p className="text-xs text-muted-foreground">
                            Foto tersimpan langsung, tidak menunggu tombol
                            Simpan.
                        </p>
                    )}
                </aside>
            </div>
        </>
    );
}

CatalogForm.layout = {
    breadcrumbs: [
        { title: 'Katalog', href: catalogIndex() },
        { title: 'Item katalog', href: catalogIndex() },
    ],
};
