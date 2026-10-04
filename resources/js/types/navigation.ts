import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';

export type BreadcrumbItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
};

export type NavItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
};

/**
 * Grup menu sidebar — DESIGN.md R8: Harian / Data / Keluaran. Urutan item
 * di dalam grup mengikuti frekuensi pakai harian, bukan nomor modul.
 */
export type NavGroup = {
    label: string;
    items: NavItem[];
};
