/**
 * Invoice untuk customer — dibuka dari link WhatsApp (signed URL, tanpa
 * login) atau dari tombol Cetak / PDF owner. Tanpa layout admin: ini dokumen,
 * bukan layar aplikasi. Cetak memakai dialog print browser — tidak perlu
 * layanan PDF terpisah.
 *
 * Order retail tampil sebagai STRUK (spek 2.2): judul "Struk" dan lebar
 * cetak 80 mm untuk printer thermal. Nomornya tetap INV- (satu penomoran).
 */

import { Head } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    InvoiceDocument,
    documentTitle,
} from '@/modules/order/components/invoice-document';
import type {
    Invoice,
    Studio,
} from '@/modules/order/components/invoice-document';

export default function InvoicePublic({
    invoice,
    studio,
    auto_print,
}: {
    invoice: Invoice;
    studio: Studio;
    /** true hanya dari `print_url` (ditandatangani dengan print=1). */
    auto_print: boolean;
}) {
    const retail = invoice.business_line === 'retail';

    // Sekali saat dimuat — tombol Cetak dari ReceiptSheet membuka print_url.
    useEffect(() => {
        if (auto_print) window.print();
    }, [auto_print]);

    return (
        <>
            <Head
                title={`${documentTitle(invoice.business_line)} ${invoice.number} — ${studio.name}`}
            />
            {/* @page tidak bisa per-elemen lewat Tailwind — inline, hanya retail.
                Non-retail tetap ukuran kertas default browser (A4). */}
            {retail && (
                <style>{'@page { size: 80mm auto; margin: 4mm }'}</style>
            )}
            <main
                className={`mx-auto flex min-h-svh max-w-2xl flex-col gap-4 bg-background p-4 sm:p-8 print:p-0 ${retail ? 'print:max-w-[72mm]' : ''}`}
            >
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
