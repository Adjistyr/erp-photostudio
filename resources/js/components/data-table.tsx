/**
 * Primitif tabel — DESIGN.md R4 (density) + R7 (empty state), dua-duanya
 * blocker.
 *
 * Sengaja BUKAN DataTable generik dengan config kolom: tiap layar tetap menulis
 * kolomnya sendiri dalam JSX biasa supaya gampang dibaca. Yang dipusatkan di
 * sini cuma dua hal yang terbukti melenceng kalau diserahkan ke tiap layar:
 * angka density, dan keberadaan empty state.
 *
 * Default generator UI cenderung lega — padding besar, baris tinggi. Pada ERP
 * itu artinya satu layar hanya memuat 5–6 baris order dan owner scroll terus
 * untuk pekerjaan yang seharusnya sekali lihat.
 */

import { Link, type InertiaLinkProps } from '@inertiajs/react';
import { CircleCheck, Inbox } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Table, TableCell, TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatRp, kelasRp } from '@/lib/format';

/**
 * Density R4 dipasang sebagai descendant selector di elemen tabel, bukan kelas
 * per sel. Alasannya praktis: satu sel yang lupa diberi kelas tidak akan
 * kelihatan sampai disandingkan dengan layar lain, dan itu tepatnya bagaimana
 * tinggi baris di mockup Stitch jadi tidak seragam.
 *
 * 44px baris · 40px header · 12px padding horizontal · 10px vertikal.
 */
export const KELAS_DENSITY = [
    '[&_tbody_tr]:h-11',
    '[&_td]:px-3 [&_td]:py-2.5',
    '[&_th]:h-10 [&_th]:px-3',
    // Header 12px/500 --muted-foreground, bukan uppercase (R2).
    '[&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_th]:normal-case',
].join(' ');

export function TabelData({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        // Container scroll sendiri supaya `sticky` di thead punya acuan — tanpa
        // ini header ikut hilang saat halaman di-scroll.
        //
        // `min-w-0` WAJIB: flex item default `min-width: auto`, jadi tanpa ini
        // wrapper menolak menyusut di bawah lebar tabel dan mendorong SELURUH
        // halaman melebar — kolom terakhir dan tombol di header halaman ikut
        // terpotong. Gejalanya terlihat seperti tabel kelebaran, padahal yang
        // rusak adalah lebar halamannya.
        <div className="relative max-h-[calc(100svh-13rem)] min-w-0 overflow-auto rounded-lg border">
            <Table
                className={cn(
                    KELAS_DENSITY,
                    '[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-background',
                    className,
                )}
            >
                {children}
            </Table>
        </div>
    );
}

/**
 * Sel nominal: rata kanan, mono, dan warna mengikuti R5 (negatif
 * `--destructive`, nol `--muted-foreground`).
 *
 * Mono dipakai alih-alih `tabular-nums` karena `tabular-nums` diam-diam no-op
 * kalau font tidak punya fitur `tnum` — dan kolom Rp balik zigzag tanpa error.
 * Lihat catatan di app.css.
 */
export function SelUang({
    nominal,
    className,
}: {
    nominal: number;
    className?: string;
}) {
    return (
        <TableCell
            className={cn('text-right font-mono', kelasRp(nominal), className)}
        >
            {formatRp(nominal)}
        </TableCell>
    );
}

/** Header kolom nominal — rata kanan supaya sejajar dengan SelUang. */
export function KepalaUang({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <TableHead className={cn('text-right', className)}>
            {children}
        </TableHead>
    );
}

/** Sel kode/ID — mono, karena ini yang dibacakan owner ke customer. */
export function SelKode({ children }: { children: React.ReactNode }) {
    return <TableCell className="font-mono text-xs">{children}</TableCell>;
}

/**
 * Empty state — wajib ada di setiap layar (R7).
 *
 * Ini aturan dengan dampak terbesar di proyek ini dan yang paling sering
 * terlewat: bisnis client baru jalan 1 minggu dengan nol pendataan, jadi hari
 * pertama app dipakai SETIAP layar kosong. Kalau empty state tidak didesain,
 * kesan pertama owner adalah app-nya rusak — dan risiko terbesar proyek ini
 * bukan teknis, tapi owner berhenti memakai app.
 *
 * `nada="baik"` untuk kasus di mana kosong itu kabar baik, bukan kekurangan
 * data. Piutang kosong berarti tidak ada tagihan tertunggak; memakai nada
 * "belum ada apa-apa" di situ salah membaca situasi.
 */
export function KosongTabel({
    kalimat,
    aksi,
    nada = 'netral',
}: {
    kalimat: string;
    aksi?: {
        label: string;
        onClick?: () => void;
        ke?: NonNullable<InertiaLinkProps['href']>;
    };
    nada?: 'netral' | 'baik';
}) {
    const Ikon = nada === 'baik' ? CircleCheck : Inbox;

    return (
        <Empty className="rounded-lg border">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <Ikon
                        className={
                            nada === 'baik'
                                ? 'text-success'
                                : 'text-muted-foreground'
                        }
                    />
                </EmptyMedia>
                <EmptyTitle className="sr-only">
                    {nada === 'baik'
                        ? 'Tidak ada yang perlu ditindak'
                        : 'Belum ada data'}
                </EmptyTitle>
                <EmptyDescription>{kalimat}</EmptyDescription>
            </EmptyHeader>
            {aksi && (
                <EmptyContent>
                    {aksi.ke ? (
                        // Link Inertia, bukan <a href>: <a> memicu reload penuh dan
                        // di SPA itu terasa seperti app-nya nge-hang sedetik.
                        // nativeButton={false} karena render-nya jadi <a>.
                        <Button
                            nativeButton={false}
                            render={<Link href={aksi.ke} />}
                        >
                            {aksi.label}
                        </Button>
                    ) : (
                        <Button onClick={aksi.onClick}>{aksi.label}</Button>
                    )}
                </EmptyContent>
            )}
        </Empty>
    );
}
