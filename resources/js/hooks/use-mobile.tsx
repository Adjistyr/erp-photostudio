import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;

const mql =
    typeof window === 'undefined'
        ? undefined
        : window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

function mediaQueryListener(callback: (event: MediaQueryListEvent) => void) {
    if (!mql) {
        return () => {};
    }

    mql.addEventListener('change', callback);

    return () => {
        mql.removeEventListener('change', callback);
    };
}

function isSmallerThanBreakpoint(): boolean {
    return mql?.matches ?? false;
}

function getServerSnapshot(): boolean {
    return false;
}

export function useIsMobile(): boolean {
    return useSyncExternalStore(
        mediaQueryListener,
        isSmallerThanBreakpoint,
        getServerSnapshot,
    );
}

/**
 * `true` bila viewport ≥ `px`. Untuk tata letak yang tidak cukup dengan kelas
 * CSS — mis. keranjang POS yang harus dirender SEKALI (inline atau di Sheet),
 * karena render ganda menggandakan id input. Aman dari flash: app tanpa SSR.
 */
export function useMinWidth(px: number): boolean {
    const query = `(min-width: ${px}px)`;
    return useSyncExternalStore(
        (callback) => {
            const m = window.matchMedia(query);
            m.addEventListener('change', callback);
            return () => m.removeEventListener('change', callback);
        },
        () => window.matchMedia(query).matches,
        () => true,
    );
}
