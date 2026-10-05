import { Link } from '@inertiajs/react';
import {
    CalendarDays,
    ChartColumn,
    LayoutDashboard,
    Package,
    Receipt,
    ShoppingCart,
    Users,
    Wallet,
    Wrench,
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
import { index as assetsIndex } from '@/routes/assets';
import { index as catalogIndex } from '@/routes/catalog';
import { index as customersIndex } from '@/routes/customers';
import { index as expensesIndex } from '@/routes/expenses';
import { index as ordersIndex } from '@/routes/orders';
import { index as posIndex } from '@/routes/pos';
import { index as receivablesIndex } from '@/routes/receivables';
import { profitLoss as reportsIndex } from '@/routes/reports';
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
                title: 'POS',
                href: posIndex(),
                icon: ShoppingCart,
            },
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
            // Data master alat — dirujuk setiap ada servis.
            {
                title: 'Aset & Maintenance',
                href: assetsIndex(),
                icon: Wrench,
            },
        ],
    },
    {
        label: 'Keluaran',
        items: [{ title: 'Laporan', href: reportsIndex(), icon: ChartColumn }],
    },
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
