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

import { Head, router, useForm } from '@inertiajs/react';
import { Plus, TriangleAlert, Wrench } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import AssetController from '@/actions/Modules/Asset/Controllers/AssetController';
import {
    KELAS_DENSITY,
    KepalaUang,
    KosongTabel,
    SelKode,
    SelUang,
    TabelData,
} from '@/components/data-table';
import { ConfirmDelete } from '@/components/confirm-delete';
import InputError from '@/components/input-error';
import { PageActions } from '@/components/page-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    formatBulan,
    formatRp,
    formatTanggal,
    formatUmurPiutang,
    hanyaDigit,
} from '@/lib/format';
import { index as assetsIndex } from '@/routes/assets';

type MaintenanceType = 'routine' | 'repair';
type AssetStatus = 'active' | 'broken' | 'disposed';

const MAINTENANCE_LABEL: Record<MaintenanceType, string> = {
    routine: 'Perawatan rutin',
    repair: 'Perbaikan',
};

const DISPOSAL_REASONS = ['Dijual', 'Rusak total', 'Hilang'] as const;
type DisposalReason = (typeof DISPOSAL_REASONS)[number];

interface MaintenanceRow {
    id: number;
    performed_on: string;
    type: MaintenanceType;
    description: string;
    cost: number;
}

interface AssetRow {
    id: number;
    code: string;
    name: string;
    model: string | null;
    category: string;
    units: number;
    unit_price: number;
    purchase_total: number;
    purchased_on: string;
    maintenance_percent: number;
    useful_life_months: number;
    maintenance_interval_months: number | null;
    status: AssetStatus;
    disposed_on: string | null;
    disposal_reason: string | null;
    sale_price: number | null;
    allocation: number;
    book_value: number;
    accumulated: number;
    next_maintenance: string | null;
    days_until_next: number | null;
    funded_by: string | null;
    maintenances: MaintenanceRow[];
}

interface Category {
    name: string;
    useful_life_months: number;
    maintenance_interval_months: number | null;
}

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
    owners: { id: number; name: string }[];
    categories: Category[];
    maintenance_balance: number;
}

