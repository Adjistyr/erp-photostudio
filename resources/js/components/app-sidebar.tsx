import { Link } from '@inertiajs/react';
import {
    CalendarDays,
    ChartColumn,
    FileText,
    HandCoins,
    LayoutDashboard,
    MessageSquare,
    Package,
    Receipt,
    ShoppingCart,
    Users,
    Wallet,
    Wrench,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavRailToggle } from '@/components/nav-rail-toggle';
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
import { index as capitalIndex } from '@/routes/capital';
import { index as communicationIndex } from '@/routes/communication';
import { index as catalogIndex } from '@/routes/catalog';
import { index as customersIndex } from '@/routes/customers';
import { index as expensesIndex } from '@/routes/expenses';
import { index as invoicesIndex } from '@/routes/invoices';
import { index as ordersIndex } from '@/routes/orders';
import { index as posIndex } from '@/routes/pos';
import { index as receivablesIndex } from '@/routes/receivables';
import { profitLoss as reportsIndex } from '@/routes/reports';
import { useCan } from '@/hooks/use-can';
import type { Can, NavGroup } from '@/types';

/**
 * Tiga grup DESIGN.md R8. Grup kosong disembunyikan oleh NavMain — modul
 * menambahkan itemnya di sini saat dibangun. Menu terlarang tidak tampil
 * (spek 5.1): 403 hanya terjadi lewat URL manual.
 */
export function navGroupsFor(can: Pick<Can, 'view_finance'>): NavGroup[] {
    return [
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
            items: [
                // Urutan R8: Invoice, Komunikasi, Laporan, Modal & Bagi Hasil.
                { title: 'Invoice', href: invoicesIndex(), icon: FileText },
                {
                    title: 'Komunikasi',
                    href: communicationIndex(),
                    icon: MessageSquare,
                },
                // Laporan & Modal hanya owner (`view-finance`).
                ...(can.view_finance
                    ? [
                          {
                              title: 'Laporan',
                              href: reportsIndex(),
                              icon: ChartColumn,
                          },
                          // Setelah Laporan: dibuka sebulan sekali, setelah laba rugi dibaca.
                          {
                              title: 'Modal & Bagi Hasil',
                              href: capitalIndex(),
                              icon: HandCoins,
                          },
                      ]
                    : []),
            ],
        },
    ];
}

/**
 * Rail menu ala master-outlet: panel putih membulat yang melayang di atas
 * kanvas, chip merek di atas, tombol ringkas/lebarkan di bawah. Profil pindah
 * ke header (NavUser). Mobile tetap Sheet bawaan Sidebar.
 */
export function AppSidebar() {
    const can = useCan();

    return (
        <Sidebar collapsible="icon" variant="floating">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            className="h-12 gap-2.5 rounded-full px-1.5 group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-0.5!"
                            render={<Link href={dashboard()} prefetch />}
                        >
                            <AppLogo />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain groups={navGroupsFor(can)} />
            </SidebarContent>

            <SidebarFooter>
                <NavRailToggle />
            </SidebarFooter>
        </Sidebar>
    );
}
