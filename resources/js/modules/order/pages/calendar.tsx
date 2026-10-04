/**
 * Kalender Booking (prompt 4.8, porting web/app/routes/order-kalender.tsx).
 *
 * Menjawab satu pertanyaan yang tidak bisa dijawab tabel: "tanggal ini kosong
 * atau tidak". Owner mengecek ini setiap kali ada customer menanyakan slot
 * (business-flow 5.2 langkah 2).
 *
 * Sengaja TIDAK memakai komponen Calendar shadcn: itu date picker
 * (react-day-picker) untuk MEMILIH tanggal, bukan menampilkan beberapa acara
 * per hari. Memaksakannya berarti meng-override render tiap sel — lebih banyak
 * kode daripada grid bulan biasa.
 *
 * Bulan dipilih lewat query `?month=` dan difilter server: pindah bulan cukup
 * pindah URL, dan bulan yang sedang dilihat bisa dibagikan/di-bookmark.
 */

import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, List } from 'lucide-react';
import { useState } from 'react';
import { PageActions } from '@/components/page-actions';
import { PaymentBadge, WorkProgress } from '@/components/status-order';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { formatBulan, formatJadwal, formatRp, tambahBulan } from '@/lib/format';
import {
    calendar as ordersCalendar,
    index as ordersIndex,
} from '@/routes/orders';
import { LINE_COLOR, LINE_LABEL } from '@/types/domain';
import { scheduleOf } from '@/modules/order/types';
import type { OrderRow } from '@/modules/order/types';

