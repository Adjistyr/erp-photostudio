/**
 * Invoice — Daftar + Preview & Kirim (prompt 4.14 & 4.15, porting
 * web/app/routes/invoice.tsx).
 *
 * Invoice DIGENERATE dari order, tidak diketik ulang (business-flow 5.5).
 * Tombolnya "Buka WhatsApp" dan "Salin Link", bukan "Kirim": pengiriman tetap
 * manual, dan menamai tombolnya "Kirim" menjanjikan sesuatu yang tidak
 * dilakukan app.
 */

import { Head } from '@inertiajs/react';
import { Copy, ExternalLink, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    KepalaUang,
    KosongTabel,
    SelKode,
    SelUang,
    TabelData,
} from '@/components/data-table';
import { LineMark, PaymentBadge } from '@/components/status-order';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatTanggal, keNomorWa } from '@/lib/format';
import {
    InvoiceDocument,
    whatsappMessage,
} from '@/modules/order/components/invoice-document';
import type {
    Invoice,
    Studio,
} from '@/modules/order/components/invoice-document';
import { index as invoicesIndex } from '@/routes/invoices';

export default function Invoices({
    invoices,
    studio,
}: {
    invoices: Invoice[];
    studio: Studio;
}) {
    // Simpan id, bukan objek: isi invoice selalu dibaca dari props terbaru.
    const [previewId, setPreviewId] = useState<number | null>(null);
    const preview = invoices.find((i) => i.id === previewId) ?? null;

    return (
        <>
            <Head title="Invoice" />
            <h1 className="sr-only">Invoice</h1>

            <div className="flex flex-col gap-6 p-6">
                <Alert>
                    <AlertTitle>Invoice digenerate dari order</AlertTitle>
                    <AlertDescription>
                        Tidak ada yang perlu dibuat manual. Satu invoice dikirim
                        berkali-kali seiring pembayaran bertambah — isinya
                        selalu mengikuti kondisi terkini, jadi tidak ada dokumen
                        terpisah untuk DP dan pelunasan. Order batal tidak punya
                        invoice.
                    </AlertDescription>
                </Alert>

                {invoices.length === 0 ? (
                    <KosongTabel kalimat="Invoice muncul otomatis begitu ada order." />
                ) : (
                    <TabelData>
                        <TableHeader>
                            <TableRow>
                                <TableHead>No</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Lini</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <KepalaUang>Total</KepalaUang>
                                <KepalaUang>Sisa</KepalaUang>
                                <TableHead>Status Bayar</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.map((i) => (
                                <TableRow key={i.id}>
                                    <SelKode>{i.number}</SelKode>
                                    <TableCell className="font-medium whitespace-nowrap">
                                        {i.customer_name ?? (
                                            <span className="text-muted-foreground">
                                                Walk-in
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <LineMark line={i.business_line} />
                                    </TableCell>
                                    <TableCell
                                        className="max-w-48 truncate text-muted-foreground"
                                        title={i.items_summary}
                                    >
                                        {i.items_summary}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        {formatTanggal(i.service_date)}
                                    </TableCell>
                                    <SelUang nominal={i.total} />
                                    <SelUang nominal={i.balance} />
                                    <TableCell>
                                        <PaymentBadge
                                            status={i.payment_status}
                                            paidPercent={i.paid_percent}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setPreviewId(i.id)}
                                        >
                                            Lihat
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </TabelData>
                )}
            </div>

            <Sheet
                open={preview !== null}
                onOpenChange={(o) => !o && setPreviewId(null)}
            >
                <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-2xl">
                    {preview && (
                        <InvoicePreview invoice={preview} studio={studio} />
                    )}
                </SheetContent>
            </Sheet>
        </>
    );
}

Invoices.layout = {
    breadcrumbs: [{ title: 'Invoice', href: invoicesIndex() }],
};

function InvoicePreview({
    invoice,
    studio,
}: {
    invoice: Invoice;
    studio: Studio;
}) {
    return (
        <>
            <SheetHeader>
                <SheetTitle className="font-mono">{invoice.number}</SheetTitle>
                <SheetDescription>
                    {invoice.customer_name ?? 'Walk-in'} ·{' '}
                    {formatTanggal(invoice.service_date)}
                </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-6 p-4">
                <InvoiceDocument invoice={invoice} studio={studio} />

                <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                        {invoice.customer_phone && (
                            <Button
                                nativeButton={false}
                                render={
                                    <a
                                        href={`https://wa.me/${keNomorWa(invoice.customer_phone)}?text=${encodeURIComponent(whatsappMessage(invoice, studio))}`}
                                        target="_blank"
                                        rel="noreferrer"
                                    />
                                }
                            >
                                <Send data-icon="inline-start" />
                                Buka WhatsApp
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            onClick={async () => {
                                await navigator.clipboard.writeText(
                                    invoice.public_url,
                                );
                                toast.success('Link invoice disalin');
                            }}
                        >
                            <Copy data-icon="inline-start" />
                            Salin Link
                        </Button>
                        <Button
                            variant="outline"
                            nativeButton={false}
                            render={
                                <a
                                    href={invoice.public_url}
                                    target="_blank"
                                    rel="noreferrer"
                                />
                            }
                        >
                            <ExternalLink data-icon="inline-start" />
                            Buka / Cetak
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        App menyiapkan pesannya; pengiriman tetap lewat WhatsApp
                        kamu. Link bisa dibuka customer tanpa login dan selalu
                        menampilkan kondisi terkini.
                        {!invoice.customer_phone &&
                            ' Customer ini belum punya nomor HP — salin link dan kirim manual.'}
                    </p>
                </div>
            </div>
        </>
    );
}
