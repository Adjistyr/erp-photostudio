/**
 * Pembayaran — Piutang + dialog Catat Pembayaran (prompt 4.9 & 4.10,
 * porting web/app/routes/pembayaran.tsx).
 *
 * Layar yang paling sering dibuka owner (business-flow 5.4). Tanpa layar ini
 * tagihan yang belum ditagih terlupakan — kebocoran paling umum di bisnis jasa.
 * Mencatat pembayaran di sini mengubah status bayar SECARA TURUNAN (bagian 4):
 * order yang lunas hilang dari daftar karena sisanya nol, bukan karena ada
 * field status yang diubah.
 */

import { Head, Link } from '@inertiajs/react';
import { TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import {
    KepalaUang,
    KosongTabel,
    SelKode,
    SelUang,
    TabelData,
} from '@/components/data-table';
import { LineMark, PaymentBadge } from '@/components/status-order';
import { ListToolbar } from '@/components/list-toolbar';
import type { ListFilterDef, ListFilters } from '@/components/list-toolbar';
import { SummaryCard } from '@/components/summary-card';
import { WhatsAppButton } from '@/components/whatsapp-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    formatPersen,
    formatRp,
    formatTanggal,
    formatUmurPiutang,
    personalise,
} from '@/lib/format';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFlash } from '@/hooks/use-flash';
import { billingValues } from '@/modules/order/components/invoice-document';
import type { Studio } from '@/modules/order/components/invoice-document';
import { PaymentDialog } from '@/modules/order/components/payment-dialog';
import { ReceiptSheet } from '@/modules/order/components/receipt-sheet';
import { filterReceivables } from '@/modules/order/lib/receivables-filter';
import type { AgeTab } from '@/modules/order/lib/receivables-filter';
import type { ReceivableRow, Receipt } from '@/modules/order/types';
import { index as communicationIndex } from '@/routes/communication';
import { index as receivablesIndex } from '@/routes/receivables';
import { BUSINESS_LINES, LINE_LABEL } from '@/types/domain';

const AGE_TABS: AgeTab[] = ['all', 'overdue', 'soon'];

const AGE_LABEL: Record<AgeTab, string> = {
    all: 'Semua',
    overdue: 'Lewat jatuh tempo',
    soon: '≤ 7 hari lagi',
};

const RECEIVABLE_FILTERS: ListFilterDef[] = [
    {
        key: 'line',
        label: 'Lini',
        options: BUSINESS_LINES.map((l) => ({
            value: l,
            label: LINE_LABEL[l],
        })),
    },
];

interface Props {
    orders: ReceivableRow[];
    totals: { total: number; overdue: number; overdue_count: number };
    studio: Studio;
    /** Template `billing` (editan owner di Komunikasi, K5). */
    billing_template: string;
}

