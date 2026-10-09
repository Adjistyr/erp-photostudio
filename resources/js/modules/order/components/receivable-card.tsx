/**
 * Baris piutang sebagai kartu untuk layar < md (spek 4.6) — menagih sambil
 * memegang HP. Data dari baris yang sama dengan tabel; tidak ada field yang
 * hilang: Dibayar terbaca dari persen badge (sama seperti tabel di bawah 2xl).
 */

import { LineMark, PaymentBadge } from '@/components/status-order';
import { WhatsAppButton } from '@/components/whatsapp-button';
import { Button } from '@/components/ui/button';
import {
    formatRp,
    formatTanggal,
    formatUmurPiutang,
    personalise,
} from '@/lib/format';
import { billingValues } from '@/modules/order/components/invoice-document';
import type { ReceivableRow } from '@/modules/order/types';

export function ReceivableCard({
    row,
    template,
    onPay,
}: {
    row: ReceivableRow;
    /** Template `billing` (K5). */
    template: string;
    onPay: () => void;
}) {
    const overdue = row.days_until_due < 0;

    return (
        <li className="flex flex-col gap-2 rounded-lg border p-4">
            <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm">{row.number}</span>
                <PaymentBadge
                    status={row.payment_status}
                    paidPercent={row.paid_percent}
                />
            </div>
            <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">
                    {row.customer_name ?? (
                        <span className="text-muted-foreground">Walk-in</span>
                    )}
                </span>
                <LineMark line={row.business_line} />
            </div>
            <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono font-semibold">
                    Sisa {formatRp(row.balance)}
                </span>
                <span
                    data-overdue={overdue || undefined}
                    className={`text-sm ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}
                >
                    {formatUmurPiutang(row.days_until_due)}
                </span>
            </div>
            <p className="text-xs text-muted-foreground">
                dari <span className="font-mono">{formatRp(row.total)}</span> ·
                jatuh tempo {formatTanggal(row.service_date)}
            </p>
            <div className="flex gap-2 pt-1">
                <Button
                    size="lg"
                    variant="outline"
                    className="h-11 flex-1"
                    onClick={onPay}
                >
                    Catat Bayar
                </Button>
                <BillButton row={row} template={template} wide />
            </div>
        </li>
    );
}

/**
 * Tagih via WhatsApp — pesan dari template `billing`, dikirim manual.
 * Lewat jatuh tempo → tombol bergaris merah (prioritas); isi pesan sama.
 * Tanpa HP → disabled + tooltip; tidak ada fallback ke email.
 */
export function BillButton({
    row,
    template,
    wide = false,
}: {
    row: ReceivableRow;
    template: string;
    /** Versi kartu: berlabel, penuh lebar. */
    wide?: boolean;
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
            wide={wide}
        />
    );
}
