import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Primitif tata letak halaman (DESIGN.md "Konvensi halaman"), diadaptasi dari
 * master-outlet: judul besar di atas kanvas hangat, isi di panel putih
 * membulat. Layar menyusun ini alih-alih mengulang jarak dan radius, jadi
 * perubahan tampilan cukup satu edit di sini, bukan satu per layar.
 */

type PageHeaderProps = {
    title: ReactNode;
    description?: ReactNode;
    /** Tombol di kanan; turun ke bawah judul di layar sempit. */
    actions?: ReactNode;
    /** Badge atau metadata di samping judul (status, lini). */
    meta?: ReactNode;
};

export function PageHeader({
    title,
    description,
    actions,
    meta,
}: PageHeaderProps) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex min-w-0 flex-1 basis-full flex-col gap-1 sm:basis-auto">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h1 className="text-[28px] leading-[1.15] font-medium tracking-[-0.02em] md:text-[34px]">
                        {title}
                    </h1>
                    {meta}
                </div>
                {description ? (
                    <p className="text-[15px] leading-normal text-muted-foreground">
                        {description}
                    </p>
                ) : null}
            </div>
            {actions ? (
                <div className="flex flex-wrap gap-2.5">{actions}</div>
            ) : null}
        </div>
    );
}

type PanelProps = {
    title?: ReactNode;
    /** Sisi kanan kepala panel: jumlah, tautan, aksi kecil. */
    aside?: ReactNode;
    children: ReactNode;
    className?: string;
    /** Isi tanpa padding, untuk tabel dan daftar yang menempel ke tepi. */
    flush?: boolean;
    /** Nama `<section>` untuk pembaca layar bila tidak ada judul terlihat. */
    label?: string;
};

export function Panel({
    title,
    aside,
    children,
    className,
    flush,
    label,
}: PanelProps) {
    return (
        <section
            aria-label={title ? undefined : label}
            className={cn(
                'flex min-w-0 flex-col overflow-hidden rounded-3xl bg-card text-card-foreground',
                className,
            )}
        >
            {title || aside ? (
                <div className="flex items-center justify-between gap-2.5 border-b px-[18px] py-3.5">
                    {title ? (
                        <h2 className="flex items-center gap-2 text-lg leading-tight font-medium tracking-[-0.01em]">
                            {title}
                        </h2>
                    ) : (
                        <span />
                    )}
                    {aside ? (
                        <div className="text-xs text-muted-foreground">
                            {aside}
                        </div>
                    ) : null}
                </div>
            ) : null}
            <div className={cn(!flush && 'px-[18px] py-4')}>{children}</div>
        </section>
    );
}

/** Strip petunjuk abu-abu untuk catatan read-only dan cakupan data. */
export function Notice({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <p
            className={cn(
                'rounded-2xl bg-muted px-4 py-2.5 text-xs text-muted-foreground',
                className,
            )}
        >
            {children}
        </p>
    );
}
