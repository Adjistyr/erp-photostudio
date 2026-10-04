import { Link } from '@inertiajs/react';
import {
    CalendarDays,
    LayoutDashboard,
    Package,
    Receipt,
    Users,
    Wallet,
} from 'lucide-react';
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
import { index as expensesIndex } from '@/routes/expenses';
import { index as ordersIndex } from '@/routes/orders';
import { index as receivablesIndex } from '@/routes/receivables';
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
            // Urutan R8: Dashboard, POS, Order & Booking, Pembayaran.
            {
                title: 'Order & Booking',
                href: ordersIndex(),
                icon: CalendarDays,
            },
            {
                title: 'Pembayaran',
                href: receivablesIndex(),
                icon: Wallet,
            },
        ],
    },
    {
        label: 'Data',
        // Urutan R8: Customer, Katalog, Biaya.
        items: [
            { title: 'Customer', href: customersIndex(), icon: Users },
            { title: 'Katalog', href: catalogIndex(), icon: Package },
            { title: 'Biaya', href: expensesIndex(), icon: Receipt },
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
