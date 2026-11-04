import { useEffect, useState } from 'react';
import { MoneyInput } from '@/components/money-input';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatPersen, formatRp } from '@/lib/format';
import {
    nominalKePersen,
    persenKeNominal,
    rapikanPersen,
} from '@/modules/order/lib/discount';
import type { DiscountMode } from '@/modules/order/lib/discount';

/**
 * Persen dari `total` → nominal, dijepit ke `batas` (sisa tagihan). Kosong
 * kalau hasilnya 0, supaya placeholder tampil dan tombol Simpan tetap mati.
 */
export function nominalDariPersen(
    total: number,
    persen: string,
    batas: number,
): { nominal: string; dibatasi: boolean } {
    const mentah = persenKeNominal(total, Number(persen) || 0);
    const nominal = Math.min(mentah, Math.max(0, batas));
    return {
        nominal: nominal > 0 ? String(nominal) : '',
        dibatasi: mentah > nominal,
    };
}

/**
 * Isian uang masuk (DP, pembayaran) yang bisa diketik sebagai Rp atau % dari
 * total order.
 *
 * Persen hanya di klien — sama dengan diskon POS: `value` yang dikirim ke
 * server selalu nominal rupiah, jadi request & validasi tidak tahu ada mode
 * persen (dan tidak perlu field `dp_percent`). Basisnya total order, bukan
 * sisa tagihan: "DP 30%" di kesepakatan dengan customer berarti 30% harga
 * paket, dan hasilnya dijepit ke `cap` supaya tidak pernah melebihi sisa.
 */
export function AmountPercentField({
    id,
    total,
    cap = total,
    value,
    onValueChange,
    invalid,
}: {
    id: string;
    /** Basis persen — total order. */
    total: number;
    /** Batas atas nominal (sisa tagihan); default = total. */
    cap?: number;
    /** Nominal digit, bentuk yang dikirim ke server. */
    value: string;
    onValueChange: (digit: string) => void;
    invalid?: boolean;
}) {
    const [mode, setMode] = useState<DiscountMode>('rp');
    const [persen, setPersen] = useState('');
    const hasil = nominalDariPersen(total, persen, cap);

    // Mode %: nominal mengikuti total yang berubah (item order ditambah
    // setelah DP diketik). Dijalankan sebagai efek karena total datang dari
    // parent; tidak berulang tanpa henti karena hanya memanggil bila beda.
    useEffect(() => {
        if (mode === 'pct' && hasil.nominal !== value) {
            onValueChange(hasil.nominal);
        }
    }, [mode, hasil.nominal, value, onValueChange]);

    const gantiMode = (next: DiscountMode) => {
        if (next === mode) return;
        // Pindah mode mengonversi nilai yang ada, tidak mengosongkan field.
        if (next === 'pct') {
            const p = nominalKePersen(total, Number(value) || 0);
            setPersen(p > 0 ? String(p) : '');
        }
        setMode(next);
    };

    const nominal = Number(value) || 0;

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
                <ToggleGroup
                    size="sm"
                    aria-label="Satuan nominal"
                    value={[mode]}
                    onValueChange={(v) => {
                        if (v[0] === 'rp' || v[0] === 'pct') gantiMode(v[0]);
                    }}
                >
                    <ToggleGroupItem value="rp">Rp</ToggleGroupItem>
                    <ToggleGroupItem value="pct">%</ToggleGroupItem>
                </ToggleGroup>
                {mode === 'rp' ? (
                    <MoneyInput
                        id={id}
                        withPrefix={false}
                        placeholder="0"
                        className="min-w-0 flex-1"
                        value={value}
                        aria-invalid={invalid}
                        onValueChange={onValueChange}
                    />
                ) : (
                    <Input
                        id={id}
                        inputMode="decimal"
                        placeholder="mis. 30"
                        className="min-w-0 flex-1"
                        value={persen}
                        aria-invalid={invalid}
                        onChange={(e) =>
                            setPersen(rapikanPersen(e.target.value))
                        }
                    />
                )}
            </div>
            {total > 0 && mode === 'pct' && Number(persen) > 0 && (
                <p className="text-xs text-muted-foreground">
                    {persen}% × {formatRp(total)} ={' '}
                    <span className="font-medium text-foreground">
                        {formatRp(Number(hasil.nominal) || 0)}
                    </span>
                    {hasil.dibatasi && ' — dibatasi sisa tagihan'}
                </p>
            )}
            {total > 0 && mode === 'rp' && nominal > 0 && (
                <p className="text-xs text-muted-foreground">
                    = {formatPersen(nominal / total)} dari total{' '}
                    {formatRp(total)}
                </p>
            )}
        </div>
    );
}
