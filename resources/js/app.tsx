import { createInertiaApp } from '@inertiajs/react';
import type { ResolvedComponent } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    // Halaman app (auth, settings, dashboard) di ./pages; halaman domain di
    // ./modules/<modul>/pages dengan nama "<modul>::<halaman>" — sama dengan
    // Inertia::render() di controller Modules/<Modul>. Ditulis sendiri karena
    // resolver bawaan plugin @inertiajs/vite hanya memindai satu folder
    // (plugin otomatis mundur kalau `resolve` sudah ada).
    resolve: async (name) => {
        const page = await resolvePageComponent(
            name.includes('::')
                ? `./modules/${name.replace('::', '/pages/')}.tsx`
                : `./pages/${name}.tsx`,
            import.meta.glob<{ default: ResolvedComponent }>([
                './pages/**/*.tsx',
                './modules/*/pages/**/*.tsx',
            ]),
        );

        return page.default;
    },
    layout: (name) => {
        switch (true) {
            // Dokumen untuk customer (tanpa login) — tanpa sidebar admin.
            case name === 'welcome' || name === 'order::invoice-public':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delay={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
