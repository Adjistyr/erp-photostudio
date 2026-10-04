import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Aksi utama halaman di kanan header (DESIGN.md R8).
 *
 * Portal, bukan prop layout: layout aplikasi persisten (dipasang sekali di
 * app.tsx), jadi tombol yang butuh state halaman — mis. "Tambah Item" yang
 * membuka dialog — tidak bisa dikirim lewat properti statis `Page.layout`.
 * Dengan portal tombol tetap bagian dari pohon halaman (state & handler
 * langsung), hanya DOM-nya yang dipindah ke slot di header.
 */
export const PageActionsSlot = createContext<HTMLElement | null>(null);

export function PageActions({ children }: { children: ReactNode }) {
    const slot = useContext(PageActionsSlot);

    return slot ? createPortal(children, slot) : null;
}