export default function Receivables({
    orders,
    totals,
    studio,
    billing_template,
}: Props) {
    // Simpan id, bukan objek: setelah mencatat, baris dibaca ulang dari props.
    const [payingId, setPayingId] = useState<number | null>(null);
    // Bukti bayar untuk customer — muncul setelah PaymentDialog sukses.
    const [receipt, clearReceipt] = useFlash<Receipt>('receipt');
    // Dari `orders`, bukan hasil filter: dialog tidak boleh tertutup bila
    // barisnya hilang dari filter setelah dibayar sebagian.
    const paying = orders.find((o) => o.id === payingId) ?? null;
    const top = orders[0];

    // Filter di klien (spek 3.2) — state komponen, bukan URL: layar ini selalu
    // per hari ini dan tidak dibagikan.
    const [age, setAge] = useState<AgeTab>('all');
    const [search, setSearch] = useState<ListFilters>({ q: '' });
    const line = BUSINESS_LINES.find((l) => l === search.line);
    const visible = filterReceivables(orders, { q: search.q, line, age });
    const filtered = visible.length !== orders.length;
    const count = (a: AgeTab) =>
        filterReceivables(orders, { q: '', age: a }).length;

    return (
        <>
            <Head title="Pembayaran" />
            <h1 className="sr-only">Pembayaran</h1>

            <div className="flex flex-col gap-6 p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <SummaryCard
                        label="Total piutang"
                        value={formatRp(totals.total)}
                        note={`${orders.length} order belum lunas`}
                    />
                    <SummaryCard
                        label="Lewat jatuh tempo"
                        value={formatRp(totals.overdue)}
                        note={`${totals.overdue_count} order`}
                        urgent={totals.overdue > 0}
                    />
                    <SummaryCard
                        label="Belum jatuh tempo"
                        value={formatRp(totals.total - totals.overdue)}
                        note={`${orders.length - totals.overdue_count} order`}
                    />
                </div>

                {/*
                    Piutang yang menumpuk di satu customer adalah risiko yang
                    tidak kelihatan di tabel — di sana semua tagihan tampil
                    sebagai baris setara (stitch-prompts.md bagian 3). Daftar
                    sudah diurut sisa terbesar, jadi baris pertama = terbesar.
                */}
                {top && top.balance / totals.total > 0.5 && (
                    <Alert>
                        <TriangleAlert />
                        <AlertTitle>
                            {formatPersen(top.balance / totals.total)} piutang
                            menumpuk di satu customer
                        </AlertTitle>
                        <AlertDescription>
                            {top.customer_name ?? 'Walk-in'} — {top.number}.
                            Kalau tagihan ini tertunda, hampir seluruh piutang
                            ikut tertunda.
                        </AlertDescription>
                    </Alert>
                )}

                {orders.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <Tabs
                            value={age}
                            onValueChange={(v) => {
                                const a = AGE_TABS.find((x) => x === v);
                                if (a) setAge(a);
                            }}
                        >
                            <TabsList>
                                {AGE_TABS.map((a) => (
                                    <TabsTrigger key={a} value={a}>
                                        {AGE_LABEL[a]} ({count(a)})
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                        <ListToolbar
                            value={search}
                            filters={RECEIVABLE_FILTERS}
                            placeholder="Cari nomor order atau customer…"
                            onChange={setSearch}
                        />
                        {filtered && (
                            <p className="text-xs text-muted-foreground">
                                Kartu di atas menghitung seluruh piutang; tabel
                                di bawah difilter ({visible.length} dari{' '}
                                {orders.length}).
                            </p>
                        )}
                    </div>
                )}

                {orders.length === 0 ? (
                    // Piutang kosong itu KABAR BAIK, bukan kekurangan data (R7).
                    <KosongTabel
                        nada="baik"
                        kalimat="Tidak ada tagihan tertunggak."
                    />
                ) : visible.length === 0 ? (
                    <KosongTabel
                        kalimat="Tidak ada piutang yang cocok."
                        aksi={{
                            label: 'Hapus filter',
                            onClick: () => {
                                setAge('all');
                                setSearch({ q: '' });
                            },
                        }}
                    />
                ) : (
                    <TabelData>
                        <TableHeader>
                            <TableRow>
                                <TableHead>No</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Lini</TableHead>
                                <TableHead>Jatuh tempo</TableHead>
                                <TableHead>Umur</TableHead>
                                <KepalaUang>Total</KepalaUang>
                                {/* Dibayar = Total − Sisa dan terbaca dari persen badge;
                                    disembunyikan di bawah 2xl supaya kolom aksi (Tagih WA +
                                    Catat Bayar) muat tanpa scroll di laptop. */}
                                <KepalaUang className="hidden 2xl:table-cell">
                                    Dibayar
                                </KepalaUang>
                                <KepalaUang>Sisa</KepalaUang>
                                <TableHead>Status</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map((o) => (
                                <TableRow key={o.id}>
                                    <SelKode>{o.number}</SelKode>
                                    <TableCell className="font-medium whitespace-nowrap">
                                        {o.customer_name ?? (
                                            <span className="text-muted-foreground">
                                                Walk-in
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <LineMark line={o.business_line} />
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        {formatTanggal(o.service_date)}
                                    </TableCell>
                                    <TableCell
                                        className={`whitespace-nowrap ${o.days_until_due < 0 ? 'text-destructive' : ''}`}
                                    >
                                        {formatUmurPiutang(o.days_until_due)}
                                    </TableCell>
                                    <SelUang nominal={o.total} />
                                    <SelUang
                                        nominal={o.paid}
                                        className="hidden 2xl:table-cell"
                                    />
                                    <SelUang nominal={o.balance} />
                                    <TableCell>
                                        <PaymentBadge
                                            status={o.payment_status}
                                            paidPercent={o.paid_percent}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <span className="flex justify-end gap-1.5">
                                            <BillButton
                                                row={o}
                                                template={billing_template}
                                            />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    setPayingId(o.id)
                                                }
                                            >
                                                Catat Bayar
                                            </Button>
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </TabelData>
                )}
                {orders.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                        Pesan tagihan diambil dari template{' '}
                        <Link
                            href={communicationIndex()}
                            className="underline underline-offset-4"
                        >
                            Tagihan di Komunikasi
                        </Link>
                        . App menyiapkan pesannya; pengiriman tetap lewat
                        WhatsApp kamu.
                    </p>
                )}
            </div>

            {paying && (
                <PaymentDialog
                    key={`${paying.id}-${paying.balance}`}
                    order={paying}
                    onClose={() => setPayingId(null)}
                />
            )}
            <ReceiptSheet
                receipt={receipt}
                studio={studio}
                onClose={clearReceipt}
            />
        </>
    );
}

Receivables.layout = {
    breadcrumbs: [{ title: 'Pembayaran', href: receivablesIndex() }],
};

/**
 * Tagih via WhatsApp — pesan dari template `billing`, dikirim manual.
 * Lewat jatuh tempo → tombol bergaris merah (prioritas); isi pesan sama.
 * Tanpa HP → disabled + tooltip; tidak ada fallback ke email.
 */
function BillButton({
    row,
    template,
}: {
    row: ReceivableRow;
    template: string;
}) {
    const overdue = row.days_until_due < 0;

    const message = personalise(
        template,
        billingValues({
            customer_name: row.customer_name,
            order_number: row.number,
            balance: row.balance,
            service_date: row.service_date,
            public_url: row.invoice_url,
        }),
    );

    return (
        <WhatsAppButton
            phone={row.customer_phone}
            message={message}
            label={
                overdue
                    ? `Tagih ${row.number} via WhatsApp — lewat jatuh tempo`
                    : `Tagih ${row.number} via WhatsApp`
            }
            urgent={overdue}
        />
    );
}