export default function AssetsIndex(props: Props) {
    const { month, summary, due, assets } = props;
    const [adding, setAdding] = useState(false);
    // Simpan id, bukan objek: setelah servis/lepas, Sheet membaca props terbaru.
    const [detailId, setDetailId] = useState<number | null>(null);
    const detail = assets.find((a) => a.id === detailId) ?? null;

    return (
        <>
            <Head title="Aset & Maintenance" />
            <h1 className="sr-only">Aset & Maintenance</h1>

            <PageActions>
                <Button onClick={() => setAdding(true)}>
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

                {assets.length === 0 ? (
                    <KosongTabel
                        kalimat="Belum ada aset. Catat alat studio supaya dana maintenance dihitung otomatis."
                        aksi={{
                            label: 'Tambah Aset',
                            onClick: () => setAdding(true),
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
                            {assets.map((a) => (
                                <TableRow
                                    key={a.id}
                                    // Dipudarkan seperti order Batal: riwayat, bukan yang aktif.
                                    className={`cursor-pointer ${a.disposed_on ? 'opacity-60' : ''}`}
                                    onClick={() => setDetailId(a.id)}
                                >
                                    <SelKode>{a.code}</SelKode>
                                    <TableCell>
                                        <span className="font-medium">
                                            {a.name}
                                        </span>
                                        {a.model && (
                                            <span className="ml-2 text-xs text-muted-foreground">
                                                {a.model}
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
                                        <StatusBadge asset={a} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </TabelData>
                )}

                <p className="text-xs text-muted-foreground">
                    Alokasi maintenance = harga × unit × persen, untuk aset yang
                    dimiliki di akhir bulan. Dikurangkan di Laba Rugi sebelum
                    laba bersih dan masuk dana maintenance. Nilai buku hanya
                    informasi — tidak masuk Laba Rugi, supaya keausan alat tidak
                    dibebankan dua kali. Klik baris untuk riwayat servis.
                </p>
            </div>

            {adding && (
                <AddAssetDialog
                    today={props.today}
                    owners={props.owners}
                    categories={props.categories}
                    onClose={() => setAdding(false)}
                />
            )}
            {detail && (
                <AssetSheet
                    asset={detail}
                    today={props.today}
                    maintenanceBalance={props.maintenance_balance}
                    onClose={() => setDetailId(null)}
                />
            )}
        </>
    );
}

AssetsIndex.layout = {
    breadcrumbs: [{ title: 'Aset & Maintenance', href: assetsIndex() }],
};

// ── Sel ─────────────────────────────────────────────────────────────────────

function NextMaintenance({ asset: a }: { asset: AssetRow }) {
    if (a.disposed_on) return <span className="text-muted-foreground">—</span>;
    if (a.next_maintenance === null || a.days_until_next === null) {
        return <span className="text-muted-foreground">Tanpa jadwal</span>;
    }
    return (
        <span className="flex flex-col">
            <span>{formatTanggal(a.next_maintenance)}</span>
            {/* Merah untuk yang lewat — konvensi sama dengan umur piutang. */}
            <span
                className={`text-xs ${a.days_until_next < 0 ? 'text-destructive' : 'text-muted-foreground'}`}
            >
                {formatUmurPiutang(a.days_until_next)}
            </span>
        </span>
    );
}

/** Netral, tanpa warna: yang menuntut aksi adalah jadwal lewat, bukan status. */
function StatusBadge({ asset: a }: { asset: AssetRow }) {
    if (a.disposed_on) {
        return (
            <span className="text-xs text-muted-foreground">
                Dilepas · {a.disposal_reason}
            </span>
        );
    }
    return a.status === 'broken' ? (
        <Badge variant="outline">Rusak</Badge>
    ) : (
        <Badge variant="secondary">Aktif</Badge>
    );
}

// ── Detail ──────────────────────────────────────────────────────────────────

function AssetSheet({
    asset: a,
    today,
    maintenanceBalance,
    onClose,
}: {
    asset: AssetRow;
    today: string;
    maintenanceBalance: number;
    onClose: () => void;
}) {
    const [dialog, setDialog] = useState<'service' | 'dispose' | null>(null);
    const totalService = a.maintenances.reduce((s, m) => s + m.cost, 0);

    return (
        <>
            <Sheet open onOpenChange={(o) => !o && onClose()}>
                <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-2xl">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-3">
                            {a.name}
                            <StatusBadge asset={a} />
                        </SheetTitle>
                        <SheetDescription>
                            <span className="font-mono">{a.code}</span> ·{' '}
                            {a.category}
                            {a.model ? ` · ${a.model}` : ''}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex flex-col gap-6 p-4">
                        {!a.disposed_on && (
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => setDialog('service')}
                                >
                                    <Wrench data-icon="inline-start" />
                                    Catat Servis
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        router.patch(
                                            AssetController.updateStatus(a.id)
                                                .url,
                                            {
                                                status:
                                                    a.status === 'broken'
                                                        ? 'active'
                                                        : 'broken',
                                            },
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    {a.status === 'broken'
                                        ? 'Tandai Aktif'
                                        : 'Tandai Rusak'}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setDialog('dispose')}
                                >
                                    Lepas Aset
                                </Button>
                            </div>
                        )}

                        {a.disposed_on && (
                            <div className="rounded-md bg-muted p-3 text-sm">
                                Dilepas {formatTanggal(a.disposed_on)} —{' '}
                                {a.disposal_reason}.
                                {(a.sale_price ?? 0) > 0
                                    ? ` Hasil jual ${formatRp(a.sale_price ?? 0)} masuk dana maintenance.`
                                    : ' Tidak ada hasil jual.'}{' '}
                                Alokasi maintenance berhenti sejak bulan itu.
                            </div>
                        )}

                        <Section title="Rincian">
                            <Table className={KELAS_DENSITY}>
                                <TableBody>
                                    <DetailRow label="Harga beli">
                                        {a.units} × {formatRp(a.unit_price)} ={' '}
                                        {formatRp(a.purchase_total)}
                                    </DetailRow>
                                    <DetailRow label="Tanggal beli">
                                        {formatTanggal(a.purchased_on)}
                                    </DetailRow>
                                    <DetailRow label="Dibiayai">
                                        {a.funded_by ?? '—'}
                                    </DetailRow>
                                    <DetailRow label="Maintenance">
                                        {a.maintenance_percent}% ·{' '}
                                        {formatRp(a.allocation)} / bulan
                                    </DetailRow>
                                    <DetailRow label="Nilai buku">
                                        {formatRp(a.book_value)} · umur ekonomis{' '}
                                        {a.useful_life_months} bulan
                                    </DetailRow>
                                    <DetailRow label="Perawatan">
                                        {a.maintenance_interval_months === null
                                            ? 'Tanpa jadwal berkala'
                                            : `Tiap ${a.maintenance_interval_months} bulan${
                                                  a.next_maintenance &&
                                                  !a.disposed_on
                                                      ? ` · berikutnya ${formatTanggal(a.next_maintenance)}`
                                                      : ''
                                              }`}
                                    </DetailRow>
                                </TableBody>
                            </Table>
                        </Section>

                        <Section title="Riwayat servis">
                            {a.maintenances.length === 0 ? (
                                <p className="px-3 py-2 text-sm text-muted-foreground">
                                    Belum ada riwayat servis.
                                </p>
                            ) : (
                                <Table className={KELAS_DENSITY}>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tanggal</TableHead>
                                            <TableHead>Jenis</TableHead>
                                            <TableHead>Keterangan</TableHead>
                                            <KepalaUang>Biaya</KepalaUang>
                                            {!a.disposed_on && <TableHead />}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {a.maintenances.map((m) => (
                                            <TableRow key={m.id}>
                                                <TableCell className="whitespace-nowrap">
                                                    {formatTanggal(
                                                        m.performed_on,
                                                    )}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    {MAINTENANCE_LABEL[m.type]}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {m.description}
                                                </TableCell>
                                                <SelUang nominal={m.cost} />
                                                {!a.disposed_on && (
                                                    <TableCell className="w-10">
                                                        <ConfirmDelete
                                                            url={
                                                                AssetController.destroyMaintenance(
                                                                    {
                                                                        asset: a.id,
                                                                        maintenance:
                                                                            m.id,
                                                                    },
                                                                ).url
                                                            }
                                                            label={`servis ${m.description}`}
                                                            title={`Hapus servis ${m.description}?`}
                                                            description={
                                                                m.cost > 0
                                                                    ? `Biaya ${formatRp(m.cost)} kembali ke dana maintenance dan jadwal perawatan dihitung ulang.`
                                                                    : 'Jadwal perawatan dihitung ulang.'
                                                            }
                                                        />
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </Section>

                        {/*
                            Perbandingan yang membuat daftar aset berguna melampaui
                            sheet: alat mana yang biaya servisnya melebihi dana yang
                            disisihkan — kandidat diganti, atau persen maintenance
                            terlalu kecil.
                        */}
                        <p className="text-sm text-muted-foreground">
                            Total servis{' '}
                            <span className="font-mono text-foreground">
                                {formatRp(totalService)}
                            </span>{' '}
                            dari{' '}
                            <span className="font-mono text-foreground">
                                {formatRp(a.accumulated)}
                            </span>{' '}
                            yang sudah disisihkan untuk aset ini (bulan yang
                            sudah tutup).
                            {totalService > a.accumulated &&
                                ' Biaya servisnya melebihi dana yang disisihkan — pertimbangkan menaikkan persen maintenance atau mengganti alat.'}
                        </p>
                    </div>
                </SheetContent>
            </Sheet>

            {dialog === 'service' && (
                <ServiceDialog
                    asset={a}
                    today={today}
                    balance={maintenanceBalance}
                    onClose={() => setDialog(null)}
                />
            )}
            {dialog === 'dispose' && (
                <DisposeDialog
                    asset={a}
                    today={today}
                    onClose={() => setDialog(null)}
                />
            )}
        </>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{title}</h3>
            <div className="overflow-hidden rounded-lg border py-1">
                {children}
            </div>
        </section>
    );
}

function DetailRow({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <TableRow className="hover:bg-transparent">
            <TableCell className="w-36 text-muted-foreground">
                {label}
            </TableCell>
            <TableCell>{children}</TableCell>
        </TableRow>
    );
}

// ── Dialog ──────────────────────────────────────────────────────────────────

interface AssetForm {
    name: string;
    category: string;
    model: string;
    units: string;
    unit_price: string;
    purchased_on: string;
    maintenance_percent: string;
    useful_life_months: string;
    maintenance_interval_months: string;
    paid_by: string;
}

/** Nilai ToggleGroup "Dibayar dari" untuk kas usaha — id owner selalu angka. */
const CASH = 'cash';

function AddAssetDialog({
    today,
    owners,
    categories,
    onClose,
}: {
    today: string;
    owners: Props['owners'];
    categories: Category[];
    onClose: () => void;
}) {
    const first = categories[0];
    const form = useForm<AssetForm>({
        name: '',
        category: first.name,
        model: '',
        units: '1',
        unit_price: '',
        purchased_on: today,
        maintenance_percent: '5',
        useful_life_months: String(first.useful_life_months),
        maintenance_interval_months:
            first.maintenance_interval_months === null
                ? ''
                : String(first.maintenance_interval_months),
        paid_by: CASH,
    });
    const { data, setData, errors, processing } = form;
    const perMonth = Math.round(
        ((Number(data.unit_price) || 0) *
            (Number(data.units) || 0) *
            (Number(data.maintenance_percent) || 0)) /
            100,
    );

    const changeCategory = (name: string) => {
        const c = categories.find((x) => x.name === name);
        if (!c) return;
        // Default umur & interval ikut kategori — owner jarang tahu angkanya,
        // yang tahu tetap bisa mengubahnya.
        setData((d) => ({
            ...d,
            category: c.name,
            useful_life_months: String(c.useful_life_months),
            maintenance_interval_months:
                c.maintenance_interval_months === null
                    ? ''
                    : String(c.maintenance_interval_months),
        }));
    };

    const submit = () => {
        form.transform((d) => ({
            ...d,
            maintenance_interval_months:
                d.maintenance_interval_months === ''
                    ? null
                    : d.maintenance_interval_months,
            paid_by: d.paid_by === CASH ? null : d.paid_by,
        }));
        form.post(AssetController.store().url, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Tambah Aset</DialogTitle>
                    <DialogDescription>
                        Alat yang dipakai berbulan-bulan. Otomatis tercatat
                        sebagai investasi — tidak masuk Biaya maupun Laba Rugi.
                    </DialogDescription>
                </DialogHeader>

                <FieldGroup>
                    <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <FieldLabel htmlFor="asset-name">Nama</FieldLabel>
                            <Input
                                id="asset-name"
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
                            <Select
                                value={data.category}
                                onValueChange={(v) => v && changeCategory(v)}
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
                                                key={c.name}
                                                value={c.name}
                                            >
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <InputError message={errors.category} />
                        </Field>
                    </div>

                    <Field>
                        <FieldLabel htmlFor="asset-model">
                            Merek / model{' '}
                            <span className="text-muted-foreground">
                                — opsional
                            </span>
                        </FieldLabel>
                        <Input
                            id="asset-model"
                            placeholder="Canon RF 50mm f/1.8"
                            value={data.model}
                            onChange={(e) => setData('model', e.target.value)}
                        />
                        <InputError message={errors.model} />
                    </Field>

                    <div className="grid grid-cols-3 gap-4">
                        <Field>
                            <FieldLabel htmlFor="asset-units">Unit</FieldLabel>
                            <Input
                                id="asset-units"
                                inputMode="numeric"
                                className="font-mono"
                                value={data.units}
                                aria-invalid={Boolean(errors.units)}
                                onChange={(e) =>
                                    setData('units', hanyaDigit(e.target.value))
                                }
                            />
                            <InputError message={errors.units} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="asset-price">
                                Harga / unit
                            </FieldLabel>
                            <Input
                                id="asset-price"
                                inputMode="numeric"
                                className="font-mono"
                                placeholder="0"
                                value={data.unit_price}
                                aria-invalid={Boolean(errors.unit_price)}
                                onChange={(e) =>
                                    setData(
                                        'unit_price',
                                        hanyaDigit(e.target.value),
                                    )
                                }
                            />
                            <InputError message={errors.unit_price} />
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
                                aria-invalid={Boolean(errors.purchased_on)}
                                onChange={(e) =>
                                    setData('purchased_on', e.target.value)
                                }
                            />
                            <InputError message={errors.purchased_on} />
                        </Field>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <Field>
                            <FieldLabel htmlFor="asset-percent">
                                Maintenance (%/bln)
                            </FieldLabel>
                            <Input
                                id="asset-percent"
                                inputMode="numeric"
                                className="font-mono"
                                value={data.maintenance_percent}
                                aria-invalid={Boolean(
                                    errors.maintenance_percent,
                                )}
                                onChange={(e) =>
                                    setData(
                                        'maintenance_percent',
                                        hanyaDigit(e.target.value),
                                    )
                                }
                            />
                            <InputError message={errors.maintenance_percent} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="asset-life">
                                Umur (bulan)
                            </FieldLabel>
                            <Input
                                id="asset-life"
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
                            <FieldLabel htmlFor="asset-interval">
                                Rawat tiap (bulan)
                            </FieldLabel>
                            <Input
                                id="asset-interval"
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
                            <InputError
                                message={errors.maintenance_interval_months}
                            />
                        </Field>
                    </div>

                    <Field>
                        <FieldLabel>Dibayar dari</FieldLabel>
                        <ToggleGroup
                            value={[data.paid_by]}
                            onValueChange={(v) =>
                                v[0] && setData('paid_by', v[0])
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
                        <InputError message={errors.paid_by} />
                    </Field>

                    <p className="text-xs text-muted-foreground">
                        {perMonth > 0
                            ? `Alokasi maintenance +${formatRp(perMonth)} / bulan mulai ${formatBulan(data.purchased_on.slice(0, 7))}.`
                            : 'Umur dan jadwal perawatan terisi otomatis dari kategori — ubah kalau tahu angka sebenarnya.'}
                    </p>
                </FieldGroup>

                <DialogFooter>
                    <DialogClose
                        render={<Button variant="outline">Batal</Button>}
                    />
                    <Button disabled={processing} onClick={submit}>
                        Simpan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface ServiceForm {
    type: MaintenanceType;
    description: string;
    performed_on: string;
    cost: string;
}

function ServiceDialog({
    asset: a,
    today,
    balance,
    onClose,
}: {
    asset: AssetRow;
    today: string;
    balance: number;
    onClose: () => void;
}) {
    const form = useForm<ServiceForm>({
        type: 'routine',
        description: '',
        performed_on: today,
        cost: '',
    });
    const { data, setData, errors, processing } = form;

    const submit = () => {
        form.transform((d) => ({ ...d, cost: d.cost === '' ? '0' : d.cost }));
        form.post(AssetController.storeMaintenance(a.id).url, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Catat Servis — {a.name}</DialogTitle>
                    <DialogDescription>
                        Biayanya diambil dari dana maintenance, bukan dicatat di
                        Biaya. Jadwal perawatan berikutnya dihitung dari tanggal
                        ini.
                    </DialogDescription>
                </DialogHeader>

                <FieldGroup>
                    <Field>
                        <FieldLabel>Jenis</FieldLabel>
                        <ToggleGroup
                            value={[data.type]}
                            onValueChange={(v) => {
                                if (v[0] === 'routine' || v[0] === 'repair')
                                    setData('type', v[0]);
                            }}
                        >
                            <ToggleGroupItem value="routine">
                                Perawatan rutin
                            </ToggleGroupItem>
                            <ToggleGroupItem value="repair">
                                Perbaikan
                            </ToggleGroupItem>
                        </ToggleGroup>
                        <InputError message={errors.type} />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="service-description">
                            Keterangan
                        </FieldLabel>
                        <Input
                            id="service-description"
                            placeholder={
                                data.type === 'routine'
                                    ? 'Head cleaning'
                                    : 'Ganti kipas pendingin'
                            }
                            value={data.description}
                            aria-invalid={Boolean(errors.description)}
                            onChange={(e) =>
                                setData('description', e.target.value)
                            }
                        />
                        <InputError message={errors.description} />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <FieldLabel htmlFor="service-date">
                                Tanggal
                            </FieldLabel>
                            <Input
                                id="service-date"
                                type="date"
                                min={a.purchased_on}
                                max={today}
                                value={data.performed_on}
                                aria-invalid={Boolean(errors.performed_on)}
                                onChange={(e) =>
                                    setData('performed_on', e.target.value)
                                }
                            />
                            <InputError message={errors.performed_on} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="service-cost">
                                Biaya{' '}
                                <span className="text-muted-foreground">
                                    — boleh 0
                                </span>
                            </FieldLabel>
                            <Input
                                id="service-cost"
                                inputMode="numeric"
                                className="font-mono"
                                placeholder="0"
                                value={data.cost}
                                aria-invalid={Boolean(errors.cost)}
                                onChange={(e) =>
                                    setData('cost', hanyaDigit(e.target.value))
                                }
                            />
                            <InputError message={errors.cost} />
                        </Field>
                    </div>

                    <p className="font-mono text-xs text-muted-foreground">
                        Saldo dana maintenance {formatRp(balance)}
                    </p>
                </FieldGroup>

                <DialogFooter>
                    <DialogClose
                        render={<Button variant="outline">Batal</Button>}
                    />
                    <Button
                        disabled={data.description.trim() === '' || processing}
                        onClick={submit}
                    >
                        Simpan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface DisposeForm {
    reason: DisposalReason;
    disposed_on: string;
    sale_price: string;
}

function DisposeDialog({
    asset: a,
    today,
    onClose,
}: {
    asset: AssetRow;
    today: string;
    onClose: () => void;
}) {
    const form = useForm<DisposeForm>({
        reason: 'Dijual',
        disposed_on: today,
        sale_price: '',
    });
    const { data, setData, errors, processing } = form;
    const sold = data.reason === 'Dijual';

    const submit = () => {
        form.transform((d) => ({
            ...d,
            sale_price: sold && d.sale_price !== '' ? d.sale_price : '0',
        }));
        form.patch(AssetController.dispose(a.id).url, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Lepas Aset — {a.name}</DialogTitle>
                    <DialogDescription>
                        Aset tidak dihapus — riwayat servis dan alokasi
                        bulan-bulan sebelumnya tetap ada. Alokasi maintenance
                        berhenti mulai bulan aset dilepas.
                    </DialogDescription>
                </DialogHeader>

                <FieldGroup>
                    <Field>
                        <FieldLabel>Alasan</FieldLabel>
                        <ToggleGroup
                            value={[data.reason]}
                            onValueChange={(v) => {
                                const r = DISPOSAL_REASONS.find(
                                    (x) => x === v[0],
                                );
                                if (r) setData('reason', r);
                            }}
                        >
                            {DISPOSAL_REASONS.map((r) => (
                                <ToggleGroupItem key={r} value={r}>
                                    {r}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                        <InputError message={errors.reason} />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <FieldLabel htmlFor="dispose-date">
                                Tanggal
                            </FieldLabel>
                            <Input
                                id="dispose-date"
                                type="date"
                                min={a.purchased_on}
                                max={today}
                                value={data.disposed_on}
                                aria-invalid={Boolean(errors.disposed_on)}
                                onChange={(e) =>
                                    setData('disposed_on', e.target.value)
                                }
                            />
                            <InputError message={errors.disposed_on} />
                        </Field>
                        {sold && (
                            <Field>
                                <FieldLabel htmlFor="dispose-price">
                                    Harga jual
                                </FieldLabel>
                                <Input
                                    id="dispose-price"
                                    inputMode="numeric"
                                    className="font-mono"
                                    placeholder="0"
                                    value={data.sale_price}
                                    aria-invalid={Boolean(errors.sale_price)}
                                    onChange={(e) =>
                                        setData(
                                            'sale_price',
                                            hanyaDigit(e.target.value),
                                        )
                                    }
                                />
                                <InputError message={errors.sale_price} />
                            </Field>
                        )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                        {sold
                            ? `Hasil jual masuk dana maintenance untuk membeli pengganti — bukan omzet. Nilai buku saat ini ${formatRp(a.book_value)}.`
                            : 'Tidak ada uang masuk. Kalau perlu pengganti, beli dari dana maintenance atau catat sebagai aset baru.'}
                    </p>
                </FieldGroup>

                <DialogFooter>
                    <DialogClose
                        render={<Button variant="outline">Batal</Button>}
                    />
                    <Button disabled={processing} onClick={submit}>
                        Lepas Aset
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

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
                <CardTitle className="font-mono text-2xl font-semibold">
                    {value}
                </CardTitle>
            </CardHeader>
            <p className="text-xs text-muted-foreground">{note}</p>
        </Card>
    );
}
