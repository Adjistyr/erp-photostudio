/**
 * Laporan — Penjualan (prompt 4.21, porting web/app/routes/laporan-penjualan.tsx).
 *
 * Tiga tabel untuk tiga pertanyaan, sengaja tidak digabung: produk mana yang
 * laku (dan marginnya), paket jasa mana yang laku, customer mana yang paling
 * bernilai. Produk dihitung dari uang DITERIMA (basis kas, ada HPP per unit),
 * jasa dari NILAI ORDER (HPP per job, tidak di katalog) — menggabungkannya
 * menjumlahkan dua hal yang tidak sejenis.
 */

import { Head } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { KepalaUang, KosongTabel, TabelData } from '@/components/data-table';
import { LineMark } from '@/components/status-order';
import {
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatPersen, formatRp, formatTanggal, kelasRp } from '@/lib/format';
import { ReportNav } from '@/modules/finance/components/report-nav';
import { profitLoss } from '@/routes/reports';
import type { BusinessLine } from '@/types/domain';

interface Props {
    month: string;
    products: {
        id: number;
        name: string;
        quantity: number;
        revenue: number;
        cost: number;
        margin: number;
        margin_ratio: number;
    }[];
    services: {
        id: number;
        name: string;
        category: string;
        quantity: number;
        value: number;
    }[];
    customers: {
        id: number;
        name: string;
        lines: BusinessLine[];
        order_count: number;
        order_value: number;
        paid: number;
        last_transaction: string | null;
    }[];
    walk_in: { count: number; value: number };
    /** Item di luar katalog (harga nego); null = tidak ada. */
    custom_items: {
        order_count: number;
        quantity: number;
        value: number;
    } | null;
}

