/**
 * Aset — Tambah/Edit (spek 8.1). Halaman penuh, bukan dialog: isian identitas
 * bertambah (kode, merek, seri, garansi, lokasi, catatan).
 *
 * Field keuangan (unit, harga, tanggal beli, persen maintenance, sumber dana)
 * hanya bisa diisi saat TAMBAH — mengubahnya belakangan menggeser alokasi
 * bulan lalu dan investasi yang sudah tercatat. Di mode Edit tampil sebagai
 * ringkasan baca-saja.
 */

import { Head, Link, useForm } from '@inertiajs/react';
import AssetController from '@/actions/Modules/Asset/Controllers/AssetController';
import InputError from '@/components/input-error';
import { PageHeader, Panel } from '@/components/page';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatBulan, formatRp, formatTanggal, hanyaDigit } from '@/lib/format';
import type { AssetCategoryOption, AssetRow } from '@/modules/asset/types';
import { index as assetCategoriesIndex } from '@/routes/asset-categories';
import { index as assetsIndex } from '@/routes/assets';

/** Nilai ToggleGroup "Dibayar dari" untuk kas usaha — id owner selalu angka. */
const CASH = 'cash';

interface AssetForm {
    name: string;
    asset_category_id: string;
    code: string;
    brand: string;
    model: string;
    serial_number: string;
    warranty_until: string;
    location: string;
    notes: string;
    useful_life_months: string;
    maintenance_interval_months: string;
    // Keuangan — hanya dikirim saat tambah.
    units: string;
    unit_price: string;
    purchased_on: string;
    maintenance_percent: string;
    paid_by: string;
}

