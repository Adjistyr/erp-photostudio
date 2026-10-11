/**
 * Sel status, jadwal perawatan, dan garansi aset — dipakai daftar dan detail
 * (spek 8.1).
 */

import { Badge } from '@/components/ui/badge';
import { formatTanggal, formatUmurPiutang } from '@/lib/format';
import { warrantyState } from '@/modules/asset/lib/warranty';
import type { AssetRow } from '@/modules/asset/types';

export function NextMaintenance({ asset: a }: { asset: AssetRow }) {
    if (a.disposed_on) return <span className="text-muted-foreground">—</span>;
    if (a.next_maintenance === null || a.days_until_next === null) {
        return <span className="text-muted-foreground">Tanpa jadwal</span>;
    }
    return (
        <span className="flex flex-col">
            <span>{formatTanggal(a.next_maintenance)}</span>
            {/* Merah untuk yang lewat — konvensi sama dengan umur piutang. */}
            <span
                className={`text-xs ${a.days_until_next < 0 ? 'text-destructive' : 'text-muted-foreground'}`}
            >
                {formatUmurPiutang(a.days_until_next)}
            </span>
        </span>
    );
}

/** Netral, tanpa warna: yang menuntut aksi adalah jadwal lewat, bukan status. */
export function StatusBadge({ asset: a }: { asset: AssetRow }) {
    if (a.disposed_on) {
        return (
            <span className="text-xs text-muted-foreground">
                Dilepas · {a.disposal_reason}
            </span>
        );
    }
    return a.status === 'broken' ? (
        <Badge variant="outline">Rusak</Badge>
    ) : (
        <Badge variant="secondary">Aktif</Badge>
    );
}

/**
 * Garansi (spek 8.1, dari 6.1): berlaku → "Garansi s/d …"; lampau → "Garansi
 * habis" abu-abu; kosong → tidak tampil.
 */
export function WarrantyBadge({
    until,
    today,
    compact = false,
}: {
    until: string | null;
    today: string;
    /** Daftar: label pendek, tanggal di tooltip — kolom Status tetap sempit. */
    compact?: boolean;
}) {
    const state = warrantyState(until, today);
    if (state === null || until === null) return null;
    const title = `Garansi s/d ${formatTanggal(until)}`;
    return state === 'active' ? (
        <Badge variant="success" title={title}>
            {compact ? 'Bergaransi' : title}
        </Badge>
    ) : (
        <Badge variant="secondary" title={title}>
            Garansi habis
        </Badge>
    );
}
