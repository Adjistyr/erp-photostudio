import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import Heading from '@/components/heading';
import { Panel } from '@/components/page';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profil',
        href: edit(),
        icon: null,
    },
    {
        title: 'Keamanan',
        href: editSecurity(),
        icon: null,
    },
    {
        title: 'Tampilan',
        href: editAppearance(),
        icon: null,
    },
];

/**
 * Pengaturan akun: navigasi pil (mendatar di mobile, tegak di desktop) +
 * isi di Panel putih. Judulnya h2 lewat Heading — tiap halaman pengaturan
 * sudah punya h1 sr-only sendiri.
 */
export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="p-4 md:p-6">
            <Heading
                title="Pengaturan"
                description="Kelola profil dan pengaturan akun"
            />

            <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                <nav
                    className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-card p-1.5 lg:w-52 lg:flex-none lg:flex-col lg:rounded-3xl lg:p-2"
                    aria-label="Pengaturan"
                >
                    {sidebarNavItems.map((item, index) => {
                        const active = isCurrentOrParentUrl(item.href);

                        return (
                            <Link
                                key={`${toUrl(item.href)}-${index}`}
                                href={item.href}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    'flex h-9 shrink-0 items-center rounded-full px-4 text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                    active
                                        ? 'bg-primary font-medium text-primary-foreground'
                                        : 'hover:bg-muted',
                                )}
                            >
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>

                <Panel label="Isi pengaturan" className="flex-1 md:max-w-2xl">
                    <section className="flex max-w-xl flex-col gap-12">
                        {children}
                    </section>
                </Panel>
            </div>
        </div>
    );
}