export default function Sales({
    month,
    products,
    services,
    customers,
    walk_in,
    custom_items,
}: Props) {
    const total = products.reduce(
        (t, p) => ({
            quantity: t.quantity + p.quantity,
            revenue: t.revenue + p.revenue,
            cost: t.cost + p.cost,
        }),
        { quantity: 0, revenue: 0, cost: 0 },
    );
    const totalMargin = total.revenue - total.cost;
    const unsold = products.filter((p) => p.quantity === 0);

    return (
        <>
            <Head title="Penjualan" />
            <h1 className="sr-only">Penjualan</h1>

            <div className="flex flex-col gap-6 p-6">
                <ReportNav current="sales" month={month} />

                <Section
                    title="Produk terlaris"
                    note="dihitung dari uang yang diterima bulan ini (basis kas)"
                >
                    {products.length === 0 ? (
                        <KosongTabel kalimat="Belum ada produk di katalog." />
                    ) : (
                        <TabelData>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Produk</TableHead>
                                    <TableHead className="text-right">
                                        Qty
                                    </TableHead>
                                    <KepalaUang>Omzet</KepalaUang>
                                    <KepalaUang>HPP</KepalaUang>
                                    <KepalaUang>Margin</KepalaUang>
                                    <KepalaUang>Margin %</KepalaUang>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.map((p) => (
                                    <TableRow
                                        key={p.id}
                                        className={
                                            p.quantity === 0 ? 'opacity-60' : ''
                                        }
                                    >
                                        <TableCell className="font-medium">
                                            {p.name}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {p.quantity}
                                        </TableCell>
                                        <TableCell
                                            className={`text-right font-mono ${kelasRp(p.revenue)}`}
                                        >
                                            {formatRp(p.revenue)}
                                        </TableCell>
                                        <TableCell
                                            className={`text-right font-mono ${kelasRp(p.cost)}`}
                                        >
                                            {formatRp(p.cost)}
                                        </TableCell>
                                        <TableCell
                                            className={`text-right font-mono ${kelasRp(p.margin)}`}
                                        >
                                            {formatRp(p.margin)}
                                        </TableCell>
                                        {/*
                                            Tak laku: "—" bukan "0%". Nol persen berarti
                                            "dijual tanpa untung", yang benar "belum pernah
                                            terjual" — kesimpulan yang sangat berbeda.
                                        */}
                                        <TableCell className="text-right font-mono">
                                            {p.quantity === 0 ? (
                                                <span className="text-muted-foreground">
                                                    —
                                                </span>
                                            ) : (
                                                formatPersen(p.margin_ratio)
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell className="font-semibold">
                                        Total
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-semibold">
                                        {total.quantity}
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-semibold">
                                        {formatRp(total.revenue)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-semibold">
                                        {formatRp(total.cost)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-semibold">
                                        {formatRp(totalMargin)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-semibold">
                                        {total.revenue === 0
                                            ? '—'
                                            : formatPersen(
                                                  totalMargin / total.revenue,
                                              )}
                                    </TableCell>
                                </TableRow>
                            </TableFooter>
                        </TabelData>
                    )}

                    {unsold.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                            {unsold.length === 1
                                ? 'Satu produk'
                                : `${unsold.length} produk`}{' '}
                            belum terjual sama sekali bulan ini:{' '}
                            {unsold.map((p) => p.name).join(', ')}. Modal yang
                            menganggur — kandidat pertama untuk dihentikan atau
                            didiskon.
                        </p>
                    )}
                </Section>

                <Section
                    title="Jasa terlaris"
                    note="dihitung dari nilai order yang disepakati, order batal tidak dihitung"
                >
                    {services.length === 0 && !custom_items ? (
                        <KosongTabel kalimat="Belum ada jasa terjual." />
                    ) : (
                        <TabelData>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Paket</TableHead>
                                    <TableHead>Kategori</TableHead>
                                    <TableHead className="text-right">
                                        Order
                                    </TableHead>
                                    <KepalaUang>Nilai</KepalaUang>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {services.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-medium">
                                            {s.name}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {s.category}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {s.quantity}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {formatRp(s.value)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {/* Agregat, bukan per paket: tidak ada paketnya —
                                    tapi nilainya tidak boleh hilang dari laporan. */}
                                {custom_items && (
                                    <TableRow>
                                        <TableCell className="font-medium">
                                            Item custom
                                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                {custom_items.order_count} order
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            —
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {custom_items.quantity}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {formatRp(custom_items.value)}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </TabelData>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Kolom margin sengaja tidak ada: HPP jasa berbeda tiap
                        job dan tidak bisa dihitung per paket. Marginnya ada di
                        Margin per Lini.
                        {custom_items &&
                            ' Item custom = item di luar katalog (harga nego) — tidak dibandingkan per paket.'}
                    </p>
                </Section>

                <Section
                    title="Customer teratas"
                    note="nilai order vs uang yang benar-benar sudah disetor · transaksi tanpa nama customer tidak dirangking"
                >
                    {customers.length === 0 ? (
                        <KosongTabel kalimat="Customer akan terkumpul otomatis dari setiap transaksi." />
                    ) : (
                        <TabelData>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Pernah beli</TableHead>
                                    <TableHead className="text-right">
                                        Order
                                    </TableHead>
                                    <KepalaUang>Nilai order</KepalaUang>
                                    <KepalaUang>Sudah dibayar</KepalaUang>
                                    <KepalaUang>Terbayar</KepalaUang>
                                    <TableHead>Terakhir</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customers.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-medium whitespace-nowrap">
                                            {c.name}
                                        </TableCell>
                                        <TableCell>
                                            <span className="flex gap-3">
                                                {c.lines.map((l) => (
                                                    <LineMark
                                                        key={l}
                                                        line={l}
                                                    />
                                                ))}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {c.order_count}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {formatRp(c.order_value)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {formatRp(c.paid)}
                                        </TableCell>
                                        {/*
                                            Di basis kas, customer dengan nilai order
                                            terbesar belum tentu yang paling banyak
                                            menyetor uang.
                                        */}
                                        <TableCell className="text-right font-mono">
                                            {c.order_value === 0 ? (
                                                <span className="text-muted-foreground">
                                                    —
                                                </span>
                                            ) : (
                                                formatPersen(
                                                    c.paid / c.order_value,
                                                )
                                            )}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {c.last_transaction
                                                ? formatTanggal(
                                                      c.last_transaction,
                                                  )
                                                : '—'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </TabelData>
                    )}
                    {walk_in.value > 0 && (
                        <p className="text-xs text-muted-foreground">
                            Di luar tabel ini, {formatRp(walk_in.value)} dari{' '}
                            {walk_in.count} transaksi walk-in tanpa nama
                            customer. Mencatat nama di POS bersifat opsional
                            supaya transaksinya tidak dilewat — ini harga yang
                            dibayar untuk itu.
                        </p>
                    )}
                </Section>
            </div>
        </>
    );
}

Sales.layout = {
    breadcrumbs: [{ title: 'Laporan', href: profitLoss() }],
};

function Section({
    title,
    note,
    children,
}: {
    title: string;
    note: string;
    children: ReactNode;
}) {
    return (
        <section className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-col gap-0.5">
                <h2 className="font-heading text-base font-semibold">
                    {title}
                </h2>
                <p className="text-xs text-muted-foreground">{note}</p>
            </div>
            {children}
        </section>
    );
}
