import { useFlashToast } from '@/hooks/use-flash-toast';
import { useAppearance } from '@/hooks/use-appearance';
import {
    CircleCheckIcon,
    InfoIcon,
    Loader2Icon,
    OctagonXIcon,
    TriangleAlertIcon,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

// Sonner membaca palet dari custom property ini. Diketik sebagai custom
// property, bukan di-cast, supaya nama yang salah eja jadi error tipe.
type SonnerVariables = CSSProperties & Record<`--${string}`, string>;

const THEME: SonnerVariables = {
    // Warna panel yang sama dengan Card/Panel: satu warna permukaan.
    '--normal-bg': 'var(--card)',
    '--normal-text': 'var(--card-foreground)',
    '--normal-border': 'var(--border)',
    // `--radius-2xl` hidup di `@theme inline` yang di-inline Tailwind ke
    // utility, tidak di-emit sebagai variabel — jadi aritmetikanya diulang.
    '--border-radius': 'calc(var(--radius) * 1.8)',
};

function Toaster(props: ToasterProps) {
    const { appearance } = useAppearance();

    useFlashToast();

    return (
        <Sonner
            theme={appearance}
            position="bottom-right"
            // Dibacakan sebagai nama region; bawaan sonner berbahasa Inggris.
            containerAriaLabel="Notifikasi"
            className="toaster group"
            icons={{
                success: <CircleCheckIcon className="size-4 text-success" />,
                info: <InfoIcon className="size-4" />,
                warning: <TriangleAlertIcon className="size-4 text-warning" />,
                error: <OctagonXIcon className="size-4 text-destructive" />,
                loading: <Loader2Icon className="size-4 animate-spin" />,
            }}
            style={THEME}
            toastOptions={{
                classNames: {
                    toast: 'font-sans shadow-lg',
                    title: 'text-sm font-medium',
                    description: 'text-[13px] text-muted-foreground!',
                    actionButton: 'rounded-full! px-3! font-semibold!',
                },
            }}
            {...props}
        />
    );
}

export { Toaster };
