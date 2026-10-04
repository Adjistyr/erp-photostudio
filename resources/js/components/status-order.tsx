/**
 * Sistem badge status — DESIGN.md R3 (blocker). Porting
 * web/app/components/status-order.tsx.
 *
 * Satu order punya dua status independen: progres kerja dan progres bayar.
 * Kalau keduanya berwarna penuh, satu baris memuat 9 kemungkinan warna dan
 * yang penting tenggelam. Hanya status bayar yang dapat warna — itu yang
 * menuntut tindakan (menagih).
 *
 * Beda dari prototype: status bayar & persen DP DITERIMA dari server, tidak
 * diturunkan di sini — aturannya hanya ada di App\Models\Order.
 */

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
    LINE_COLOR,
    LINE_LABEL,
    WORK_STATUS_LABEL,
    WORK_STEPS,
} from '@/types/domain';
import type { BusinessLine, PaymentStatus, WorkStatus } from '@/types/domain';

/**
 * Indikator progres kerja — netral. Titik aktif `--foreground`, sisa
 * `--border`. Diserahkan (langkah terakhir) labelnya `--success`.
 */
export function WorkProgress({ status }: { status: WorkStatus }) {
    if (status === 'cancelled') {
        return (
            <span className="flex items-center gap-2 text-destructive">
                <X className="size-3.5" />
                <span className="text-xs font-medium">Batal</span>
            </span>
        );
    }

    const step = WORK_STEPS.indexOf(status) + 1;
    const finished = step === WORK_STEPS.length;

    return (
        <span className="flex items-center gap-2">
            <Dots step={step} />
            <span
                className={cn(
                    'text-xs font-medium',
                    finished ? 'text-success' : 'text-muted-foreground',
                )}
            >
                {WORK_STATUS_LABEL[status]}
            </span>
        </span>
    );
}

function Dots({ step }: { step: number }) {
    return (
        <span className="flex shrink-0 gap-1">
            {WORK_STEPS.map((s, i) => (
                <span
                    key={s}
                    className={cn(
                        'size-1.5 rounded-full',
                        i < step ? 'bg-foreground' : 'bg-border',
                    )}
                />
            ))}
        </span>
    );
}

/**
 * Legenda notasi titik — WAJIB di setiap layar yang menampilkan WorkProgress
 * (R3). Tooltip di header kolom supaya tidak memakan ruang di layar padat.
 */
export function WorkProgressLegend({ children }: { children: ReactNode }) {
    return (
        <Tooltip>
            <TooltipTrigger
                render={
                    <span className="cursor-help underline decoration-dotted decoration-from-font underline-offset-4">
                        {children}
                    </span>
                }
            />
            <TooltipContent align="start" className="w-auto">
                <span className="flex flex-col gap-1.5">
                    {WORK_STEPS.map((s, i) => (
                        <span key={s} className="flex items-center gap-2">
                            <Dots step={i + 1} />
                            <span className="text-xs">
                                {WORK_STATUS_LABEL[s]}
                            </span>
                        </span>
                    ))}
                    <span className="flex items-center gap-2">
                        <X className="size-3.5" />
                        <span className="text-xs">Batal</span>
                    </span>
                </span>
            </TooltipContent>
        </Tooltip>
    );
}

/**
 * Badge status bayar. Persen DP selalu ikut — "DP 40%", bukan "DP" saja:
 * angka itu yang menentukan tagihan perlu dikejar sekarang atau nanti (R3).
 */
export function PaymentBadge({
    status,
    paidPercent,
}: {
    status: PaymentStatus;
    paidPercent: number;
}) {
    if (status === 'paid') return <Badge variant="success">Lunas</Badge>;
    if (status === 'unpaid') return <Badge variant="danger">Belum Bayar</Badge>;

    return <Badge variant="warning">DP {paidPercent}%</Badge>;
}

/** Baris order Batal: opacity 60% — riwayat, tidak menuntut tindakan (R3). */
export function orderRowClass(status: WorkStatus): string {
    return status === 'cancelled' ? 'opacity-60' : '';
}

/**
 * Penanda lini — titik memakai token chart yang sama dengan chart Laporan
 * (R6), supaya owner tidak perlu membaca legenda tiap pindah layar.
 */
export function LineMark({ line }: { line: BusinessLine }) {
    return (
        <span className="flex items-center gap-2 whitespace-nowrap">
            <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: LINE_COLOR[line] }}
            />
            <span className="text-sm">{LINE_LABEL[line]}</span>
        </span>
    );
}
