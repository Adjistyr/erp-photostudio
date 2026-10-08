import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

/**
 * Kartu angka ringkas di atas tabel (Pembayaran, Kas Harian). Dipindah dari
 * receivables.tsx begitu dipakai layar kedua — bukan disalin.
 */
export function SummaryCard({
    label,
    value,
    note,
    urgent,
}: {
    label: string;
    value: string;
    note: string;
    urgent?: boolean;
}) {
    return (
        <Card className="p-5">
            <CardHeader className="p-0">
                <CardDescription className="text-xs">{label}</CardDescription>
                <CardTitle
                    className={`font-mono text-3xl font-semibold ${urgent ? 'text-destructive' : ''}`}
                >
                    {value}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <p className="text-xs text-muted-foreground">{note}</p>
            </CardContent>
        </Card>
    );
}
