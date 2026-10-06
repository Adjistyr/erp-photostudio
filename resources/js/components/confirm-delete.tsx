/**
 * Hapus salah catat (keputusan owner 2026-10-06): hapus lalu catat ulang,
 * bukan edit. Selalu lewat AlertDialog (R9) yang menyebut akibatnya.
 *
 * Dialog dikontrol sendiri: tetap terbuka kalau server menolak (mis. bulan
 * sudah tutup buku) supaya alasannya terbaca, tertutup kalau berhasil.
 */

import { useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export function ConfirmDelete({
    url,
    title,
    description,
    label,
}: {
    url: string;
    title: string;
    description: string;
    /** Nama yang dihapus, untuk aria-label tombol ikon. */
    label: string;
}) {
    const [open, setOpen] = useState(false);
    const form = useForm({});
    // Error hapus berkunci `delete` (OpenPeriod::ensureOpen, aturan setoran).
    const errors: Record<string, string | undefined> = form.errors;

    return (
        <AlertDialog
            open={open}
            onOpenChange={(o) => {
                setOpen(o);
                if (!o) form.clearErrors();
            }}
        >
            <AlertDialogTrigger
                render={
                    <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Hapus ${label}`}
                        onClick={(e) => e.stopPropagation()}
                    />
                }
            >
                <Trash2 />
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description} Kalau salah catat, catat ulang setelah
                        dihapus.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <InputError message={errors.delete} />
                <AlertDialogFooter>
                    <AlertDialogCancel render={<Button variant="outline" />}>
                        Batal
                    </AlertDialogCancel>
                    <AlertDialogAction
                        variant="destructive"
                        disabled={form.processing}
                        onClick={() =>
                            form.delete(url, {
                                preserveScroll: true,
                                onSuccess: () => setOpen(false),
                            })
                        }
                    >
                        Hapus
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
