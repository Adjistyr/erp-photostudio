import { usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';

/**
 * Chip profil di kanan header (master-outlet): inisial di lingkaran brand +
 * nama. Di layar sempit hanya inisialnya — header mobile juga memuat tombol
 * menu, breadcrumb, dan aksi halaman.
 */
export function NavUser() {
    const { auth } = usePage().props;
    const getInitials = useInitials();

    if (!auth.user) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className="flex shrink-0 items-center gap-2.5 rounded-full bg-card p-1 outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 data-popup-open:bg-muted md:py-1.5 md:pr-3 md:pl-1.5"
                data-test="sidebar-menu-button"
                aria-label={`Menu akun ${auth.user.name}`}
            >
                <span className="grid size-8 flex-none place-items-center rounded-full bg-brand/15 text-[13px] font-semibold text-brand md:size-9">
                    {getInitials(auth.user.name)}
                </span>
                <span className="hidden max-w-40 truncate text-sm font-semibold md:block">
                    {auth.user.name}
                </span>
                <ChevronDown
                    aria-hidden
                    className="hidden size-4 text-muted-foreground md:block"
                />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60" align="end">
                <UserMenuContent user={auth.user} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
