import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
        <Card className="p-4 sm:p-5">
            <CardHeader className="p-0">
                <CardDescription className="text-xs">{label}</CardDescription>
                <CardTitle
                    className={cn(
                        'text-lg leading-tight font-medium tracking-[-0.02em] whitespace-nowrap sm:text-[30px]',
                        urgent && 'text-destructive',
                    )}
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
