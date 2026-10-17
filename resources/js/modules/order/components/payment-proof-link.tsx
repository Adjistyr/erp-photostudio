/**
 * Ikon klip ke bukti transfer/QRIS (spek 6.7). URL bertanda tangan 10 menit
 * dari server — dibuka di tab baru (gambar/PDF langsung). Tanpa bukti = tidak
 * dirender oleh pemanggil.
 */

import { Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PaymentProofLink({
    url,
    label,
}: {
    url: string;
    label: string;
}) {
    return (
        <Button
            size="icon-sm"
            variant="ghost"
            aria-label={label}
            title={label}
            render={<a href={url} target="_blank" rel="noopener noreferrer" />}
            nativeButton={false}
        >
            <Paperclip />
        </Button>
    );
}
