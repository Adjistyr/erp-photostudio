import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';

/**
 * Ringkas/lebarkan rail di desktop (padanan "sematkan" master-outlet).
 * Statusnya disimpan Sidebar di cookie `sidebar_state`, jadi server sudah
 * merender lebar yang benar; Ctrl/⌘+B tetap berlaku. Di mobile rail adalah
 * Sheet yang ditutup dengan tap di luar, jadi tombol ini tidak dirender.
 */
export function NavRailToggle() {
    const { state, isMobile, toggleSidebar } = useSidebar();

    if (isMobile) {
        return null;
    }

    const collapsed = state === 'collapsed';
    const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
    const label = collapsed ? 'Lebarkan menu' : 'Ringkas menu';

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                    onClick={toggleSidebar}
                    tooltip={{ children: label }}
                    aria-label={label}
                    className="h-10 gap-3 rounded-[20px] px-[11px] text-muted-foreground group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-3!"
                >
                    <Icon />
                    <span>{label}</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
