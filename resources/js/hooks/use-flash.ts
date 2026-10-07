import { router } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';

/**
 * Ambil `flash[key]` dari event `flash` Inertia. Dipisah dari hook supaya
 * bisa dites tanpa DOM.
 */
export function flashValue<T>(event: Event, key: string): T | undefined {
    const flash: unknown = (event as CustomEvent).detail?.flash;
    if (typeof flash !== 'object' || flash === null || !(key in flash)) {
        return undefined;
    }
    return (flash as Record<string, T>)[key];
}

/**
 * Payload flash sekali-tampil (mis. `receipt`) sebagai state lokal.
 *
 * Flash Inertia 3 datang lewat event `router.on('flash')`, bukan
 * `usePage().props` — tanpa state, Sheet yang membacanya tertutup lagi begitu
 * event lewat. Pola sama dengan `use-flash-toast.ts`, yang tetap terpisah
 * (toast global, ini per halaman).
 */
export function useFlash<T>(key: string): [T | null, () => void] {
    const [value, setValue] = useState<T | null>(null);

    useEffect(
        () =>
            router.on('flash', (event) => {
                const v = flashValue<T>(event, key);
                if (v !== undefined) setValue(v);
            }),
        [key],
    );

    const clear = useCallback(() => setValue(null), []);

    return [value, clear];
}
