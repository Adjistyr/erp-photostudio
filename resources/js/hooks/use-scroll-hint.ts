import { useEffect, useRef } from 'react';

/**
 * Sisi yang masih bisa digeser pada baris mendatar: `start`, `end`, `both`,
 * atau `none`. Toleransi 1px — scrollLeft pecahan di layar retina.
 */
export function scrollHint(
    scrollLeft: number,
    clientWidth: number,
    scrollWidth: number,
): 'none' | 'start' | 'end' | 'both' {
    const kiri = scrollLeft > 1;
    const kanan = scrollLeft + clientWidth < scrollWidth - 1;
    if (kiri && kanan) return 'both';
    if (kiri) return 'start';
    if (kanan) return 'end';
    return 'none';
}

/**
 * Tanda "masih ada lanjutan" untuk baris tab/pil yang digeser di layar sempit
 * (scrollbar disembunyikan): set `data-scroll-hint` pada elemen, dan CSS di
 * app.css memudarkan tepi yang masih bisa digeser.
 *
 * JS, bukan CSS murni: scroll-driven animation belum ada di Safari iOS lama,
 * dan fade statis selalu memotong ujung walau barisnya muat.
 */
export function useScrollHint<T extends HTMLElement>() {
    const ref = useRef<T>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const update = () => {
            el.dataset.scrollHint = scrollHint(
                el.scrollLeft,
                el.clientWidth,
                el.scrollWidth,
            );
        };
        update();
        el.addEventListener('scroll', update, { passive: true });
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => {
            el.removeEventListener('scroll', update);
            ro.disconnect();
        };
    }, []);

    return ref;
}
