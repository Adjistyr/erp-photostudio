import { usePage } from '@inertiajs/react';

import AppLogoIcon from '@/components/app-logo-icon';

/**
 * Chip merek: lingkaran `--brand` + nama studio. Dipakai di kepala sidebar
 * dan halaman auth; isi lingkaran berubah lewat AppLogoIcon saja.
 */
export default function AppLogo() {
    const { name } = usePage().props;

    return (
        <>
            <span className="grid size-9 flex-none place-items-center rounded-full bg-brand text-brand-foreground">
                <AppLogoIcon className="size-[18px]" />
            </span>
            <span className="flex min-w-0 flex-col gap-1 text-left">
                <span className="truncate text-[15px] leading-none font-extrabold">
                    {name}
                </span>
                <span className="truncate text-[11px] leading-none font-semibold text-muted-foreground uppercase">
                    ERP Studio Foto
                </span>
            </span>
        </>
    );
}
