/**
 * Modal & Bagi Hasil (business-flow bagian 8, porting web/app/routes/bagi-hasil.tsx).
 *
 * Satu layar untuk uang di luar operasional: hak bagi hasil per bulan,
 * setoran owner (modal/pinjaman), pos dana, investasi, dan rasio. Semua angka
 * diturunkan server dari riwayat — layar ini hanya mencatat baris baru,
 * tidak pernah mengedit yang lama.
 */

import { Head, Link, useForm } from '@inertiajs/react';
import { Plus, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import CapitalController from '@/actions/Modules/Finance/Controllers/CapitalController';
import {
    KepalaUang,
    KosongTabel,
    SelUang,
    TabelData,
} from '@/components/data-table';
import { ConfirmDelete } from '@/components/confirm-delete';
import InputError from '@/components/input-error';
import { PageActions } from '@/components/page-actions';
import { RecordedBy } from '@/components/recorded-by';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    formatBulan,
    formatPersen,
    formatRp,
    formatTanggal,
    hanyaDigit,
} from '@/lib/format';
import { index as assetsIndex } from '@/routes/assets';
import { index as capitalIndex } from '@/routes/capital';

type FundKey = 'maintenance' | 'reserve';
type Kind = 'loan' | 'equity';
type Destination = 'cash' | 'maintenance_fund' | 'reserve_fund' | 'investment';
type Tab = 'history' | 'contributions' | 'funds' | 'investments' | 'rules';

const FUNDS: FundKey[] = ['maintenance', 'reserve'];
const FUND_LABEL: Record<FundKey, string> = {
    maintenance: 'Dana maintenance',
    reserve: 'Dana cadangan',
};
const DESTINATION_LABEL: Record<Destination, string> = {
    cash: 'Kas usaha',
    maintenance_fund: 'Dana maintenance',
    reserve_fund: 'Dana cadangan',
    investment: 'Investasi',
};
const LOAN_DESTINATIONS: Destination[] = [
    'cash',
    'maintenance_fund',
    'reserve_fund',
];
const TABS: Tab[] = [
    'history',
    'contributions',
    'funds',
    'investments',
    'rules',
];

/** Aksi utama header mengikuti tab aktif — tab Bagi Hasil hanya dibaca. */
const TAB_ACTION: Partial<Record<Tab, string>> = {
    contributions: 'Catat Setoran',
    funds: 'Catat Pemakaian',
    investments: 'Catat Investasi',
    rules: 'Ubah Rasio',
};

interface Owner {
    id: number;
    name: string;
}

interface LedgerEntry {
    /** Id pemakaian dana manual — hanya baris ini yang bisa dihapus di sini. */
    withdrawal_id: number | null;
    /** Hanya pemakaian manual; null untuk baris yang dihitung. */
    created_by_name: string | null;
    date: string;
    type: string;
    description: string;
    in: number;
    out: number;
    balance: number;
}

interface Rule {
    id: number;
    effective_month: string;
    reserve_percent: number;
    shares: { owner_id: number; percent: number }[];
    status: 'current' | 'scheduled' | 'history';
}

interface Props {
    month: string;
    today: string;
    funds: Record<FundKey, number>;
    outstanding_loans: number;
    history: {
        month: string;
        net_profit: number;
        from_opening_balance: boolean;
        final: boolean;
        deduction: number;
        distributable: number;
        reserve: number;
        shares: { owner_id: number; percent: number; amount: number }[];
    }[];
    carry: {
        accumulated_loss: number;
        outstanding_loans: number;
        next_month: string;
    } | null;
    capital_recovery: {
        owner_name: string;
        equity: number;
        entitled: number;
        ratio: number;
    }[];
    contributions: {
        id: number;
        contributed_on: string;
        owner_name: string;
        kind: Kind;
        destination: Destination;
        note: string;
        amount: number;
        remaining: number | null;
        created_by_name: string | null;
    }[];
    ledgers: Record<FundKey, LedgerEntry[]>;
    investments: {
        id: number;
        invested_on: string;
        description: string;
        amount: number;
        funded_by: string;
        created_by_name: string | null;
    }[];
    rules: Rule[];
    next_rule_month: string;
    /** Bulan yang bisa ditutup berikutnya (berurutan, sudah lewat). */
    next_to_close: string | null;
    /** Bulan terakhir yang ditutup — satu-satunya yang bisa dibuka kembali. */
    last_closed: string | null;
    closings: Record<string, { closed_at: string; closed_by: string | null }>;
    owners: Owner[];
}

