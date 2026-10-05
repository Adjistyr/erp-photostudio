import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavGroup } from '@/types';

/**
 * Menu sidebar berkelompok (DESIGN.md R8). Grup tanpa item disembunyikan —
 * modul yang belum dibangun tidak tampil sebagai label kosong.
 */
export function NavMain({ groups }: { groups: NavGroup[] }) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const terisi = groups.filter((group) => group.items.length > 0);

    return (
        <>
            {terisi.map((group, i) => (
                <SidebarGroup key={group.label} className="px-2 py-0">
                    {i > 0 && <SidebarSeparator className="mb-2" />}
                    <SidebarGroupLabel className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                        {group.label}
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {group.items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        // Sub-halaman (/orders/calendar, /reports/margin) ikut
                                        // menyalakan menu induknya.
                                        isActive={isCurrentOrParentUrl(
                                            item.href,
                                        )}
                                        tooltip={{ children: item.title }}
                                        render={
                                            <Link href={item.href} prefetch />
                                        }
                                    >
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            ))}
        </>
    );
}
