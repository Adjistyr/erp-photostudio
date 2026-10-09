/**
 * Transaksi POS hari ini (spek 2.5) — jawaban untuk "tadi yang Rp 80 ribu
 * sudah tercatat belum?" tanpa pindah ke Order & Booking, sekaligus jalan
 * membuka ulang struk yang flash-nya sudah lewat.
 *
 * Tertutup secara default: kolom kanan dipakai keranjang, panel terbuka
 * mendorong tombol Simpan & Bayar ke bawah layar. Ringkasan (jumlah & total)
 * sudah terbaca di tombol pembukanya.
 */

import { Link } from '@inertiajs/react';
import { ChevronDown, Receipt as ReceiptIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { formatRp } from '@/lib/format';
import { PAYMENT_METHOD_LABEL } from '@/modules/order/types';
import type { PaymentMethod, Receipt } from '@/modules/order/types';
import { index as ordersIndex } from '@/routes/orders';

export interface TodaySale {
    id: number;
    number: string;
    time: string | null;
    items_summary: string;
    total: number;
    /** Split payment (4.4): 1–2 metode; kosong bila belum ada pembayaran. */
    methods: PaymentMethod[];
    cancelled: boolean;
    customer_name: string | null;
    customer_phone: string | null;
    /** null untuk order batal — halaman publiknya 404. */
    invoice_url: string | null;
    print_url: string | null;
}

/** Struk dari baris panel — bentuk sama dengan flash `receipt` POS (2.2). */
export function toReceipt(sale: TodaySale): Receipt | null {
    if (sale.cancelled || !sale.invoice_url || !sale.print_url) return null;
    return {
        order_id: sale.id,
        number: sale.number,
        total: sale.total,
        balance: 0,
        payment_status: 'paid',
        invoice_url: sale.invoice_url,
        print_url: sale.print_url,
        customer_phone: sale.customer_phone,
        business_line: 'retail',
    };
}

export function TodaySales({
    sales,
    total,
    onOpenReceipt,
}: {
    sales: TodaySale[];
    total: number;
    onOpenReceipt: (receipt: Receipt) => void;
}) {
    const active = sales.filter((s) => !s.cancelled).length;

    return (
        <Collapsible className="rounded-lg border">
            <CollapsibleTrigger
                disabled={sales.length === 0}
                render={
                    <Button
                        variant="ghost"
                        className="group w-full justify-between rounded-lg px-4"
                    />
                }
            >
                <span className="text-sm">
                    Hari ini ·{' '}
                    {sales.length === 0 ? (
                        'belum ada transaksi'
                    ) : (
                        <>
                            {active} transaksi ·{' '}
                            <span className="font-mono">{formatRp(total)}</span>
                        </>
                    )}
                </span>
                {/* Tanpa panah saat kosong — tombol nonaktif tidak boleh terlihat bisa dibuka. */}
                {sales.length > 0 && (
                    <ChevronDown className="transition-transform group-data-[panel-open]:rotate-180" />
                )}
            </CollapsibleTrigger>
            <CollapsibleContent>
                <ul className="flex flex-col divide-y border-t text-sm">
                    {sales.map((s) => {
                        const receipt = toReceipt(s);
                        return (
                            <li
                                key={s.id}
                                className={`flex items-center gap-2 px-4 py-2 ${s.cancelled ? 'opacity-60' : ''}`}
                            >
                                <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">
                                    {s.time ?? '—'}
                                </span>
                                <span
                                    className="min-w-0 flex-1 truncate"
                                    title={s.items_summary}
                                >
                                    <span className="font-mono text-xs">
                                        {s.number}
                                    </span>{' '}
                                    <span className="text-muted-foreground">
                                        {s.items_summary}
                                    </span>
                                </span>
                                {s.cancelled ? (
                                    <Badge variant="secondary">Batal</Badge>
                                ) : (
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                        {s.methods
                                            .map((m) => PAYMENT_METHOD_LABEL[m])
                                            .join(' + ')}
                                    </span>
                                )}
                                <span className="w-24 shrink-0 text-right font-mono">
                                    {formatRp(s.total)}
                                </span>
                                {receipt ? (
                                    <Button
                                        size="icon-sm"
                                        variant="ghost"
                                        aria-label={`Buka struk ${s.number}`}
                                        onClick={() => onOpenReceipt(receipt)}
                                    >
                                        <ReceiptIcon />
                                    </Button>
                                ) : (
                                    <span className="size-8 shrink-0" />
                                )}
                            </li>
                        );
                    })}
                </ul>
                <p className="border-t px-4 py-2 text-xs text-muted-foreground">
                    Menampilkan 50 transaksi terbaru hari ini. Semua order ada
                    di{' '}
                    <Link
                        href={ordersIndex()}
                        className="underline underline-offset-4"
                    >
                        Order & Booking
                    </Link>
                    .
                </p>
            </CollapsibleContent>
        </Collapsible>
    );
}