export default function Capital(props: Props) {
    const [tab, setTab] = useState<Tab>('history');
    const [dialog, setDialog] = useState<Tab | null>(null);
    const close = () => setDialog(null);
    const action = TAB_ACTION[tab];
    const { carry } = props;

    return (
        <>
            <Head title="Modal & Bagi Hasil" />
            <h1 className="sr-only">Modal & Bagi Hasil</h1>

            {action && (
                <PageActions>
                    <Button onClick={() => setDialog(tab)}>
                        <Plus data-icon="inline-start" />
                        {action}
                    </Button>
                </PageActions>
            )}

            <div className="flex flex-col gap-6 p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Summary
                        label={FUND_LABEL.maintenance}
                        value={props.funds.maintenance}
                        note="untuk servis dan ganti alat"
                    />
                    <Summary
                        label={FUND_LABEL.reserve}
                        value={props.funds.reserve}
                        note="untuk pembelian mendesak"
                    />
                    <Summary
                        label="Pinjaman owner belum kembali"
                        value={props.outstanding_loans}
                        note="dilunasi sebelum laba dibagi"
                    />
                </div>

                <Tabs
                    value={tab}
                    onValueChange={(v) => {
                        const t = TABS.find((x) => x === v);
                        if (t) setTab(t);
                    }}
                >
                    <TabsList>
                        <TabsTrigger value="history">Bagi Hasil</TabsTrigger>
                        <TabsTrigger value="contributions">
                            Setoran Owner
                        </TabsTrigger>
                        <TabsTrigger value="funds">Pos Dana</TabsTrigger>
                        <TabsTrigger value="investments">Investasi</TabsTrigger>
                        <TabsTrigger value="rules">Rasio</TabsTrigger>
                    </TabsList>

                    <TabsContent
                        value="history"
                        className="mt-4 flex flex-col gap-6"
                    >
                        {props.history.length === 0 ? (
                            <KosongTabel
                                kalimat="Belum ada aturan bagi hasil. Tentukan rasio tiap owner dulu."
                                aksi={{
                                    label: 'Atur Rasio',
                                    onClick: () => setDialog('rules'),
                                }}
                            />
                        ) : (
                            <HistoryTab
                                history={props.history}
                                owners={props.owners}
                                currentMonth={props.month}
                                nextToClose={props.next_to_close}
                                lastClosed={props.last_closed}
                                closings={props.closings}
                            />
                        )}
                        {carry &&
                            (carry.accumulated_loss > 0 ||
                                carry.outstanding_loans > 0) && (
                                <Alert>
                                    <TriangleAlert />
                                    <AlertTitle>
                                        {formatBulan(carry.next_month)}: laba
                                        ditahan dulu sampai{' '}
                                        {formatRp(
                                            Math.max(
                                                carry.accumulated_loss,
                                                carry.outstanding_loans,
                                            ),
                                        )}
                                    </AlertTitle>
                                    <AlertDescription>
                                        {carry.accumulated_loss > 0 &&
                                            `Rugi ${formatRp(carry.accumulated_loss)} dibawa ke bulan depan. `}
                                        {carry.outstanding_loans > 0 &&
                                            `Pinjaman owner ${formatRp(carry.outstanding_loans)} dilunasi dari potongan yang sama — rugi dan pinjaman itu uang yang sama, jadi tidak dipotong dua kali. `}
                                        Baru setelah itu sisanya dibagi.
                                    </AlertDescription>
                                </Alert>
                            )}
                        <CapitalRecoverySection rows={props.capital_recovery} />
                    </TabsContent>

                    <TabsContent
                        value="contributions"
                        className="mt-4 flex flex-col gap-3"
                    >
                        <ContributionsTab
                            rows={props.contributions}
                            onAdd={() => setDialog('contributions')}
                        />
                    </TabsContent>

                    <TabsContent
                        value="funds"
                        className="mt-4 flex flex-col gap-6"
                    >
                        {FUNDS.map((f) => (
                            <LedgerSection
                                key={f}
                                fund={f}
                                balance={props.funds[f]}
                                entries={props.ledgers[f]}
                            />
                        ))}
                        <p className="text-xs text-muted-foreground">
                            Pemakaian dana tidak masuk Laba Rugi — uangnya sudah
                            dikurangi saat disisihkan. Servis alat dicatat di
                            sini (atau di Aset & Maintenance), bukan di Biaya,
                            supaya laba tidak terpotong dua kali. Alokasi{' '}
                            {formatBulan(props.month)} masuk setelah bulan
                            tutup.
                        </p>
                    </TabsContent>

                    <TabsContent
                        value="investments"
                        className="mt-4 flex flex-col gap-3"
                    >
                        <InvestmentsTab
                            rows={props.investments}
                            onAdd={() => setDialog('investments')}
                        />
                    </TabsContent>

                    <TabsContent
                        value="rules"
                        className="mt-4 flex flex-col gap-3"
                    >
                        <RulesTab rules={props.rules} owners={props.owners} />
                    </TabsContent>
                </Tabs>
            </div>

            {dialog === 'contributions' && (
                <ContributionDialog
                    today={props.today}
                    owners={props.owners}
                    onClose={close}
                />
            )}
            {dialog === 'funds' && (
                <WithdrawalDialog
                    today={props.today}
                    funds={props.funds}
                    onClose={close}
                    onOpenContribution={() => setDialog('contributions')}
                />
            )}
            {dialog === 'investments' && (
                <InvestmentDialog
                    today={props.today}
                    owners={props.owners}
                    onClose={close}
                />
            )}
            {dialog === 'rules' && (
                <RuleDialog
                    owners={props.owners}
                    month={props.month}
                    nextMonth={props.next_rule_month}
                    base={
                        props.rules.find((r) => r.status === 'current') ??
                        props.rules[0]
                    }
                    onClose={close}
                />
            )}
        </>
    );
}

Capital.layout = {
    breadcrumbs: [{ title: 'Modal & Bagi Hasil', href: capitalIndex() }],
};

// ── Tab ─────────────────────────────────────────────────────────────────────

