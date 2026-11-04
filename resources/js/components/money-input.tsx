import { useLayoutEffect, useRef } from 'react';
import type { ComponentProps } from 'react';

import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from '@/components/ui/input-group';
import { formatRibuan, hanyaDigit } from '@/lib/format';
import { cn } from '@/lib/utils';

type MoneyInputProps = Omit<
    ComponentProps<'input'>,
    'value' | 'onChange' | 'type' | 'inputMode'
> & {
    /** Digit saja ("1500000") — bentuk yang dikirim ke server. */
    value: string;
    onValueChange: (digit: string) => void;
    /** Matikan bila satuan sudah tampil di sebelahnya (toggle Rp/%). */
    withPrefix?: boolean;
};

/**
 * Indeks di string bertitik tepat setelah digit ke-`n`. Dipakai untuk
 * mengembalikan kursor setelah titik ribuan disisipkan ulang: tanpa ini
 * kursor loncat ke ujung tiap ketikan di tengah angka.
 */
export function posisiSetelahDigit(tampil: string, n: number): number {
    if (n <= 0) return 0;
    let hitung = 0;
    for (let i = 0; i < tampil.length; i++) {
        if (/\d/.test(tampil[i]) && ++hitung === n) return i + 1;
    }
    return tampil.length;
}

/**
 * Hasil satu ketikan pada input bertitik → digit baru + jumlah digit di kiri
 * kursor. Yang terhapus hanya titik ribuan dibaca sebagai menghapus digit di
 * sebelahnya (Backspace → kiri, Delete → kanan); kalau tidak, titiknya muncul
 * lagi dan tombol terasa mati.
 *
 * Dicek persis "satu titik di posisi kursor hilang", bukan sekadar "digit sama
 * tapi teks lebih pendek": tempel "1500" menimpa "1.500" terseleksi juga
 * memenuhi yang kedua, padahal tidak ada yang dihapus.
 */
export function ketikUang(
    sebelum: string,
    mentah: string,
    kursor: number,
    inputType = '',
): { digit: string; kiri: number } {
    let digit = hanyaDigit(mentah);
    let kiri = hanyaDigit(mentah.slice(0, kursor)).length;
    const lama = formatRibuan(sebelum);
    const hapusTitik =
        lama[kursor] === '.' &&
        mentah === lama.slice(0, kursor) + lama.slice(kursor + 1);
    if (hapusTitik && inputType === 'deleteContentForward') {
        digit = digit.slice(0, kiri) + digit.slice(kiri + 1);
    } else if (hapusTitik && kiri > 0) {
        digit = digit.slice(0, kiri - 1) + digit.slice(kiri);
        kiri -= 1;
    }
    // Nol di depan dibuang di state juga (bukan cuma tampilan): "007" ditolak
    // aturan `integer` Laravel (filter_var), sedangkan "7" lolos.
    const bersih = digit.replace(/^0+(?=\d)/, '');
    return {
        digit: bersih,
        kiri: Math.max(0, kiri - (digit.length - bersih.length)),
    };
}

/**
 * Input nominal rupiah: tampil "Rp 1.500.000" saat diketik, nilai tetap digit.
 *
 * Bukan `type="number"`: titik ribuan tidak bisa tampil di sana dan scroll
 * mouse mengubah nominal diam-diam. Bukan library input-mask: kebutuhannya
 * cuma titik ribuan pada integer, cukup dua fungsi di atas.
 */
export function MoneyInput({
    value,
    onValueChange,
    withPrefix = true,
    className,
    ...props
}: MoneyInputProps) {
    const ref = useRef<HTMLInputElement>(null);
    const kursorDigit = useRef<number | null>(null);
    const tampil = formatRibuan(value);

    useLayoutEffect(() => {
        const el = ref.current;
        if (kursorDigit.current === null || el !== document.activeElement) {
            return;
        }
        const pos = posisiSetelahDigit(tampil, kursorDigit.current);
        el?.setSelectionRange(pos, pos);
        kursorDigit.current = null;
    }, [tampil]);

    return (
        <InputGroup className={cn(className)}>
            {withPrefix && <InputGroupAddon>Rp</InputGroupAddon>}
            <InputGroupInput
                ref={ref}
                inputMode="numeric"
                autoComplete="off"
                className="tabular-nums"
                {...props}
                value={tampil}
                onChange={(e) => {
                    const native = e.nativeEvent;
                    const { digit, kiri } = ketikUang(
                        value,
                        e.target.value,
                        e.target.selectionStart ?? e.target.value.length,
                        native instanceof InputEvent ? native.inputType : '',
                    );
                    kursorDigit.current = kiri;
                    onValueChange(digit);
                }}
            />
        </InputGroup>
    );
}