export default function AssetForm({
    asset,
    categories,
    owners,
    brands,
    locations,
    today,
}: {
    asset: AssetRow | null;
    categories: AssetCategoryOption[];
    owners: { id: number; name: string }[];
    /** Saran dari yang sudah ada — supaya "Canon" tidak jadi dua ejaan. */
    brands: string[];
    locations: string[];
    today: string;
}) {
    const editing = asset !== null;
    const first = categories[0];
    const form = useForm<AssetForm>({
        name: asset?.name ?? '',
        asset_category_id: String(asset?.asset_category_id ?? first.id),
        code: asset?.code ?? '',
        brand: asset?.brand ?? '',
        model: asset?.model ?? '',
        serial_number: asset?.serial_number ?? '',
        warranty_until: asset?.warranty_until ?? '',
        location: asset?.location ?? '',
        notes: asset?.notes ?? '',
        useful_life_months: String(
            asset?.useful_life_months ?? first.useful_life_months,
        ),
        maintenance_interval_months: (() => {
            const v = asset
                ? asset.maintenance_interval_months
                : first.maintenance_interval_months;
            return v === null ? '' : String(v);
        })(),
        units: '1',
        unit_price: '',
        purchased_on: today,
        maintenance_percent: '5',
        paid_by: CASH,
    });
    const { data, setData, errors, processing } = form;
    const category = categories.find(
        (c) => String(c.id) === data.asset_category_id,
    );
    const perMonth = Math.round(
        ((Number(data.unit_price) || 0) *
            (Number(data.units) || 0) *
            (Number(data.maintenance_percent) || 0)) /
            100,
    );

    const changeCategory = (id: string) => {
        const c = categories.find((x) => String(x.id) === id);
        if (!c) return;
        // Default umur & interval ikut kategori — owner jarang tahu angkanya,
        // yang tahu tetap bisa mengubahnya. Hanya saat TAMBAH: di Edit, ganti
        // kategori tidak boleh diam-diam menimpa angka yang sudah disetel.
        setData((d) => ({
            ...d,
            asset_category_id: id,
            ...(editing
                ? {}
                : {
                      useful_life_months: String(c.useful_life_months),
                      maintenance_interval_months:
                          c.maintenance_interval_months === null
                              ? ''
                              : String(c.maintenance_interval_months),
                  }),
        }));
    };

    const submit = () => {
        form.transform((d) => {
            const identity = {
                name: d.name,
                asset_category_id: d.asset_category_id,
                code: d.code,
                brand: d.brand,
                model: d.model,
                serial_number: d.serial_number,
                warranty_until: d.warranty_until || null,
                location: d.location,
                notes: d.notes,
                useful_life_months: d.useful_life_months,
                maintenance_interval_months:
                    d.maintenance_interval_months === ''
                        ? null
                        : d.maintenance_interval_months,
            };
            return editing
                ? identity
                : {
                      ...identity,
                      units: d.units,
                      unit_price: d.unit_price,
                      purchased_on: d.purchased_on,
                      maintenance_percent: d.maintenance_percent,
                      paid_by: d.paid_by === CASH ? null : d.paid_by,
                  };
        });
        if (editing) {
            form.put(AssetController.update(asset.id).url);
        } else {
            form.post(AssetController.store().url);
        }
    };

    const title = editing ? `Edit ${asset.name}` : 'Tambah Aset';

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <Head title={title} />
            <PageHeader
                title={title}
                description={
                    editing
                        ? 'Identitas, umur, dan jadwal perawatan bisa dikoreksi; data pembelian terkunci.'
                        : 'Satu baris per alat; investasi dan alokasi maintenance tercatat otomatis.'
                }
            />

            {/* Saran native — tanpa komponen combobox untuk dua daftar pendek. */}
            <datalist id="asset-brands">
                {brands.map((b) => (
                    <option key={b} value={b} />
                ))}
            </datalist>
            <datalist id="asset-locations">
                {locations.map((l) => (
                    <option key={l} value={l} />
                ))}
            </datalist>

            <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[1fr_20rem]">
                <div className="flex min-w-0 flex-col gap-6">
                    <Panel title="Identitas">
                        <FieldGroup>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field>
                                    <FieldLabel htmlFor="asset-name">
                                        Nama
                                    </FieldLabel>
                                    <Input
                                        id="asset-name"
                                        autoFocus={!editing}
                                        placeholder="Lensa portrait"
                                        value={data.name}
                                        aria-invalid={Boolean(errors.name)}
                                        onChange={(e) =>
                                            setData('name', e.target.value)
                                        }
                                    />
                                    <InputError message={errors.name} />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="asset-category">
                                        Kategori
                                    </FieldLabel>
                                    {/* `items` supaya trigger menampilkan label (gotcha #10). */}
                                    <Select
                                        items={categories.map((c) => ({
                                            value: String(c.id),
                                            label: c.name,
                                        }))}
                                        value={data.asset_category_id}
                                        onValueChange={(v) =>
                                            v && changeCategory(v)
                                        }
                                    >
                                        <SelectTrigger
                                            id="asset-category"
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {categories.map((c) => (
                                                    <SelectItem
                                                        key={c.id}
                                                        value={String(c.id)}
                                                    >
                                                        {c.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <FieldDescription>
                                        <Link
                                            href={assetCategoriesIndex()}
                                            className="underline underline-offset-4"
                                        >
                                            Kelola kategori
                                        </Link>
                                    </FieldDescription>
                                    <InputError
                                        message={errors.asset_category_id}
                                    />
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <Field>
                                    <FieldLabel htmlFor="asset-code">
                                        Kode
                                    </FieldLabel>
                                    <Input
                                        id="asset-code"
                                        className="font-mono uppercase"
                                        maxLength={30}
                                        placeholder={
                                            editing
                                                ? asset.code
                                                : (category?.next_code ?? '')
                                        }
                                        value={data.code}
                                        aria-invalid={Boolean(errors.code)}
                                        onChange={(e) =>
                                            setData('code', e.target.value)
                                        }
                                    />
                                    <FieldDescription>
                                        {editing
                                            ? 'Kosongkan untuk tetap memakai kode lama.'
                                            : 'Kosongkan untuk kode otomatis.'}
                                    </FieldDescription>
                                    <InputError message={errors.code} />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="asset-brand">
                                        Merek{' '}
                                        <span className="text-muted-foreground">
                                            — opsional
                                        </span>
                                    </FieldLabel>
                                    <Input
                                        id="asset-brand"
                                        list="asset-brands"
                                        maxLength={100}
                                        placeholder="Canon"
                                        value={data.brand}
                                        onChange={(e) =>
                                            setData('brand', e.target.value)
                                        }
                                    />
                                    <InputError message={errors.brand} />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="asset-model">
                                        Model{' '}
                                        <span className="text-muted-foreground">
                                            — opsional
                                        </span>
                                    </FieldLabel>
                                    <Input
                                        id="asset-model"
                                        placeholder="RF 50mm f/1.8"
                                        value={data.model}
                                        onChange={(e) =>
                                            setData('model', e.target.value)
                                        }
                                    />
                                    <InputError message={errors.model} />
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <Field>
                                    <FieldLabel htmlFor="asset-serial">
                                        Nomor seri{' '}
                                        <span className="text-muted-foreground">
                                            — opsional
                                        </span>
                                    </FieldLabel>
                                    <Input
                                        id="asset-serial"
                                        className="font-mono"
                                        value={data.serial_number}
                                        onChange={(e) =>
                                            setData(
                                                'serial_number',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={errors.serial_number}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="asset-warranty">
                                        Garansi sampai{' '}
                                        <span className="text-muted-foreground">
                                            — opsional
                                        </span>
                                    </FieldLabel>
                                    <Input
                                        id="asset-warranty"
                                        type="date"
                                        value={data.warranty_until}
                                        onChange={(e) =>
                                            setData(
                                                'warranty_until',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={errors.warranty_until}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="asset-location">
                                        Lokasi{' '}
                                        <span className="text-muted-foreground">
                                            — opsional
                                        </span>
                                    </FieldLabel>
                                    <Input
                                        id="asset-location"
                                        list="asset-locations"
                                        maxLength={100}
                                        placeholder="Lemari kamera"
                                        value={data.location}
                                        onChange={(e) =>
                                            setData('location', e.target.value)
                                        }
                                    />
                                    <InputError message={errors.location} />
                                </Field>
                            </div>

                            <Field>
                                <FieldLabel htmlFor="asset-notes">
                                    Catatan{' '}
                                    <span className="text-muted-foreground">
                                        — opsional
                                    </span>
                                </FieldLabel>
                                <Textarea
                                    id="asset-notes"
                                    rows={3}
                                    maxLength={2000}
                                    placeholder="Toko pembelian, aksesori bawaan, kondisi…"
                                    value={data.notes}
                                    onChange={(e) =>
                                        setData('notes', e.target.value)
                                    }
                                />
                                <InputError message={errors.notes} />
                            </Field>
                        </FieldGroup>
                    </Panel>

                    <Panel title="Pembelian">
                        <div className="flex flex-col gap-4">
                            <p className="text-xs text-muted-foreground">
                                {editing
                                    ? 'Terkunci setelah disimpan — mengubahnya akan menggeser alokasi maintenance bulan lalu dan investasi yang sudah tercatat.'
                                    : 'Otomatis tercatat sebagai investasi — tidak masuk Biaya maupun Laba Rugi. Terkunci setelah disimpan.'}
                            </p>
                            {editing ? (
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                                    <ReadOnly label="Unit">
                                        {asset.units}
                                    </ReadOnly>
                                    <ReadOnly label="Harga / unit">
                                        {formatRp(asset.unit_price)}
                                    </ReadOnly>
                                    <ReadOnly label="Tanggal beli">
                                        {formatTanggal(asset.purchased_on)}
                                    </ReadOnly>
                                    <ReadOnly label="Maintenance">
                                        {asset.maintenance_percent}%/bln
                                    </ReadOnly>
                                </dl>
                            ) : (
                                <FieldGroup>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                        <Field>
                                            <FieldLabel htmlFor="asset-units">
                                                Unit
                                            </FieldLabel>
                                            <Input
                                                id="asset-units"
                                                inputMode="numeric"

                                                value={data.units}
                                                aria-invalid={Boolean(
                                                    errors.units,
                                                )}
                                                onChange={(e) =>
                                                    setData(
                                                        'units',
                                                        hanyaDigit(
                                                            e.target.value,
                                                        ),
                                                    )
                                                }
                                            />
                                            <FieldDescription>
                                                Alat bernomor seri (kamera,
                                                lensa) catat satu per baris
                                                dengan unit 1.
                                            </FieldDescription>
                                            <InputError
                                                message={errors.units}
                                            />
                                        </Field>
                                        <Field>
                                            <FieldLabel htmlFor="asset-price">
                                                Harga / unit
                                            </FieldLabel>
                                            <Input
                                                id="asset-price"
                                                inputMode="numeric"

                                                placeholder="0"
                                                value={data.unit_price}
                                                aria-invalid={Boolean(
                                                    errors.unit_price,
                                                )}
                                                onChange={(e) =>
                                                    setData(
                                                        'unit_price',
                                                        hanyaDigit(
                                                            e.target.value,
                                                        ),
                                                    )
                                                }
                                            />
                                            <InputError
                                                message={errors.unit_price}
                                            />
                                        </Field>
                                        <Field>
                                            <FieldLabel htmlFor="asset-date">
                                                Tanggal beli
                                            </FieldLabel>
                                            <Input
                                                id="asset-date"
                                                type="date"
                                                max={today}
                                                value={data.purchased_on}
                                                aria-invalid={Boolean(
                                                    errors.purchased_on,
                                                )}
                                                onChange={(e) =>
                                                    setData(
                                                        'purchased_on',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            <InputError
                                                message={errors.purchased_on}
                                            />
                                        </Field>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                        <Field>
                                            <FieldLabel htmlFor="asset-percent">
                                                Maintenance (%/bln)
                                            </FieldLabel>
                                            <Input
                                                id="asset-percent"
                                                inputMode="numeric"

                                                value={data.maintenance_percent}
                                                aria-invalid={Boolean(
                                                    errors.maintenance_percent,
                                                )}
                                                onChange={(e) =>
                                                    setData(
                                                        'maintenance_percent',
                                                        hanyaDigit(
                                                            e.target.value,
                                                        ),
                                                    )
                                                }
                                            />
                                            <InputError
                                                message={
                                                    errors.maintenance_percent
                                                }
                                            />
                                        </Field>
                                        <Field className="sm:col-span-2">
                                            <FieldLabel>
                                                Dibayar dari
                                            </FieldLabel>
                                            <ToggleGroup
                                                value={[data.paid_by]}
                                                onValueChange={(v) =>
                                                    v[0] &&
                                                    setData('paid_by', v[0])
                                                }
                                            >
                                                <ToggleGroupItem value={CASH}>
                                                    Kas usaha
                                                </ToggleGroupItem>
                                                {owners.map((o) => (
                                                    <ToggleGroupItem
                                                        key={o.id}
                                                        value={String(o.id)}
                                                    >
                                                        {o.name}
                                                    </ToggleGroupItem>
                                                ))}
                                            </ToggleGroup>
                                            <InputError
                                                message={errors.paid_by}
                                            />
                                        </Field>
                                    </div>
                                </FieldGroup>
                            )}
                        </div>
                    </Panel>

                    <Panel title="Umur & perawatan">
                        <div className="flex flex-col gap-4">
                            <p className="text-xs text-muted-foreground">
                                Umur hanya untuk nilai buku (informasi);
                                interval untuk jadwal perawatan. Keduanya bukan
                                uang, jadi tetap bisa dikoreksi.
                            </p>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field>
                                    <FieldLabel htmlFor="asset-life">
                                        Umur ekonomis (bulan)
                                    </FieldLabel>
                                    <Input
                                        id="asset-life"
                                        inputMode="numeric"

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
                                    <InputError
                                        message={errors.useful_life_months}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="asset-interval">
                                        Rawat tiap (bulan)
                                    </FieldLabel>
                                    <Input
                                        id="asset-interval"
                                        inputMode="numeric"

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
                                    <InputError
                                        message={
                                            errors.maintenance_interval_months
                                        }
                                    />
                                </Field>
                            </div>
                        </div>
                    </Panel>
                </div>

                <Panel
                    title={editing ? asset.name : 'Aset baru'}
                    className="self-start xl:sticky xl:top-6"
                >
                    <div className="flex flex-col gap-4">
                        <p className="text-xs text-muted-foreground">
                            {editing ? (
                                <>
                                    <span className="font-mono">
                                        {asset.code}
                                    </span>{' '}
                                    · {category?.name ?? ''}
                                </>
                            ) : (
                                <>
                                    Kode{' '}
                                    <span className="font-mono">
                                        {data.code.trim() === ''
                                            ? (category?.next_code ?? '')
                                            : data.code.toUpperCase()}
                                    </span>
                                </>
                            )}
                        </p>
                        {!editing && (
                            <p className="text-sm">
                                {perMonth > 0
                                    ? `Alokasi maintenance +${formatRp(perMonth)} / bulan mulai ${formatBulan(data.purchased_on.slice(0, 7))}.`
                                    : 'Umur dan jadwal perawatan terisi otomatis dari kategori — ubah kalau tahu angka sebenarnya.'}
                            </p>
                        )}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                nativeButton={false}
                                render={
                                    <Link
                                        href={
                                            editing
                                                ? AssetController.show(asset.id)
                                                : assetsIndex()
                                        }
                                    />
                                }
                            >
                                Batal
                            </Button>
                            <Button
                                className="flex-1"
                                disabled={data.name.trim() === '' || processing}
                                onClick={submit}
                            >
                                Simpan
                            </Button>
                        </div>
                    </div>
                </Panel>
            </div>
        </div>
    );
}

AssetForm.layout = {
    breadcrumbs: [
        { title: 'Aset & Maintenance', href: assetsIndex() },
        { title: 'Form aset', href: assetsIndex() },
    ],
};

function ReadOnly({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd>{children}</dd>
        </div>
    );
}
