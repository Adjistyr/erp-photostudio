import type { UrlMethodPair } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { usePasskeyVerify } from '@laravel/passkeys/react';
import { KeyRound } from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';

type Props = {
    routes?: {
        options: UrlMethodPair;
        submit: UrlMethodPair;
    };
    label?: string;
    loadingLabel?: string;
    separator?: string;
};

export default function PasskeyVerify({
    routes,
    label,
    loadingLabel,
    separator,
}: Props = {}) {
    const { verify, isLoading, error, isSupported } = usePasskeyVerify({
        ...(routes && {
            routes: {
                options: routes.options.url,
                submit: routes.submit.url,
            },
        }),
        onSuccess: (response) => {
            router.visit(response.redirect ?? '/dashboard');
        },
    });

    if (!isSupported) {
        return null;
    }

    return (
        <>
            <div className="flex flex-col gap-2">
                <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={verify}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Spinner data-icon="inline-start" />
                    ) : (
                        <KeyRound data-icon="inline-start" />
                    )}
                    {isLoading
                        ? (loadingLabel ?? 'Memverifikasi...')
                        : (label ?? 'Masuk dengan passkey')}
                </Button>
                {error && (
                    <InputError message={error} className="text-center" />
                )}
            </div>

            {/* Dipakai di kartu auth (`bg-card`), jadi label menutup garis
                dengan warna kartu, bukan kanvas. Jarak cukup dari gap-6
                induknya. */}
            <div className="relative flex items-center justify-center">
                <Separator className="absolute inset-x-0 top-1/2" />
                <span className="relative bg-card px-2 text-xs text-muted-foreground uppercase">
                    {separator ?? 'Atau lanjut dengan email'}
                </span>
            </div>
        </>
    );
}