const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export default function OrdersCalendar({
    month,
    today,
    orders,
}: {
    month: string;
    today: string;
    orders: OrderRow[];
}) {
    const [detailId, setDetailId] = useState<number | null>(null);
    const detail = orders.find((o) => o.id === detailId) ?? null;

    const [year, mon] = month.split('-').map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();
    /**
     * Minggu dimulai Senin. `getDay()` memberi 0 untuk Minggu, jadi digeser:
     * Senin jadi 0. Kalau tidak, Sabtu–Minggu — hari paling padat untuk studio
     * foto — terpisah di dua ujung grid.
     */
    const offset = (new Date(year, mon - 1, 1).getDay() + 6) % 7;

    const byDay = new Map<number, OrderRow[]>();
    for (const o of orders) {
        const d = Number(o.service_date.slice(8, 10));
        byDay.set(d, [...(byDay.get(d) ?? []), o]);
    }

    const todayDay = today.startsWith(month)
        ? Number(today.slice(8, 10))
        : null;
    const shift = (n: number) => tambahBulan(`${month}-01`, n).slice(0, 7);

    return (
        <>
            <Head title="Kalender" />
            <h1 className="sr-only">Kalender Booking</h1>

            <PageActions>
                <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={ordersIndex()} />}
                >
                    <List data-icon="inline-start" />
                    Tampilan Daftar
                </Button>
            </PageActions>

            <div className="flex flex-col gap-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Button
                            size="icon"
                            variant="outline"
                            aria-label="Bulan sebelumnya"
                            nativeButton={false}
                            render={
                                <Link
                                    href={ordersCalendar({
                                        query: { month: shift(-1) },
                                    })}
                                    preserveScroll
                                />
                            }
                        >
                            <ChevronLeft />
                        </Button>
                        <Button
                            size="icon"
                            variant="outline"
                            aria-label="Bulan berikutnya"
                            nativeButton={false}
                            render={
                                <Link
                                    href={ordersCalendar({
                                        query: { month: shift(1) },
                                    })}
                                    preserveScroll
                                />
                            }
                        >
                            <ChevronRight />
                        </Button>
                        <h2 className="font-heading text-base font-semibold">
                            {formatBulan(month)}
                        </h2>
                    </div>

                    {/* Legenda warna lini — sama dengan chart di Laporan (R6). */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {(['studio', 'event'] as const).map((l) => (
                            <span key={l} className="flex items-center gap-1.5">
                                <span
                                    className="size-2 rounded-full"
                                    style={{ background: LINE_COLOR[l] }}
                                />
                                {LINE_LABEL[l]}
                            </span>
                        ))}
                        <span className="text-muted-foreground/70">
                            Retail tidak terjadwal
                        </span>
                    </div>
                </div>

                <div className="overflow-hidden rounded-lg border">
                    <div className="grid grid-cols-7 border-b bg-muted/40">
                        {DAYS.map((d) => (
                            <div
                                key={d}
                                className="px-3 py-2 text-xs font-medium text-muted-foreground"
                            >
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7">
                        {Array.from({ length: offset }, (_, i) => (
                            <div
                                key={`empty-${i}`}
                                className="min-h-28 border-r border-b"
                            />
                        ))}

                        {Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const items = byDay.get(day) ?? [];
                            return (
                                <div
                                    key={day}
                                    className="flex min-h-28 min-w-0 flex-col gap-1 border-r border-b p-2"
                                >
                                    <span
                                        className={
                                            day === todayDay
                                                ? 'flex size-6 items-center justify-center rounded-full bg-primary font-mono text-xs text-primary-foreground'
                                                : 'px-1 font-mono text-xs text-muted-foreground'
                                        }
                                    >
                                        {day}
                                    </span>
                                    {items.map((o) => (
                                        <button
                                            key={o.id}
                                            type="button"
                                            onClick={() => setDetailId(o.id)}
                                            className={`flex min-w-0 flex-col items-start gap-0.5 rounded-md px-2 py-1 text-left transition-opacity hover:opacity-80 ${
                                                o.work_status === 'cancelled'
                                                    ? 'line-through opacity-60'
                                                    : ''
                                            }`}
                                            style={{
                                                background: `color-mix(in oklch, ${LINE_COLOR[o.business_line]} 18%, transparent)`,
                                            }}
                                        >
                                            <span className="w-full truncate text-xs font-medium">
                                                {o.customer_name ?? 'Walk-in'}
                                            </span>
                                            {/*
                                                Baris jam DIHILANGKAN kalau order
                                                tidak punya jam, bukan diisi "—":
                                                dash di sebagian besar kartu event
                                                hanya derau.
                                            */}
                                            {o.service_time && (
                                                <span className="font-mono text-[11px] text-muted-foreground">
                                                    {o.service_time}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {orders.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        Belum ada jadwal bulan ini.
                    </p>
                )}
            </div>

            <Sheet
                open={detail !== null}
                onOpenChange={(o) => !o && setDetailId(null)}
            >
                <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-md">
                    {detail && (
                        <>
                            <SheetHeader>
                                <SheetTitle className="font-mono">
                                    {detail.number}
                                </SheetTitle>
                                <SheetDescription>
                                    {detail.customer_name ?? 'Walk-in'} ·{' '}
                                    {formatJadwal(scheduleOf(detail))}
                                </SheetDescription>
                            </SheetHeader>
                            <div className="flex flex-col gap-4 p-4">
                                <WorkProgress status={detail.work_status} />
                                <div className="flex flex-col gap-1 text-sm">
                                    <span>{detail.items_summary}</span>
                                    {detail.location && (
                                        <span className="text-muted-foreground">
                                            {detail.location}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                            Total
                                        </span>
                                        <span className="font-mono">
                                            {formatRp(detail.total)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                            Sisa
                                        </span>
                                        <span
                                            className={`font-mono ${detail.work_status === 'cancelled' ? 'text-muted-foreground line-through' : ''}`}
                                        >
                                            {formatRp(detail.balance)}
                                        </span>
                                    </div>
                                </div>
                                <PaymentBadge
                                    status={detail.payment_status}
                                    paidPercent={detail.paid_percent}
                                />
                                {/* Aksi (status, bayar, batal) tetap di daftar order:
                                    satu tempat, supaya kalender tetap jadi alat
                                    cek slot, bukan layar kedua untuk hal yang sama. */}
                                <Button
                                    variant="outline"
                                    nativeButton={false}
                                    render={<Link href={ordersIndex()} />}
                                >
                                    Buka di daftar order
                                </Button>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </>
    );
}

OrdersCalendar.layout = {
    breadcrumbs: [
        { title: 'Order & Booking', href: ordersIndex() },
        { title: 'Kalender', href: ordersCalendar() },
    ],
};
