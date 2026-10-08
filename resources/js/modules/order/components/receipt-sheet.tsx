/**
 * Ringkasan setelah transaksi tersimpan — pengganti toast yang hilang dalam
 * beberapa detik. Menawarkan bukti ke customer di titik akhir alur: cetak,
 * WhatsApp, atau salin link. Link-nya halaman publik invoice yang sama
 * (selalu kondisi terkini), bukan dokumen terpisah.
 *
 * Dua mode dari payload yang sama: struk (POS) dan bukti bayar (Catat
 * Bayar, ada `paid_amount`).
 *
 * Tombolnya "Kirim WA", bukan "Kirim": app hanya menyiapkan pesan,
 * pengirimannya tetap lewat WhatsApp owner (sama dengan layar Invoice).
 */

import { Copy, Printer, Send } from 'lucide-react';
import { toast } from 'sonner';
import { PaymentBadge } from '@/components/status-order';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { formatRp, formatTanggal } from '@/lib/format';
import {
    paymentReceiptMessage,
    receiptMessage,
    waLink,
} from '@/modules/order/components/invoice-document';
import type { Studio } from '@/modules/order/components/invoice-document';
import type { Receipt } from '@/modules/order/types';

export function ReceiptSheet({
    receipt,
    studio,
    onClose,
}: {
    receipt: Receipt | null;
    studio: Pick<Studio, 'name' | 'bank_account'>;
    onClose: () => void;
}) {
    return (
        <Sheet open={receipt !== null} onOpenChange={(o) => !o && onClose()}>
            <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-md">
                {receipt && (
                    <ReceiptBody
                        receipt={receipt}
                        studio={studio}
                        onClose={onClose}
                    />
                )}
            </SheetContent>
        </Sheet>
    );
}

function ReceiptBody({
    receipt,
    studio,
    onClose,
}: {
    receipt: Receipt;
    studio: Pick<Studio, 'name' | 'bank_account'>;
    onClose: () => void;
}) {
    const retail = receipt.business_line === 'retail';
    const phone = receipt.customer_phone;
    // Bukti bayar (Catat Bayar) vs struk (POS) — ditentukan dari payload.
    const payment = receipt.paid_amount !== undefined;
    const message = payment
        ? paymentReceiptMessage(receipt, studio)
        : receiptMessage(receipt, studio);

    return (
        <>
            <SheetHeader>
                <SheetDescription>
                    {payment ? 'Pembayaran tercatat' : 'Transaksi tersimpan'}
                </SheetDescription>
                <SheetTitle className="font-mono text-2xl">
                    {receipt.number}
                </SheetTitle>
            </SheetHeader>

            <div className="flex flex-col gap-4 p-4">
                <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-mono text-xl font-semibold">
                        {formatRp(receipt.total)}
                    </span>
                </div>
                {payment && (
                    <div className="flex items-baseline justify-between text-sm">
                        <span className="text-muted-foreground">
                            Diterima
                            {receipt.paid_on
                                ? ` · ${formatTanggal(receipt.paid_on)}`
                                : ''}
                        </span>
                        <span className="font-mono">
                            {formatRp(receipt.paid_amount ?? 0)}
                        </span>
                    </div>
                )}
                {(receipt.balance > 0 || payment) && (
                    <div className="flex items-center justify-between text-sm">
                        <span>
                            {receipt.balance > 0
                                ? `Sisa ${formatRp(receipt.balance)}`
                                : 'Tidak ada sisa'}
                        </span>
                        <PaymentBadge
                            status={receipt.payment_status}
                            paidPercent={Math.round(
                                ((receipt.total - receipt.balance) /
                                    receipt.total) *
                                    100,
                            )}
                        />
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    <Button
                        nativeButton={false}
                        render={
                            <a
                                href={receipt.print_url}
                                target="_blank"
                                rel="noreferrer"
                            />
                        }
                    >
                        <Printer data-icon="inline-start" />
                        Cetak {retail ? 'struk' : 'invoice'}
                    </Button>
                    {phone ? (
                        <Button
                            variant="outline"
                            nativeButton={false}
                            render={
                                <a
                                    href={waLink(phone, message)}
                                    target="_blank"
                                    rel="noreferrer"
                                />
                            }
                        >
                            <Send data-icon="inline-start" />
                            {payment ? 'Kirim bukti' : 'Kirim WA'}
                        </Button>
                    ) : (
                        <Button variant="outline" disabled>
                            <Send data-icon="inline-start" />
                            {payment ? 'Kirim bukti' : 'Kirim WA'}
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        onClick={async () => {
                            await navigator.clipboard.writeText(
                                receipt.invoice_url,
                            );
                            toast.success(
                                retail
                                    ? 'Link struk disalin'
                                    : 'Link invoice disalin',
                            );
                        }}
                    >
                        <Copy data-icon="inline-start" />
                        Salin link
                    </Button>
                    {!phone && (
                        <p className="text-xs text-muted-foreground">
                            Customer belum punya nomor HP — salin link dan kirim
                            manual.
                        </p>
                    )}
                </div>
            </div>

            <SheetFooter>
                <Button variant="ghost" onClick={onClose}>
                    {retail ? 'Transaksi baru' : 'Selesai'}
                </Button>
            </SheetFooter>
        </>
    );
}
