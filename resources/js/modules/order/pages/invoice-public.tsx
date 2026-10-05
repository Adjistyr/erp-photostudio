/**
 * Invoice untuk customer — dibuka dari link WhatsApp (signed URL, tanpa
 * login) atau dari tombol Cetak / PDF owner. Tanpa layout admin: ini dokumen,
 * bukan layar aplikasi. Cetak memakai dialog print browser — tidak perlu
 * layanan PDF terpisah.
 */

import { Head } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InvoiceDocument } from '@/modules/order/components/invoice-document';
import type {
    Invoice,
    Studio,
} from '@/modules/order/components/invoice-document';

export default function InvoicePublic({
    invoice,
    studio,
}: {
    invoice: Invoice;
    studio: Studio;
}) {
    return (
        <>
            <Head title={`${invoice.number} — ${studio.name}`} />
            <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-4 bg-background p-4 sm:p-8 print:p-0">
                <InvoiceDocument invoice={invoice} studio={studio} />
                <Button
                    variant="outline"
                    className="self-end print:hidden"
                    onClick={() => window.print()}
                >
                    <Printer data-icon="inline-start" />
                    Cetak / Simpan PDF
                </Button>
            </main>
        </>
    );
}
