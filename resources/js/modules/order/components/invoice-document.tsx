/**
 * Badan invoice — yang dilihat customer. Dipakai pratinjau di layar Invoice
 * dan halaman publik (link yang dikirim / dicetak), supaya yang owner lihat
 * persis sama dengan yang diterima customer.
 */

import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { KELAS_DENSITY } from '@/components/data-table';
import { formatJadwal, formatRp, formatTanggal, keNomorWa } from '@/lib/format';
import { PAYMENT_METHOD_LABEL } from '@/modules/order/types';
import type { PaymentMethod, Receipt } from '@/modules/order/types';
import type { BusinessLine, PaymentStatus } from '@/types/domain';

export interface Studio {
    name: string;
    address: string;
    phone: string;
    bank_account: string;
}

export interface Invoice {
    id: number;
    number: string;
    order_number: string;
    customer_name: string | null;
    customer_phone: string | null;
    business_line: BusinessLine;
    items_summary: string;
    service_date: string;
    service_time: string | null;
    location: string | null;
    items: { id: number; name: string; quantity: number; unit_price: number }[];
    discount: number;
    total: number;
    payments: {
        id: number;
        paid_on: string;
        method: PaymentMethod;
        note: string;
        amount: number;
    }[];
    paid: number;
    balance: number;
    payment_status: PaymentStatus;
    paid_percent: number;
    public_url: string;
    /** Varian cetak (`?print=1`), ditandatangani terpisah. */
    print_url: string;
}

/** Pesan WhatsApp ke customer — disiapkan app, dikirim manual oleh owner. */
export function whatsappMessage(invoice: Invoice, studio: Studio): string {
    const firstName = (invoice.customer_name ?? '').split(' ')[0] || 'Kak';
    return (
        `Halo ${firstName}, berikut invoice ${invoice.number} dari ${studio.name}.\n` +
        `Total ${formatRp(invoice.total)}` +
        (invoice.paid > 0 ? `, sudah dibayar ${formatRp(invoice.paid)}` : '') +
        (invoice.balance > 0
            ? `, sisa ${formatRp(invoice.balance)}.\n`
            : '. Lunas, terima kasih!\n') +
        (invoice.balance > 0 ? `Pembayaran ke ${studio.bank_account}.\n` : '') +
        `Detail: ${invoice.public_url}`
    );
}

/**
 * Pesan WA struk retail. Teks tetap, bukan template: keputusan K5 (template
 * `billing`) hanya untuk pesan TAGIHAN.
 */
export function receiptMessage(
    receipt: Pick<Receipt, 'number' | 'total' | 'invoice_url'>,
    studio: Pick<Studio, 'name'>,
): string {
    return (
        `Terima kasih sudah berbelanja di ${studio.name}! ` +
        `Struk ${receipt.number} · total ${formatRp(receipt.total)}. ` +
        `Lihat/unduh: ${receipt.invoice_url}`
    );
}

/** Tautan chat WhatsApp berisi pesan — nomor lewat keNomorWa (data lama `08…`). */
export function waLink(phone: string, text: string): string {
    return `https://wa.me/${keNomorWa(phone)}?text=${encodeURIComponent(text)}`;
}

/** Retail = struk (lunas di tempat); studio/event = invoice. Satu penomoran INV-. */
export function documentTitle(line: BusinessLine): string {
    return line === 'retail' ? 'Struk' : 'Invoice';
}

export function InvoiceDocument({
    invoice,
    studio,
}: {
    invoice: Invoice;
    studio: Studio;
}) {
    const subtotal = invoice.items.reduce(
        (s, i) => s + i.quantity * i.unit_price,
        0,
    );
    // Struk retail dicetak di kertas thermal 80 mm: kolom Harga disembunyikan
    // saat cetak (Qty × Jumlah cukup), bingkai dihilangkan supaya muat.
    const retail = invoice.business_line === 'retail';
    const hideOnSlip = retail ? 'print:hidden' : '';
    const schedule = invoice.service_time
        ? `${invoice.service_date}T${invoice.service_time}`
        : invoice.service_date;

    return (
        <div
            className={`flex flex-col gap-5 rounded-lg border bg-background p-5 ${retail ? 'print:gap-3 print:border-0 print:p-0' : ''}`}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col">
                    <span className="font-heading text-base font-semibold">
                        {studio.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {studio.address}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {studio.phone}
                    </span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-xs tracking-wide text-muted-foreground uppercase">
                        {documentTitle(invoice.business_line)}
                    </span>
                    <span className="font-mono text-sm font-medium whitespace-nowrap">
                        {invoice.number}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {formatTanggal(invoice.service_date)}
                    </span>
                </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                    Ditagihkan ke
                </span>
                <span className="text-sm font-medium">
                    {invoice.customer_name ?? 'Walk-in'}
                </span>
                {invoice.customer_phone && (
                    <span className="font-mono text-xs text-muted-foreground">
                        {invoice.customer_phone}
                    </span>
                )}
                {invoice.location && (
                    <span className="text-xs text-muted-foreground">
                        Lokasi: {invoice.location} · {formatJadwal(schedule)}
                    </span>
                )}
            </div>

            <div className="overflow-hidden rounded-lg border">
                <Table className={KELAS_DENSITY}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className={`text-right ${hideOnSlip}`}>
                                Harga
                            </TableHead>
                            <TableHead className="text-right">Jumlah</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoice.items.map((i) => (
                            <TableRow key={i.id}>
                                <TableCell className="font-medium">
                                    {i.name}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {i.quantity}
                                </TableCell>
                                <TableCell
                                    className={`text-right font-mono ${hideOnSlip}`}
                                >
                                    {formatRp(i.unit_price)}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {formatRp(i.quantity * i.unit_price)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex flex-col gap-2 text-sm">
                {invoice.discount > 0 && (
                    <>
                        <Line label="Subtotal" value={formatRp(subtotal)} />
                        <Line
                            label="Diskon"
                            value={`−${formatRp(invoice.discount)}`}
                        />
                    </>
                )}
                <Line label="Total" value={formatRp(invoice.total)} />
                {/*
                    Pembayaran per transaksi, bukan cuma totalnya: customer yang
                    sudah transfer DP perlu melihat setorannya tercatat — itu
                    yang membuat invoice kedua tidak terasa seperti tagihan baru.
                */}
                {invoice.payments.map((p) => (
                    <div
                        key={p.id}
                        className="flex justify-between text-muted-foreground"
                    >
                        <span>
                            {p.note} · {formatTanggal(p.paid_on)} ·{' '}
                            {PAYMENT_METHOD_LABEL[p.method]}
                        </span>
                        <span className="font-mono whitespace-nowrap">
                            −{formatRp(p.amount)}
                        </span>
                    </div>
                ))}
                <Separator />
                <div className="flex items-baseline justify-between">
                    <span className="font-medium">
                        {invoice.balance > 0 ? 'Sisa tagihan' : 'Lunas'}
                    </span>
                    <span
                        className={`font-mono text-xl font-semibold ${invoice.balance > 0 ? '' : 'text-success'}`}
                    >
                        {formatRp(invoice.balance)}
                    </span>
                </div>
            </div>

            {invoice.balance > 0 && (
                <div className="rounded-md bg-muted p-3 text-sm">
                    <p className="text-xs text-muted-foreground">
                        Pembayaran ke
                    </p>
                    <p className="font-mono">{studio.bank_account}</p>
                </div>
            )}
        </div>
    );
}

function Line({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between">
            <span>{label}</span>
            <span className="font-mono whitespace-nowrap">{value}</span>
        </div>
    );
}
