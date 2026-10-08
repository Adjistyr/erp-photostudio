/**
 * Navigasi halaman untuk daftar server-side (spek 3.1). Tombol ‹ › sebagai
 * Link Inertia; disembunyikan bila hanya satu halaman.
 */

import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Bentuk paginasi dari ListQuery::paginated() di server. */
export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
}

export function pageLabel(current: number, last: number): string {
    return `Hal. ${current} dari ${last}`;
}

export function Pagination({
    page,
    noun,
    href,
}: {
    page: Pick<Paginated<unknown>, 'current_page' | 'last_page' | 'total'>;
    noun: string;
    href: (page: number) => string;
}) {
    if (page.last_page <= 1) return null;
    const prev = page.current_page - 1;
    const next = page.current_page + 1;

    return (
        <nav
            aria-label="Halaman"
            className="flex items-center justify-end gap-2 text-sm"
        >
            <span className="text-muted-foreground">
                {pageLabel(page.current_page, page.last_page)} · {page.total}{' '}
                {noun}
            </span>
            {/* Link, bukan tombol berstate: halaman ada di URL, tombol kembali browser berfungsi. */}
            <Button
                size="icon-sm"
                variant="outline"
                aria-label="Halaman sebelumnya"
                disabled={prev < 1}
                nativeButton={false}
                render={<Link href={href(Math.max(1, prev))} preserveScroll />}
            >
                <ChevronLeft />
            </Button>
            <Button
                size="icon-sm"
                variant="outline"
                aria-label="Halaman berikutnya"
                disabled={next > page.last_page}
                nativeButton={false}
                render={
                    <Link
                        href={href(Math.min(page.last_page, next))}
                        preserveScroll
                    />
                }
            >
                <ChevronRight />
            </Button>
        </nav>
    );
}
