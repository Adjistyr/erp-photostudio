import { Breadcrumbs } from '@/components/breadcrumbs';
import { NavUser } from '@/components/nav-user';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

/**
 * Header halaman — DESIGN.md R8: bar 64px di atas kanvas (tanpa garis bawah),
 * breadcrumb kiri, chip profil kanan. Aksi utama halaman ada di
 * `PageHeader actions` (components/page.tsx), bukan di bar ini.
 *
 * Tidak sticky: POS (mobile) dan form katalog/aset punya elemen `sticky top-*`
 * sendiri yang akan tergelincir ke bawah header.
 *
 * Tombol buka menu hanya di mobile: di desktop rail punya tombol
 * ringkas/lebarkan sendiri (NavRailToggle).
 */
export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    return (
        <header className="flex h-16 shrink-0 items-center gap-3 px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-2">
                <SidebarTrigger className="-ml-1 bg-card md:hidden" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <div className="ml-auto flex items-center gap-3">
                <NavUser />
            </div>
        </header>
    );
}
