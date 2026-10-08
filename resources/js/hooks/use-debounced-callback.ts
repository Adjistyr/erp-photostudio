import { useEffect, useRef } from 'react';

/**
 * Panggil `fn` setelah `delay` ms tanpa panggilan baru — untuk input cari
 * yang memicu request server (spek 3.1). Panggilan terakhir yang menang;
 * timer dibersihkan saat komponen dilepas.
 */
export function useDebouncedCallback<A extends unknown[]>(
    fn: (...args: A) => void,
    delay = 300,
): (...args: A) => void {
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latest = useRef(fn);
    latest.current = fn;

    useEffect(
        () => () => {
            if (timer.current) clearTimeout(timer.current);
        },
        [],
    );

    return (...args: A) => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => latest.current(...args), delay);
    };
}
