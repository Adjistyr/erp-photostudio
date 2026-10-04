import { Link } from '@inertiajs/react';
import { LayoutDashboard, Package, Users } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { index as catalogIndex } from '@/routes/catalog';
import { index as customersIndex } from '@/routes/customers';
import type { NavGroup } from '@/types';

/**
 * Tiga grup DESIGN.md R8. Grup kosong disembunyikan oleh NavMain — modul
 * menambahkan itemnya di sini saat dibangun.
 */
const navGroups: NavGroup[] = [
    {
        label: 'Harian',
        items: [
            {
                title: 'Dashboard',
                href: dashboard(),
                icon: LayoutDashboard,
            },
        ],
    },
    {
        label: 'Data',
        // Urutan R8: Customer, Katalog, Biaya.
        items: [
            { title: 'Customer', href: customersIndex(), icon: Users },
            { title: 'Katalog', href: catalogIndex(), icon: Package },
        ],
    },
    { label: 'Keluaran', items: [] },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            render={<Link href={dashboard()} prefetch />}
                        >
                            <AppLogo />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain groups={navGroups} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
