import { formatRp, formatTanggal } from '@/lib/format';
import { periodeBerlaku, selisih } from '@/modules/catalog/lib/price-history';
import type { CatalogPriceChange } from '@/modules/catalog/types';

/** "+Rp 2.000" hijau / "−Rp 2.000" merah; kosong bila tak ada pembanding. */
function Selisih({ nilai }: { nilai: number | null }) {
    if (nilai === null || nilai === 0) return null;
    return (
        <span
            className={`block text-xs ${nilai > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}
        >
            {nilai > 0 ? '+' : ''}
            {formatRp(nilai)}
        </span>
    );
}

/**
 * Riwayat harga & HPP (spek 6.5) di halaman Edit katalog — judulnya dari
 * Panel pembungkus. Kolom HPP hanya
 * tampil bila ada baris yang membawa `unit_cost` (jasa, atau nanti admin
 * tanpa akses HPP — 5.1).
 */
export function PriceHistory({ rows }: { rows: CatalogPriceChange[] }) {
    const showCost = rows.some((r) => r.unit_cost !== null);
    const periode = periodeBerlaku(rows);

    return (
        <div className="flex flex-col gap-3">
            {rows.length <= 1 ? (
                <p className="text-sm text-muted-foreground">
                    {rows.length === 0
                        ? 'Belum ada riwayat harga.'
                        : `Harga belum pernah berubah sejak ${formatTanggal(rows[0].at)}.`}
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-xs text-muted-foreground">
                            <tr>
                                <th className="py-1.5 pr-3 font-medium">
                                    Berlaku
                                </th>
                                <th className="py-1.5 pr-3 text-right font-medium">
                                    Harga
                                </th>
                                {showCost && (
                                    <th className="py-1.5 pr-3 text-right font-medium">
                                        HPP
                                    </th>
                                )}
                                <th className="py-1.5 font-medium">Oleh</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => (
                                <tr
                                    key={`${row.at}-${i}`}
                                    className="border-t align-top"
                                >
                                    <td className="py-1.5 pr-3">
                                        {periode[i].replace(/^Berlaku /, '')}
                                    </td>
                                    <td className="py-1.5 pr-3 text-right">
                                        {formatRp(row.price)}
                                        <Selisih
                                            nilai={selisih(rows, i, 'price')}
                                        />
                                    </td>
                                    {showCost && (
                                        <td className="py-1.5 pr-3 text-right">
                                            {row.unit_cost === null
                                                ? '—'
                                                : formatRp(row.unit_cost)}
                                            <Selisih
                                                nilai={selisih(
                                                    rows,
                                                    i,
                                                    'unit_cost',
                                                )}
                                            />
                                        </td>
                                    )}
                                    <td className="py-1.5 text-muted-foreground">
                                        {row.changed_by_name ?? 'Sistem'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
