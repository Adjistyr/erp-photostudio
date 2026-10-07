/**
 * "· oleh Agung" di baris riwayat (pembayaran, biaya, servis, setoran).
 * null = dicatat sebelum ada pencatat atau user sudah dihapus — tidak
 * dirender sama sekali, bukan "—": data lama bukan data rusak.
 */
export function RecordedBy({ name }: { name: string | null }) {
    if (!name) return null;

    return (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
            {' '}
            · oleh {name}
        </span>
    );
}
