import { Link } from '@inertiajs/react';
import AppLogo from '@/components/app-logo';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

/**
 * Halaman auth: chip merek di atas kanvas hangat, form di panel putih
 * membulat — bahasa visual yang sama dengan shell aplikasi.
 */
export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-background p-4 md:p-10">
            <div className="flex w-full max-w-sm flex-col gap-6">
                <Link
                    href={home()}
                    className="flex items-center gap-2.5 self-center rounded-full bg-card py-1.5 pr-4 pl-1.5"
                >
                    <AppLogo />
                </Link>

                <div className="flex flex-col gap-6 rounded-3xl bg-card p-6 md:p-8">
                    <div className="flex flex-col gap-1 text-center">
                        <h1 className="text-2xl leading-tight font-medium tracking-[-0.02em]">
                            {title}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
