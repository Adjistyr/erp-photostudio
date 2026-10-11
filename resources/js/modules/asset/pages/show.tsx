/**
 * Aset — detail (spek 8.1). Pengganti Sheet di daftar: identitas (kode,
 * merek/model, seri, garansi, lokasi), keuangan, dan riwayat servis, dengan
 * aksi Edit, Catat Servis, Tandai Rusak/Aktif, dan Lepas.
 */

import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Wrench } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import AssetController from '@/actions/Modules/Asset/Controllers/AssetController';
import { ConfirmDelete } from '@/components/confirm-delete';
import { KELAS_DENSITY, KepalaUang, SelUang } from '@/components/data-table';
import { PageActions } from '@/components/page-actions';
import { RecordedBy } from '@/components/recorded-by';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatRp, formatTanggal } from '@/lib/format';
import {
    StatusBadge,
    WarrantyBadge,
} from '@/modules/asset/components/asset-badges';
import { DisposeDialog } from '@/modules/asset/components/dispose-dialog';
import { ServiceDialog } from '@/modules/asset/components/service-dialog';
import { MAINTENANCE_LABEL, brandModel } from '@/modules/asset/types';
import type { AssetDetail } from '@/modules/asset/types';
import { index as assetsIndex } from '@/routes/assets';

export default function AssetShow({
    asset: a,
    maintenance_balance,
    today,
}: {
    asset: AssetDetail;
    maintenance_balance: number;
    today: string;
}) {
    const [dialog, setDialog] = useState<'service' | 'dispose' | null>(null);
    const totalService = a.maintenances.reduce((s, m) => s + m.cost, 0);
    const bm = brandModel(a);

    return (
        <>
            <Head title={`${a.code} ${a.name}`} />
            <PageActions>
                {/* Identitas tetap bisa dikoreksi walau aset sudah dilepas. */}
                <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={AssetController.edit(a.id)} />}
                >
                    <Pencil data-icon="inline-start" />
                    Edit
                </Button>
            </PageActions>

            <div className="flex flex-col gap-6 p-6">
                <div className="flex flex-col gap-1">
                    <h1 className="flex flex-wrap items-center gap-3 font-heading text-xl font-semibold">
                        {a.name}
                        <StatusBadge asset={a} />
                        <WarrantyBadge until={a.warranty_until} today={today} />
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        <span className="font-mono">{a.code}</span> ·{' '}
                        {a.category}
                        {bm ? ` · ${bm}` : ''}
                    </p>
                </div>

                {!a.disposed_on && (
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => setDialog('service')}>
                            <Wrench data-icon="inline-start" />
                            Catat Servis
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                                router.patch(
                                    AssetController.updateStatus(a.id).url,
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

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <Section title="Identitas">
                        <Table className={KELAS_DENSITY}>
                            <TableBody>
                                <DetailRow label="Kode">
                                    <span className="font-mono">{a.code}</span>
                                </DetailRow>
                                <DetailRow label="Kategori">
                                    {a.category}
                                </DetailRow>
                                <DetailRow label="Merek">
                                    {a.brand ?? '—'}
                                </DetailRow>
                                <DetailRow label="Model">
                                    {a.model ?? '—'}
                                </DetailRow>
                                <DetailRow label="Nomor seri">
                                    <span className="font-mono break-all">
                                        {a.serial_number ?? '—'}
                                    </span>
                                </DetailRow>
                                <DetailRow label="Garansi">
                                    {a.warranty_until
                                        ? `s/d ${formatTanggal(a.warranty_until)}`
                                        : '—'}
                                </DetailRow>
                                <DetailRow label="Lokasi">
                                    {a.location ?? '—'}
                                </DetailRow>
                                <DetailRow label="Catatan">
                                    <span className="whitespace-pre-line">
                                        {a.notes ?? '—'}
                                    </span>
                                </DetailRow>
                            </TableBody>
                        </Table>
                    </Section>

                    <Section title="Keuangan">
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
                </div>

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
                                            {formatTanggal(m.performed_on)}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {MAINTENANCE_LABEL[m.type]}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {m.description}
                                            <RecordedBy
                                                name={m.created_by_name}
                                            />
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
                    yang sudah disisihkan untuk aset ini (bulan yang sudah
                    tutup).
                    {totalService > a.accumulated &&
                        ' Biaya servisnya melebihi dana yang disisihkan — pertimbangkan menaikkan persen maintenance atau mengganti alat.'}
                </p>
            </div>

            {dialog === 'service' && (
                <ServiceDialog
                    asset={a}
                    today={today}
                    balance={maintenance_balance}
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

AssetShow.layout = {
    breadcrumbs: [
        { title: 'Aset & Maintenance', href: assetsIndex() },
        { title: 'Detail aset', href: assetsIndex() },
    ],
};

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
            <TableCell className="w-28 align-top text-muted-foreground sm:w-36">
                {label}
            </TableCell>
            {/* Boleh terlipat — di HP nilai panjang (harga × unit) tidak terpotong. */}
            <TableCell className="whitespace-normal">{children}</TableCell>
        </TableRow>
    );
}
