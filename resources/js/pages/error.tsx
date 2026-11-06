/**
 * Halaman error (403/404, dan 500/503 di produksi) — dirender lewat
 * `Inertia::handleExceptionsUsing()` di AppServiceProvider. Tanpa layout app:
 * bisa dibuka tamu (link invoice rusak) yang tidak punya sidebar/akun.
 */

import { Head, Link, usePage } from '@inertiajs/react';
import AuthSimpleLayout from '@/layouts/auth/auth-simple-layout';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';

export const ERROR_TEXT: Record<
    number,
    { title: string; description: string }
> = {
    403: {
        title: 'Akses tidak diizinkan',
        description:
            'Halaman ini hanya untuk owner, atau link yang dibuka sudah tidak berlaku. Minta link terbaru bila ini invoice.',
    },
    404: {
        title: 'Halaman tidak ditemukan',
        description: 'Alamatnya salah atau datanya sudah dihapus.',
    },
    500: {
        title: 'Terjadi kesalahan',
        description:
            'Ada masalah di server. Coba lagi beberapa saat lagi; data yang sudah tersimpan aman.',
    },
    503: {
        title: 'Sedang perawatan',
        description:
            'Aplikasi sedang diperbarui. Coba lagi beberapa menit lagi.',
    },
};

export default function ErrorPage({ status }: { status: number }) {
    const { auth } = usePage().props;
    const text = ERROR_TEXT[status] ?? ERROR_TEXT[500];

    return (
        <>
            <Head title={text.title} />
            <AuthSimpleLayout title={text.title} description={text.description}>
                <div className="flex flex-col gap-2">
                    {/* Tamu (customer dari link invoice) tidak punya dashboard. */}
                    {auth.user && (
                        <Button
                            nativeButton={false}
                            render={<Link href={dashboard()} />}
                        >
                            Ke Dashboard
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        onClick={() => window.history.back()}
                    >
                        Kembali
                    </Button>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                    Kode {status}
                </p>
            </AuthSimpleLayout>
        </>
    );
}