function HistoryTab({
    history,
    owners,
    currentMonth,
    nextToClose,
    lastClosed,
    closings,
}: {
    history: Props['history'];
    owners: Owner[];
    currentMonth: string;
    nextToClose: string | null;
    lastClosed: string | null;
    closings: Props['closings'];
}) {
    return (
        <div className="flex flex-col gap-3">
            <TabelData>
                <TableHeader>
                    <TableRow>
                        <TableHead>Bulan</TableHead>
                        <KepalaUang>Laba bersih</KepalaUang>
                        <KepalaUang>Kompensasi</KepalaUang>
                        <KepalaUang>Dibagi</KepalaUang>
                        <KepalaUang>Cadangan</KepalaUang>
                        {owners.map((o) => (
                            <KepalaUang key={o.id}>{o.name}</KepalaUang>
                        ))}
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {history.map((m) => (
                        <TableRow key={m.month}>
                            <TableCell className="whitespace-nowrap">
                                {formatBulan(m.month)}
                                {m.from_opening_balance && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                        dari sheet
                                    </span>
                                )}
                            </TableCell>
                            <SelUang nominal={m.net_profit} />
                            <SelUang nominal={-m.deduction} />
                            <SelUang nominal={m.distributable} />
                            <SelUang nominal={m.reserve} />
                            {owners.map((o) => {
                                const share = m.shares.find(
                                    (s) => s.owner_id === o.id,
                                );
                                return (
                                    <TableCell
                                        key={o.id}
                                        className="text-right"
                                    >
                                        <span
                                            className={`font-mono ${share?.amount ? '' : 'text-muted-foreground'}`}
                                        >
                                            {formatRp(share?.amount ?? 0)}
                                        </span>
                                        {/* Persen di tiap baris, bukan di header: rasio
                                            bisa berbeda antar bulan (8.6). */}
                                        <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                                            {share ? `${share.percent}%` : '—'}
                                        </span>
                                    </TableCell>
                                );
                            })}
                            <TableCell>
                                <ClosingStatus
                                    month={m.month}
                                    currentMonth={currentMonth}
                                    final={m.final}
                                    nextToClose={nextToClose}
                                    lastClosed={lastClosed}
                                    closing={closings[m.month]}
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </TabelData>
            <p className="text-xs text-muted-foreground">
                Angka bulan yang belum tutup buku masih berubah setiap ada
                transaksi. Tutup buku setelah semua transaksi bulan itu tercatat
                — setelahnya bagi hasil final dan transaksi bertanggal bulan itu
                ditolak. Yang dihitung di sini adalah hak tiap owner —
                pencairannya terjadi di luar app.
            </p>
        </div>
    );
}

/**
 * Status tutup buku per bulan. Tutup/buka lewat AlertDialog (R9): yang
 * dikonfirmasi adalah KONSEKUENSINYA — bagi hasil jadi final, transaksi
 * bertanggal bulan itu ditolak.
 */
function ClosingStatus({
    month,
    currentMonth,
    final,
    nextToClose,
    lastClosed,
    closing,
}: {
    month: string;
    currentMonth: string;
    final: boolean;
    nextToClose: string | null;
    lastClosed: string | null;
    closing: { closed_at: string; closed_by: string | null } | undefined;
}) {
    if (final) {
        return (
            <div className="flex items-center gap-2">
                <Badge
                    variant="outline"
                    title={
                        closing
                            ? `Ditutup ${formatTanggal(closing.closed_at)}${closing.closed_by ? ` oleh ${closing.closed_by}` : ''}`
                            : undefined
                    }
                >
                    Tutup buku
                </Badge>
                {month === lastClosed && (
                    <ConfirmClosing
                        month={month}
                        action="reopen"
                        title={`Buka kembali ${formatBulan(month)}?`}
                        description="Hanya untuk koreksi. Selama terbuka, transaksi bertanggal bulan ini bisa dicatat atau dihapus, dan bagi hasil bulan ini serta sesudahnya bisa berubah. Tutup lagi setelah koreksi selesai."
                        label="Buka kembali"
                    />
                )}
            </div>
        );
    }
    if (month === nextToClose) {
        return (
            <ConfirmClosing
                month={month}
                action="close"
                title={`Tutup buku ${formatBulan(month)}?`}
                description={`Pastikan semua transaksi ${formatBulan(month)} sudah tercatat. Setelah ditutup, bagi hasil bulan ini final, alokasi dana masuk ke pos dana, dan transaksi bertanggal ${formatBulan(month)} ditolak.`}
                label="Tutup Buku"
            />
        );
    }
    // Sudah lewat tapi bukan giliran ditutup (bulan sebelumnya belum ditutup).
    if (month < currentMonth) {
        return <Badge variant="outline">Belum tutup buku</Badge>;
    }
    return <Badge variant="secondary">Berjalan</Badge>;
}

function ConfirmClosing({
    month,
    action,
    title,
    description,
    label,
}: {
    month: string;
    action: 'close' | 'reopen';
    title: string;
    description: string;
    label: string;
}) {
    const form = useForm({ month });

    return (
        <AlertDialog>
            <AlertDialogTrigger
                render={
                    <Button
                        size="sm"
                        variant={action === 'close' ? 'default' : 'ghost'}
                    />
                }
            >
                {label}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <InputError message={form.errors.month} />
                <AlertDialogFooter>
                    <AlertDialogCancel render={<Button variant="outline" />}>
                        Batal
                    </AlertDialogCancel>
                    <AlertDialogAction
                        render={
                            <Button
                                variant={
                                    action === 'close'
                                        ? 'default'
                                        : 'destructive'
                                }
                            />
                        }
                        disabled={form.processing}
                        onClick={() =>
                            form.post(
                                action === 'close'
                                    ? CapitalController.closeMonth().url
                                    : CapitalController.reopenMonth(month).url,
                                { preserveScroll: true },
                            )
                        }
                    >
                        {label}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function CapitalRecoverySection({ rows }: { rows: Props['capital_recovery'] }) {
    // Modal awal belum diisi → disembunyikan, bukan 0% (8.7): 0% terbaca
    // "belum balik modal sama sekali", padahal "modalnya belum dicatat".
    if (rows.length === 0) {
        return (
            <p className="text-xs text-muted-foreground">
                Progres balik modal muncul setelah modal owner dicatat di tab
                Setoran Owner.
            </p>
        );
    }

    return (
        <section className="flex flex-col gap-3 rounded-lg border p-5">
            <h2 className="font-heading text-base font-semibold">
                Progres balik modal
            </h2>
            {rows.map((r) => (
                <div key={r.owner_name} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-medium">{r.owner_name}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                            {formatRp(r.entitled)} dari {formatRp(r.equity)} ·{' '}
                            {formatPersen(r.ratio)}
                        </span>
                    </div>
                    <Progress
                        value={Math.max(
                            0,
                            Math.min(100, Math.round(r.ratio * 100)),
                        )}
                        aria-label={`Progres balik modal ${r.owner_name}`}
                    />
                </div>
            ))}
            <p className="text-xs text-muted-foreground">
                Dari hak bagi hasil bulan yang sudah tutup. Kalau owner sepakat
                mengubah rasio setelah balik modal, tambahkan aturan baru di tab
                Rasio.
            </p>
        </section>
    );
}

function ContributionsTab({
    rows,
    onAdd,
}: {
    rows: Props['contributions'];
    onAdd: () => void;
}) {
    return (
        <>
            {rows.length === 0 ? (
                <KosongTabel
                    kalimat="Belum ada setoran owner. Catat modal awal atau pinjaman owner ke usaha."
                    aksi={{ label: 'Catat Setoran', onClick: onAdd }}
                />
            ) : (
                <TabelData>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Owner</TableHead>
                            <TableHead>Jenis</TableHead>
                            <TableHead>Tujuan</TableHead>
                            <TableHead>Keterangan</TableHead>
                            <KepalaUang>Nominal</KepalaUang>
                            <KepalaUang>Sisa pinjaman</KepalaUang>
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((c) => (
                            <TableRow key={c.id}>
                                <TableCell className="whitespace-nowrap">
                                    {formatTanggal(c.contributed_on)}
                                </TableCell>
                                <TableCell className="font-medium">
                                    {c.owner_name}
                                </TableCell>
                                <TableCell>
                                    {/* Netral: hanya status bayar yang dapat warna (R3). */}
                                    <Badge
                                        variant={
                                            c.kind === 'loan'
                                                ? 'outline'
                                                : 'secondary'
                                        }
                                    >
                                        {c.kind === 'loan'
                                            ? 'Pinjaman'
                                            : 'Modal'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {DESTINATION_LABEL[c.destination]}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {c.note}
                                    <RecordedBy name={c.created_by_name} />
                                </TableCell>
                                <SelUang nominal={c.amount} />
                                {c.remaining === null ? (
                                    <TableCell className="text-right text-muted-foreground">
                                        —
                                    </TableCell>
                                ) : (
                                    <SelUang nominal={c.remaining} />
                                )}
                                <TableCell className="w-10">
                                    <ConfirmDelete
                                        url={
                                            CapitalController.destroyContribution(
                                                c.id,
                                            ).url
                                        }
                                        label={`setoran ${c.note}`}
                                        title={`Hapus setoran ${c.owner_name} ${formatRp(c.amount)}?`}
                                        description="Hanya bisa kalau belum terpakai: pinjaman belum mulai dilunasi, dan modal tidak membiayai investasi/aset."
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </TabelData>
            )}
            <p className="text-xs text-muted-foreground">
                Setoran bukan omzet dan tidak muncul di Laba Rugi. Pinjaman
                dikembalikan sebelum laba dibagi; modal kembali lewat bagi
                hasil.
            </p>
        </>
    );
}

function LedgerSection({
    fund,
    balance,
    entries,
}: {
    fund: FundKey;
    balance: number;
    entries: LedgerEntry[];
}) {
    return (
        <section className="flex min-w-0 flex-col gap-3">
            <div className="flex items-baseline justify-between">
                <h2 className="font-heading text-base font-semibold">
                    {FUND_LABEL[fund]}
                </h2>
                <span className="font-mono text-sm">
                    Saldo {formatRp(balance)}
                </span>
            </div>
            {entries.length === 0 ? (
                <KosongTabel kalimat="Belum ada mutasi. Alokasi masuk otomatis setiap akhir bulan." />
            ) : (
                <TabelData>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Jenis</TableHead>
                            <TableHead>Keterangan</TableHead>
                            <KepalaUang>Masuk</KepalaUang>
                            <KepalaUang>Keluar</KepalaUang>
                            <KepalaUang>Saldo</KepalaUang>
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {entries.map((e, i) => (
                            <TableRow key={`${e.date}-${i}`}>
                                <TableCell className="whitespace-nowrap">
                                    {formatTanggal(e.date)}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                    {e.type}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {e.description}
                                    <RecordedBy name={e.created_by_name} />
                                </TableCell>
                                <SelUang nominal={e.in} />
                                <SelUang nominal={e.out === 0 ? 0 : -e.out} />
                                <SelUang nominal={e.balance} />
                                <TableCell className="w-10">
                                    {/* Hanya pemakaian manual; alokasi, pinjaman, dan
                                        servis aset dihapus dari sumbernya masing-masing. */}
                                    {e.withdrawal_id !== null && (
                                        <ConfirmDelete
                                            url={
                                                CapitalController.destroyWithdrawal(
                                                    e.withdrawal_id,
                                                ).url
                                            }
                                            label={`pemakaian ${e.description}`}
                                            title={`Hapus pemakaian ${formatRp(e.out)}?`}
                                            description={`${e.description}. Saldo ${FUND_LABEL[fund].toLowerCase()} kembali.`}
                                        />
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </TabelData>
            )}
        </section>
    );
}

function InvestmentsTab({
    rows,
    onAdd,
}: {
    rows: Props['investments'];
    onAdd: () => void;
}) {
    const total = rows.reduce((s, i) => s + i.amount, 0);

    return (
        <>
            {rows.length === 0 ? (
                <KosongTabel
                    kalimat="Belum ada investasi. Renovasi dicatat di sini, pembelian alat lewat Aset & Maintenance — keduanya bukan di Biaya."
                    aksi={{ label: 'Catat Investasi', onClick: onAdd }}
                />
            ) : (
                <TabelData>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Keterangan</TableHead>
                            <TableHead>Dibiayai</TableHead>
                            <KepalaUang>Nominal</KepalaUang>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((i) => (
                            <TableRow key={i.id}>
                                <TableCell className="whitespace-nowrap">
                                    {formatTanggal(i.invested_on)}
                                </TableCell>
                                <TableCell className="font-medium">
                                    {i.description}
                                    <RecordedBy name={i.created_by_name} />
                                </TableCell>
                                <TableCell>{i.funded_by}</TableCell>
                                <SelUang nominal={i.amount} />
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={3} className="font-semibold">
                                Total investasi
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                                {formatRp(total)}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </TabelData>
            )}
            <p className="text-xs text-muted-foreground">
                Investasi tidak masuk Laba Rugi. Kalau renovasi dicatat sebagai
                biaya, bulan itu rugi besar dan bagi hasil kedua owner tertahan
                berbulan-bulan. Pembelian alat otomatis masuk ke sini saat
                dicatat di{' '}
                <Link
                    href={assetsIndex()}
                    className="font-medium text-foreground underline underline-offset-2"
                >
                    Aset & Maintenance
                </Link>
                .
            </p>
        </>
    );
}

function RulesTab({ rules, owners }: { rules: Rule[]; owners: Owner[] }) {
    return (
        <>
            <TabelData>
                <TableHeader>
                    <TableRow>
                        <TableHead>Berlaku mulai</TableHead>
                        {owners.map((o) => (
                            <KepalaUang key={o.id}>{o.name}</KepalaUang>
                        ))}
                        <KepalaUang>Dana cadangan</KepalaUang>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rules.map((r) => (
                        <TableRow key={r.id}>
                            <TableCell className="font-medium whitespace-nowrap">
                                {formatBulan(r.effective_month)}
                            </TableCell>
                            {owners.map((o) => {
                                const s = r.shares.find(
                                    (x) => x.owner_id === o.id,
                                );
                                return (
                                    <TableCell
                                        key={o.id}
                                        className="text-right font-mono"
                                    >
                                        {s ? `${s.percent}%` : '—'}
                                    </TableCell>
                                );
                            })}
                            <TableCell className="text-right font-mono">
                                {r.reserve_percent}%
                            </TableCell>
                            <TableCell>
                                {r.status === 'current' ? (
                                    <Badge variant="secondary">Berlaku</Badge>
                                ) : r.status === 'scheduled' ? (
                                    <Badge variant="outline">Terjadwal</Badge>
                                ) : (
                                    <span className="text-xs text-muted-foreground">
                                        Riwayat
                                    </span>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </TabelData>
            <p className="text-xs text-muted-foreground">
                Aturan lama tidak bisa diedit. Mengubah rasio menambah baris
                baru yang berlaku mulai bulan tertentu, supaya bagi hasil bulan
                lalu tidak ikut berubah. Alokasi dana maintenance tidak diatur
                di sini — dihitung otomatis dari{' '}
                <Link
                    href={assetsIndex()}
                    className="font-medium text-foreground underline underline-offset-2"
                >
                    Aset & Maintenance
                </Link>
                .
            </p>
        </>
    );
}

// ── Dialog ──────────────────────────────────────────────────────────────────

function ContributionDialog({
    today,
    owners,
    onClose,
}: {
    today: string;
    owners: Owner[];
    onClose: () => void;
}) {
    const form = useForm<{
        owner_id: string;
        kind: Kind;
        destination: Destination;
        note: string;
        contributed_on: string;
        amount: string;
    }>({
        owner_id: owners[0] ? String(owners[0].id) : '',
        kind: 'loan',
        destination: 'cash',
        note: '',
        contributed_on: today,
        amount: '',
    });
    const { data, setData, errors, processing } = form;

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Catat Setoran Owner</DialogTitle>
                    <DialogDescription>
                        Uang dari owner ke usaha. Bukan omzet, tidak memengaruhi
                        laba.
                    </DialogDescription>
                </DialogHeader>

                <FieldGroup>
                    <Field>
                        <FieldLabel>Owner</FieldLabel>
                        <ToggleGroup
                            value={[data.owner_id]}
                            onValueChange={(v) =>
                                v[0] && setData('owner_id', v[0])
                            }
                        >
                            {owners.map((o) => (
                                <ToggleGroupItem
                                    key={o.id}
                                    value={String(o.id)}
                                >
                                    {o.name}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                        <InputError message={errors.owner_id} />
                    </Field>

                    <Field>
                        <FieldLabel>Jenis</FieldLabel>
                        <ToggleGroup
                            value={[data.kind]}
                            onValueChange={(v) => {
                                if (v[0] === 'loan' || v[0] === 'equity')
                                    setData('kind', v[0]);
                            }}
                        >
                            <ToggleGroupItem value="loan">
                                Pinjaman
                            </ToggleGroupItem>
                            <ToggleGroupItem value="equity">
                                Modal
                            </ToggleGroupItem>
                        </ToggleGroup>
                        <p className="text-xs text-muted-foreground">
                            {data.kind === 'loan'
                                ? 'Dikembalikan ke owner ini sebelum laba dibagi. Pakai untuk menutup rugi atau kekurangan dana.'
                                : 'Tidak dikembalikan langsung — kembalinya lewat bagi hasil. Untuk renovasi atau alat, pakai Catat Investasi.'}
                        </p>
                        <InputError message={errors.kind} />
                    </Field>

                    {data.kind === 'loan' && (
                        <Field>
                            <FieldLabel htmlFor="destination">
                                Masuk ke
                            </FieldLabel>
                            <Select
                                value={data.destination}
                                onValueChange={(v) => {
                                    const d = LOAN_DESTINATIONS.find(
                                        (x) => x === v,
                                    );
                                    if (d) setData('destination', d);
                                }}
                            >
                                <SelectTrigger
                                    id="destination"
                                    className="w-full"
                                >
                                    <SelectValue>
                                        {(v: Destination) =>
                                            DESTINATION_LABEL[v]
                                        }
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {LOAN_DESTINATIONS.map((d) => (
                                            <SelectItem key={d} value={d}>
                                                {DESTINATION_LABEL[d]}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                {data.destination === 'cash'
                                    ? 'Dilunasi dari laba bulan berikutnya, sebelum dibagi.'
                                    : 'Dilunasi dari alokasi pos dana ini di bulan berikutnya.'}
                            </p>
                            <InputError message={errors.destination} />
                        </Field>
                    )}

                    <Field>
                        <FieldLabel htmlFor="contribution-note">
                            Keterangan{' '}
                            <span className="text-muted-foreground">
                                — opsional
                            </span>
                        </FieldLabel>
                        <Input
                            id="contribution-note"
                            placeholder="Menutup kekurangan kas"
                            value={data.note}
                            onChange={(e) => setData('note', e.target.value)}
                        />
                        <InputError message={errors.note} />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <FieldLabel htmlFor="contribution-date">
                                Tanggal
                            </FieldLabel>
                            <Input
                                id="contribution-date"
                                type="date"
                                max={today}
                                value={data.contributed_on}
                                onChange={(e) =>
                                    setData('contributed_on', e.target.value)
                                }
                            />
                            <InputError message={errors.contributed_on} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="contribution-amount">
                                Nominal
                            </FieldLabel>
                            <Input
                                id="contribution-amount"
                                inputMode="numeric"
                                className="font-mono"
                                placeholder="0"
                                value={data.amount}
                                aria-invalid={Boolean(errors.amount)}
                                onChange={(e) =>
                                    setData(
                                        'amount',
                                        hanyaDigit(e.target.value),
                                    )
                                }
                            />
                            <InputError message={errors.amount} />
                        </Field>
                    </div>
                </FieldGroup>

                <DialogFooter>
                    <DialogClose
                        render={<Button variant="outline">Batal</Button>}
                    />
                    <Button
                        disabled={Number(data.amount) <= 0 || processing}
                        onClick={() =>
                            form.post(
                                CapitalController.storeContribution().url,
                                { preserveScroll: true, onSuccess: onClose },
                            )
                        }
                    >
                        Simpan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function WithdrawalDialog({
    today,
    funds,
    onClose,
    onOpenContribution,
}: {
    today: string;
    funds: Props['funds'];
    onClose: () => void;
    onOpenContribution: () => void;
}) {
    const form = useForm<{
        fund: FundKey;
        note: string;
        withdrawn_on: string;
        amount: string;
    }>({
        fund: 'maintenance',
        note: '',
        withdrawn_on: today,
        amount: '',
    });
    const { data, setData, errors, processing } = form;

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Catat Pemakaian Dana</DialogTitle>
                    <DialogDescription>
                        Servis alat atau pembelian mendesak. Tidak dicatat di
                        Biaya — uangnya sudah dikurangi dari laba saat
                        disisihkan.
                    </DialogDescription>
                </DialogHeader>

                <FieldGroup>
                    <Field>
                        <FieldLabel>Pos dana</FieldLabel>
                        <ToggleGroup
                            value={[data.fund]}
                            onValueChange={(v) => {
                                const f = FUNDS.find((x) => x === v[0]);
                                if (f) setData('fund', f);
                            }}
                        >
                            {FUNDS.map((f) => (
                                <ToggleGroupItem key={f} value={f}>
                                    {FUND_LABEL[f]}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                        <p className="font-mono text-xs text-muted-foreground">
                            Saldo {formatRp(funds[data.fund])}
                        </p>
                        {data.fund === 'maintenance' && (
                            <p className="text-xs text-muted-foreground">
                                Servis alat? Catat dari halaman{' '}
                                <Link
                                    href={assetsIndex()}
                                    className="font-medium text-foreground underline underline-offset-2"
                                >
                                    Aset & Maintenance
                                </Link>{' '}
                                supaya masuk riwayat alatnya dan mereset jadwal
                                perawatan.
                            </p>
                        )}
                        <InputError message={errors.fund} />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="withdrawal-note">
                            Keterangan
                        </FieldLabel>
                        <Input
                            id="withdrawal-note"
                            placeholder="Beli backdrop pengganti"
                            value={data.note}
                            aria-invalid={Boolean(errors.note)}
                            onChange={(e) => setData('note', e.target.value)}
                        />
                        <InputError message={errors.note} />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <FieldLabel htmlFor="withdrawal-date">
                                Tanggal
                            </FieldLabel>
                            <Input
                                id="withdrawal-date"
                                type="date"
                                max={today}
                                value={data.withdrawn_on}
                                onChange={(e) =>
                                    setData('withdrawn_on', e.target.value)
                                }
                            />
                            <InputError message={errors.withdrawn_on} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="withdrawal-amount">
                                Nominal
                            </FieldLabel>
                            <Input
                                id="withdrawal-amount"
                                inputMode="numeric"
                                className="font-mono"
                                placeholder="0"
                                value={data.amount}
                                aria-invalid={Boolean(errors.amount)}
                                onChange={(e) =>
                                    setData(
                                        'amount',
                                        hanyaDigit(e.target.value),
                                    )
                                }
                            />
                        </Field>
                    </div>

                    {errors.amount && (
                        <div className="flex flex-col items-start gap-2">
                            <InputError message={errors.amount} />
                            {/* Saldo kurang → kekurangannya ditutup setoran owner dulu. */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onOpenContribution}
                            >
                                Catat Setoran Owner
                            </Button>
                        </div>
                    )}
                </FieldGroup>

                <DialogFooter>
                    <DialogClose
                        render={<Button variant="outline">Batal</Button>}
                    />
                    <Button
                        disabled={
                            Number(data.amount) <= 0 ||
                            data.note.trim() === '' ||
                            processing
                        }
                        onClick={() =>
                            form.post(CapitalController.storeWithdrawal().url, {
                                preserveScroll: true,
                                onSuccess: onClose,
                            })
                        }
                    >
                        Simpan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/** Nilai ToggleGroup "Dibiayai dari" untuk kas usaha — id owner selalu angka. */
const CASH = 'cash';

function InvestmentDialog({
    today,
    owners,
    onClose,
}: {
    today: string;
    owners: Owner[];
    onClose: () => void;
}) {
    const form = useForm<{
        description: string;
        paid_by: string;
        invested_on: string;
        amount: string;
    }>({
        description: '',
        paid_by: CASH,
        invested_on: today,
        amount: '',
    });
    const { data, setData, errors, processing } = form;
    const payer = owners.find((o) => String(o.id) === data.paid_by);

    const submit = () => {
        form.transform((d) => ({
            ...d,
            paid_by: d.paid_by === CASH ? null : d.paid_by,
        }));
        form.post(CapitalController.storeInvestment().url, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Catat Investasi</DialogTitle>
                    <DialogDescription>
                        Renovasi dan investasi lain di luar alat. Beli alat
                        dicatat lewat Aset & Maintenance supaya dana
                        maintenance-nya ikut terhitung.
                    </DialogDescription>
                </DialogHeader>

                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="investment-description">
                            Keterangan
                        </FieldLabel>
                        <Input
                            id="investment-description"
                            placeholder="Renovasi ruang studio"
                            value={data.description}
                            aria-invalid={Boolean(errors.description)}
                            onChange={(e) =>
                                setData('description', e.target.value)
                            }
                        />
                        <InputError message={errors.description} />
                    </Field>

                    <Field>
                        <FieldLabel>Dibiayai dari</FieldLabel>
                        <ToggleGroup
                            value={[data.paid_by]}
                            onValueChange={(v) =>
                                v[0] && setData('paid_by', v[0])
                            }
                        >
                            <ToggleGroupItem value={CASH}>
                                Kas usaha
                            </ToggleGroupItem>
                            {owners.map((o) => (
                                <ToggleGroupItem
                                    key={o.id}
                                    value={String(o.id)}
                                >
                                    {o.name}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                        <p className="text-xs text-muted-foreground">
                            {payer
                                ? `Otomatis tercatat sebagai setoran modal ${payer.name} — dipakai untuk menghitung progres balik modal.`
                                : 'Dibayar dari uang usaha. Tidak menambah modal siapa pun.'}
                        </p>
                        <InputError message={errors.paid_by} />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <FieldLabel htmlFor="investment-date">
                                Tanggal
                            </FieldLabel>
                            <Input
                                id="investment-date"
                                type="date"
                                max={today}
                                value={data.invested_on}
                                onChange={(e) =>
                                    setData('invested_on', e.target.value)
                                }
                            />
                            <InputError message={errors.invested_on} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="investment-amount">
                                Nominal
                            </FieldLabel>
                            <Input
                                id="investment-amount"
                                inputMode="numeric"
                                className="font-mono"
                                placeholder="0"
                                value={data.amount}
                                aria-invalid={Boolean(errors.amount)}
                                onChange={(e) =>
                                    setData(
                                        'amount',
                                        hanyaDigit(e.target.value),
                                    )
                                }
                            />
                            <InputError message={errors.amount} />
                        </Field>
                    </div>
                </FieldGroup>

                <DialogFooter>
                    <DialogClose
                        render={<Button variant="outline">Batal</Button>}
                    />
                    <Button
                        disabled={
                            Number(data.amount) <= 0 ||
                            data.description.trim() === '' ||
                            processing
                        }
                        onClick={submit}
                    >
                        Simpan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function RuleDialog({
    owners,
    month,
    nextMonth,
    base,
    onClose,
}: {
    owners: Owner[];
    month: string;
    nextMonth: string;
    base: Rule | undefined;
    onClose: () => void;
}) {
    const form = useForm<{
        effective_month: string;
        reserve_percent: string;
        shares: Record<string, string>;
    }>({
        effective_month: nextMonth,
        reserve_percent: String(base?.reserve_percent ?? 10),
        shares: Object.fromEntries(
            owners.map((o) => [
                String(o.id),
                String(
                    base?.shares.find((s) => s.owner_id === o.id)?.percent ?? 0,
                ),
            ]),
        ),
    });
    const { data, setData, errors, processing } = form;
    const total = Object.values(data.shares).reduce(
        (s, p) => s + (Number(p) || 0),
        0,
    );

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ubah Rasio Bagi Hasil</DialogTitle>
                    <DialogDescription>
                        Menambah aturan baru, bukan mengedit yang lama — bagi
                        hasil bulan sebelumnya tidak ikut berubah.
                    </DialogDescription>
                </DialogHeader>

                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="effective-month">
                            Berlaku mulai
                        </FieldLabel>
                        <Input
                            id="effective-month"
                            type="month"
                            min={month}
                            value={data.effective_month}
                            aria-invalid={Boolean(errors.effective_month)}
                            onChange={(e) =>
                                setData('effective_month', e.target.value)
                            }
                        />
                        <InputError message={errors.effective_month} />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        {owners.map((o) => (
                            <Field key={o.id}>
                                <FieldLabel htmlFor={`share-${o.id}`}>
                                    Bagian {o.name} (%)
                                </FieldLabel>
                                <Input
                                    id={`share-${o.id}`}
                                    inputMode="numeric"
                                    className="font-mono"
                                    value={data.shares[String(o.id)] ?? ''}
                                    onChange={(e) =>
                                        setData('shares', {
                                            ...data.shares,
                                            [String(o.id)]: hanyaDigit(
                                                e.target.value,
                                            ),
                                        })
                                    }
                                />
                            </Field>
                        ))}
                    </div>
                    <InputError message={errors.shares} />

                    <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <FieldLabel htmlFor="reserve-percent">
                                Dana cadangan (%)
                            </FieldLabel>
                            <Input
                                id="reserve-percent"
                                inputMode="numeric"
                                className="font-mono"
                                value={data.reserve_percent}
                                aria-invalid={Boolean(errors.reserve_percent)}
                                onChange={(e) =>
                                    setData(
                                        'reserve_percent',
                                        hanyaDigit(e.target.value),
                                    )
                                }
                            />
                            <InputError message={errors.reserve_percent} />
                        </Field>
                    </div>

                    <p
                        className={`text-xs ${total === 100 ? 'text-muted-foreground' : 'text-destructive'}`}
                    >
                        {total === 100
                            ? 'Dana cadangan diambil dulu dari laba yang dibagi, sisanya dibagi ke owner sesuai persen di atas.'
                            : `Total bagian owner ${total}%, harus 100%.`}
                    </p>
                </FieldGroup>

                <DialogFooter>
                    <DialogClose
                        render={<Button variant="outline">Batal</Button>}
                    />
                    <Button
                        disabled={total !== 100 || processing}
                        onClick={() =>
                            form.post(CapitalController.storeRule().url, {
                                preserveScroll: true,
                                onSuccess: onClose,
                            })
                        }
                    >
                        Simpan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Summary({
    label,
    value,
    note,
}: {
    label: string;
    value: number;
    note: string;
}) {
    return (
        <Card className="p-5">
            <CardHeader className="p-0">
                <CardDescription className="text-xs">{label}</CardDescription>
                <CardTitle className="font-mono text-2xl font-semibold">
                    {formatRp(value)}
                </CardTitle>
            </CardHeader>
            <p className="text-xs text-muted-foreground">{note}</p>
        </Card>
    );
}
