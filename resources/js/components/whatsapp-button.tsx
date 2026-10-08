/**
 * Tombol ikon WhatsApp dengan pesan terisi — pengiriman tetap manual lewat
 * WhatsApp owner. Dipakai Pembayaran (tagih) dan Dashboard (reminder besok).
 *
 * Tanpa HP: tombol DINONAKTIFKAN dengan tooltip, bukan disembunyikan — admin
 * harus tahu kenapa tidak bisa dan ke mana melengkapinya.
 */

import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { waLink } from '@/modules/order/components/invoice-document';

export function WhatsAppButton({
    phone,
    message,
    label,
    urgent = false,
}: {
    phone: string | null;
    message: string;
    /** aria-label / title, mis. "Tagih ORD-0012 via WhatsApp". */
    label: string;
    /** Garis merah — prioritas (mis. tagihan lewat jatuh tempo). */
    urgent?: boolean;
}) {
    if (!phone) {
        return (
            <Tooltip>
                {/* Tombol disabled tidak memicu hover — tooltip di pembungkus. */}
                <TooltipTrigger render={<span tabIndex={0} />}>
                    <Button
                        size="icon-sm"
                        variant="outline"
                        disabled
                        aria-label={`${label} — belum ada nomor HP`}
                    >
                        <Send />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    Belum ada nomor HP — lengkapi di Customer
                </TooltipContent>
            </Tooltip>
        );
    }

    return (
        <Button
            size="icon-sm"
            variant="outline"
            className={urgent ? 'border-destructive text-destructive' : ''}
            aria-label={label}
            title={label}
            nativeButton={false}
            render={
                <a
                    href={waLink(phone, message)}
                    target="_blank"
                    rel="noreferrer"
                />
            }
        >
            <Send />
        </Button>
    );
}
