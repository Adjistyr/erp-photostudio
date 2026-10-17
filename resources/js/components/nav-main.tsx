import { Link } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import type { NavGroup } from '@/types';

/**
 * localStorage berisi grup yang DITUTUP, bukan yang dibuka: semua grup mulai
 * terbuka, jadi grup yang ditambahkan nanti muncul terbuka alih-alih
 * tersembunyi di balik preferensi yang tidak pernah diatur siapa pun.
 */
const CLOSED_GROUPS_KEY = 'pt.nav.groups.closed';

function readClosedGroups(): string[] {
    try {
        const parsed: unknown = JSON.parse(
            window.localStorage.getItem(CLOSED_GROUPS_KEY) ?? '[]',
        );

        return Array.isArray(parsed)
            ? parsed.filter(
                  (label): label is string => typeof label === 'string',
              )
            : [];
    } catch {
        // Storage dimatikan atau nilainya rusak: semua grup terbuka.
        return [];
    }
}

function writeClosedGroups(labels: string[]): void {
    try {
        window.localStorage.setItem(CLOSED_GROUPS_KEY, JSON.stringify(labels));
    } catch {
        // Kehilangan preferensi tampilan tidak merusak apa pun.
    }
}

/**
 * Menu sidebar berkelompok (DESIGN.md R8). Grup tanpa item disembunyikan —
 * modul yang belum dibangun tidak tampil sebagai label kosong. Judul grup
 * bisa dibuka/tutup saat sidebar lebar; saat ringkas (ikon saja) tidak ada
 * tempat untuk judul, jadi semua item tampil dan garis tipis menandai awal
 * tiap grup.
 */
export function NavMain({ groups }: { groups: NavGroup[] }) {
    const { currentUrl, isCurrentOrParentUrl } = useCurrentUrl();
    const { state, isMobile } = useSidebar();
    const iconOnly = state === 'collapsed' && !isMobile;
    const terisi = groups.filter((group) => group.items.length > 0);

    // Masuk ke sebuah grup membukanya — saat load dan tiap navigasi — supaya
    // grup tertutup tidak pernah menyembunyikan posisi sekarang. Disesuaikan
    // saat render (alternatif React untuk effect reset) dan tidak ditulis
    // balik: yang ditutup manual tetap tertutup di halaman lain.
    const activeGroup = terisi.find((group) =>
        group.items.some((item) => isCurrentOrParentUrl(item.href)),
    )?.label;
    const [closed, setClosed] = useState<string[]>(() =>
        readClosedGroups().filter((label) => label !== activeGroup),
    );
    const [openedFor, setOpenedFor] = useState(currentUrl);

    if (currentUrl !== openedFor) {
        setOpenedFor(currentUrl);

        if (activeGroup && closed.includes(activeGroup)) {
            setClosed(closed.filter((label) => label !== activeGroup));
        }
    }

    const toggleGroup = (label: string) => {
        const next = closed.includes(label)
            ? closed.filter((other) => other !== label)
            : [...closed, label];
        setClosed(next);
        writeClosedGroups(next);
    };

    return (
        <>
            {terisi.map((group, i) => (
                <Collapsible
                    key={group.label}
                    open={iconOnly || !closed.includes(group.label)}
                    onOpenChange={() => toggleGroup(group.label)}
                    render={<SidebarGroup className="px-2 py-0" />}
                >
                    {iconOnly && i > 0 && <SidebarSeparator className="mb-2" />}
                    {iconOnly ? (
                        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                    ) : (
                        <SidebarGroupLabel
                            render={<CollapsibleTrigger />}
                            className="group/label h-8 justify-between rounded-lg px-[11px] text-[11px] font-semibold tracking-wide text-muted-foreground uppercase hover:bg-sidebar-accent"
                        >
                            {group.label}
                            <ChevronDown
                                aria-hidden
                                className="size-3.5 -rotate-90 transition-transform group-data-panel-open/label:rotate-0"
                            />
                        </SidebarGroupLabel>
                    )}
                    <CollapsibleContent>
                        <SidebarGroupContent>
                            <SidebarMenu className="gap-0.5">
                                {group.items.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            // Sub-halaman (/orders/calendar, /reports/margin) ikut
                                            // menyalakan menu induknya.
                                            isActive={isCurrentOrParentUrl(
                                                item.href,
                                            )}
                                            tooltip={{ children: item.title }}
                                            className={cn(
                                                'h-10 gap-3 rounded-[20px] px-[11px]',
                                                'data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground data-active:hover:bg-sidebar-primary data-active:hover:text-sidebar-primary-foreground',
                                                'group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-3!',
                                            )}
                                            render={
                                                <Link
                                                    href={item.href}
                                                    prefetch
                                                />
                                            }
                                        >
                                            {item.icon && <item.icon />}
                                            <span>{item.title}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </CollapsibleContent>
                </Collapsible>
            ))}
        </>
    );
}
