import { useState } from 'react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { PageActionsSlot } from '@/components/page-actions';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null);

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="min-w-0 overflow-x-clip">
                <AppSidebarHeader
                    breadcrumbs={breadcrumbs}
                    actionsRef={setActionsSlot}
                />
                <PageActionsSlot value={actionsSlot}>
                    {children}
                </PageActionsSlot>
            </AppContent>
        </AppShell>
    );
}
