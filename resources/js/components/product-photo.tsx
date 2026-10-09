/**
 * Sampul item katalog (spek 7.1) — POS dan daftar Katalog. Tanpa foto: ikon
 * pengganti dengan ukuran sama, supaya grid/baris tetap rata.
 *
 * `alt` kosong: nama item selalu tertulis di sebelahnya.
 */

import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProductPhoto({
    url,
    className,
}: {
    url: string | null | undefined;
    className?: string;
}) {
    if (!url) {
        return (
            <div
                aria-hidden
                className={cn(
                    'flex shrink-0 items-center justify-center bg-muted text-muted-foreground',
                    className,
                )}
            >
                <ImageIcon className="size-1/3 max-h-8 max-w-8" />
            </div>
        );
    }
    return (
        <img
            src={url}
            alt=""
            loading="lazy"
            className={cn('shrink-0 bg-muted object-cover', className)}
        />
    );
}
