/**
 * Pencocokan path untuk menu aktif. Dibandingkan PER SEGMEN, bukan
 * `startsWith` mentah — dengan startsWith, menu `/order` ikut menyala di
 * `/orderan` dan `/reports` di `/reports-archive`.
 */

/** "http://x/orders/?a=1#b" → "/orders". Root tetap "/". */
export function pathOf(url: string): string {
    const path = url.startsWith('http')
        ? new URL(url).pathname
        : url.split(/[?#]/)[0];
    const trimmed = path.replace(/\/+$/, '');

    return trimmed === '' ? '/' : trimmed;
}

/**
 * `current` adalah `path` itu sendiri atau halaman di bawahnya
 * (`/orders` ⊇ `/orders/calendar`). Root hanya cocok dengan root — kalau
 * tidak, menu "/" menyala di semua halaman.
 */
export function isWithinPath(path: string, current: string): boolean {
    const base = pathOf(path);
    const target = pathOf(current);

    if (base === '/') {
        return target === '/';
    }

    return target === base || target.startsWith(`${base}/`);
}
