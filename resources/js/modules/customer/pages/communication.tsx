/**
 * Komunikasi — Blast WhatsApp, Blast Email, Template (prompt 4.16–4.18,
 * porting web/app/routes/komunikasi.tsx).
 *
 * Tiga tab dalam satu layar: ketiganya memakai daftar customer dan template
 * yang sama. Di tab WhatsApp TIDAK ADA tombol "Kirim Semua" — blast otomatis
 * butuh WhatsApp Business API (verifikasi Meta, template disetujui, biaya per
 * pesan); app menyiapkan, owner yang mengirim. Email volumenya kecil, jadi
 * benar-benar dikirim dari app.
 */

import { Head, useForm } from '@inertiajs/react';
import { Copy, ExternalLink, Info, Send, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import CommunicationController from '@/actions/Modules/Customer/Controllers/CommunicationController';
import { KosongTabel, TabelData } from '@/components/data-table';
import InputError from '@/components/input-error';
import { LineMark } from '@/components/status-order';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
    formatRp,
    formatTanggal,
    keNomorWa,
    namaDepan,
    personalise,
} from '@/lib/format';
import { index as communicationIndex } from '@/routes/communication';
import type { BusinessLine } from '@/types/domain';

/** Broadcast list WhatsApp Business dibatasi 256 kontak — batasan WA, bukan app. */
const BROADCAST_LIMIT = 256;

type Channel = 'phone' | 'email';
type LineFilter = 'all' | BusinessLine;
const LINE_FILTERS: LineFilter[] = ['all', 'studio', 'event', 'retail'];

interface CustomerRow {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    source: string | null;
    lines: BusinessLine[];
    last_transaction: string | null;
}

interface Template {
    key: string;
    title: string;
    when: string;
    body: string;
}

/**
 * Nilai contoh untuk pratinjau template — termasuk placeholder template
 * Tagihan, supaya owner melihat hasil akhirnya sebelum menyimpan.
 */
function contoh(sampleName: string): Record<string, string> {
    return {
        nama: namaDepan(sampleName),
        link: '[link]',
        nomor: 'ORD-0012',
        sisa: formatRp(1_200_000),
        jatuh_tempo: formatTanggal('2026-10-12'),
    };
}

export default function Communication({
    customers,
    templates,
}: {
    customers: CustomerRow[];
    templates: Template[];
}) {
    const promo = templates.find((t) => t.key === 'promo')?.body ?? '';

    return (
        <>
            <Head title="Komunikasi" />
            <h1 className="sr-only">Komunikasi</h1>

            <div className="flex flex-col gap-6 p-6">
                <Tabs defaultValue="wa">
                    <TabsList>
                        <TabsTrigger value="wa">Blast WhatsApp</TabsTrigger>
                        <TabsTrigger value="email">Blast Email</TabsTrigger>
                        <TabsTrigger value="template">Template</TabsTrigger>
                    </TabsList>

                    <TabsContent value="wa" className="mt-4">
                        <WhatsAppTab
                            customers={customers}
                            initialBody={promo}
                        />
                    </TabsContent>
                    <TabsContent value="email" className="mt-4">
                        <EmailTab customers={customers} initialBody={promo} />
                    </TabsContent>
                    <TabsContent value="template" className="mt-4">
                        <TemplatesTab
                            templates={templates}
                            sampleName={customers[0]?.name ?? 'Customer'}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}

Communication.layout = {
    breadcrumbs: [{ title: 'Komunikasi', href: communicationIndex() }],
};

/** Penerima yang punya kontak di kanal itu, plus pilihan centang. */
function useRecipients(customers: CustomerRow[], channel: Channel) {
    const [filter, setFilter] = useState<LineFilter>('all');
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const recipients = customers
        .filter((c) => (filter === 'all' ? true : c.lines.includes(filter)))
        .filter((c) => Boolean(c[channel]));
    const chosen = recipients.filter((c) => selected.has(c.id));
    const allChecked =
        recipients.length > 0 && chosen.length === recipients.length;

    const toggle = (id: number) =>
        setSelected((s) => {
            const next = new Set(s);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    const toggleAll = () =>
        setSelected(
            allChecked ? new Set() : new Set(recipients.map((c) => c.id)),
        );

    return {
        filter,
        setFilter,
        recipients,
        chosen,
        allChecked,
        toggle,
        toggleAll,
        selected,
    };
}

function WhatsAppTab({
    customers,
    initialBody,
}: {
    customers: CustomerRow[];
    initialBody: string;
}) {
    const r = useRecipients(customers, 'phone');
    const [body, setBody] = useState(initialBody);

    const copyNumbers = async () => {
        await navigator.clipboard.writeText(
            r.chosen.map((c) => keNomorWa(c.phone ?? '')).join('\n'),
        );
        toast.success(
            `${r.chosen.length} nomor disalin — tempel ke broadcast list di WhatsApp Business.`,
        );
    };

    return (
        <div className="flex min-w-0 flex-col gap-4">
            {/*
                Alert batasan WA di PALING ATAS: kalau di bawah, owner sudah
                membayangkan "pilih semua lalu kirim" sebelum membaca kenapa
                itu tidak ada.
            */}
            <Alert>
                <TriangleAlert />
                <AlertTitle>App menyiapkan, pengiriman tetap manual</AlertTitle>
                <AlertDescription>
                    Blast WhatsApp otomatis butuh WhatsApp Business API —
                    verifikasi bisnis ke Meta, template harus disetujui dulu,
                    dan ada biaya per pesan terkirim. Untuk customer yang masih
                    puluhan, biayanya jauh melebihi manfaatnya. Di sini app
                    menyiapkan nomor dan pesannya, lalu kamu yang mengirim lewat
                    WhatsApp.
                </AlertDescription>
            </Alert>

            <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[1fr_24rem]">
                <section className="flex min-w-0 flex-col gap-4">
                    <LineFilterTabs value={r.filter} onChange={r.setFilter} />
                    <RecipientTable
                        channel="phone"
                        recipients={r.recipients}
                        selected={r.selected}
                        allChecked={r.allChecked}
                        onToggle={r.toggle}
                        onToggleAll={r.toggleAll}
                        action={(c) => (
                            <Button
                                size="sm"
                                variant="outline"
                                nativeButton={false}
                                render={
                                    <a
                                        href={`https://wa.me/${keNomorWa(c.phone ?? '')}?text=${encodeURIComponent(
                                            personalise(body, {
                                                nama: namaDepan(c.name),
                                                // Blast tidak punya link per customer.
                                                link: '',
                                            }),
                                        )}`}
                                        target="_blank"
                                        rel="noreferrer"
                                    />
                                }
                            >
                                Buka WhatsApp
                                <ExternalLink data-icon="inline-end" />
                            </Button>
                        )}
                    />
                </section>

                <MessagePanel
                    body={body}
                    onChange={setBody}
                    sampleName={(r.chosen[0] ?? r.recipients[0])?.name}
                    count={r.chosen.length}
                >
                    <Button
                        variant="outline"
                        disabled={r.chosen.length === 0}
                        onClick={copyNumbers}
                    >
                        <Copy data-icon="inline-start" />
                        Salin nomor terpilih
                    </Button>
                    {/* Sengaja TIDAK ada tombol "Kirim Semua" — lihat catatan di atas. */}
                    <Alert>
                        <Info />
                        <AlertTitle>Dua batasan WhatsApp</AlertTitle>
                        <AlertDescription>
                            Broadcast list dibatasi {BROADCAST_LIMIT} kontak,
                            dan pesan broadcast hanya sampai ke penerima yang
                            sudah menyimpan nomor studio. Keduanya batasan
                            WhatsApp, bukan batasan app.
                            {r.chosen.length > BROADCAST_LIMIT && (
                                <>
                                    {' '}
                                    Pilihan saat ini {r.chosen.length} kontak —
                                    harus dipecah.
                                </>
                            )}
                        </AlertDescription>
                    </Alert>
                </MessagePanel>
            </div>
        </div>
    );
}

function EmailTab({
    customers,
    initialBody,
}: {
    customers: CustomerRow[];
    initialBody: string;
}) {
    const r = useRecipients(customers, 'email');
    const form = useForm<{ subject: string; body: string }>({
        subject: '',
        body: initialBody,
    });
    const { data, setData, processing } = form;
    // Error baris berkunci "customer_ids.0" — tidak ada di tipe form.
    const errors: Record<string, string | undefined> = form.errors;
    /**
     * Customer tanpa email dihitung eksplisit: tanpa angka ini owner mengira
     * blast sampai ke semua customer, dan baru sadar saat responsnya sepi.
     */
    const withoutEmail = customers.filter((c) => !c.email);

    const send = () => {
        form.transform((d) => ({
            ...d,
            customer_ids: r.chosen.map((c) => c.id),
        }));
        form.post(CommunicationController.sendEmail().url, {
            preserveScroll: true,
        });
    };

    return (
        <div className="flex min-w-0 flex-col gap-4">
            {withoutEmail.length > 0 && (
                <Alert>
                    <TriangleAlert />
                    <AlertTitle>
                        {withoutEmail.length} customer tidak masuk daftar —
                        belum ada email
                    </AlertTitle>
                    <AlertDescription>
                        {withoutEmail.map((c) => c.name).join(', ')}. Mereka
                        tetap bisa dihubungi lewat tab Blast WhatsApp.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[1fr_24rem]">
                <section className="flex min-w-0 flex-col gap-4">
                    <LineFilterTabs value={r.filter} onChange={r.setFilter} />
                    <RecipientTable
                        channel="email"
                        recipients={r.recipients}
                        selected={r.selected}
                        allChecked={r.allChecked}
                        onToggle={r.toggle}
                        onToggleAll={r.toggleAll}
                    />
                    <InputError
                        message={
                            errors.customer_ids ?? errors['customer_ids.0']
                        }
                    />
                </section>

                <MessagePanel
                    body={data.body}
                    onChange={(v) => setData('body', v)}
                    sampleName={(r.chosen[0] ?? r.recipients[0])?.name}
                    count={r.chosen.length}
                    header={
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="email-subject" className="text-sm">
                                Subjek
                            </label>
                            <Input
                                id="email-subject"
                                placeholder="Promo cetak foto bulan ini"
                                value={data.subject}
                                aria-invalid={Boolean(errors.subject)}
                                onChange={(e) =>
                                    setData('subject', e.target.value)
                                }
                            />
                            <InputError message={errors.subject} />
                        </div>
                    }
                >
                    <InputError message={errors.body} />
                    {/* Email bisa dikirim langsung dari app (business-flow 5.6) — tombol
                        "Kirim" di sini jujur, berbeda dengan tab WhatsApp. */}
                    <Button
                        disabled={
                            r.chosen.length === 0 ||
                            data.subject.trim() === '' ||
                            processing
                        }
                        onClick={send}
                    >
                        <Send data-icon="inline-start" />
                        Kirim Email
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        Dikirim satu per satu (nama terisi per customer, alamat
                        customer lain tidak terlihat). Volume masih kecil, jadi
                        tanpa layanan blast berbayar.
                    </p>
                </MessagePanel>
            </div>
        </div>
    );
}

function TemplatesTab({
    templates,
    sampleName,
}: {
    templates: Template[];
    sampleName: string;
}) {
    return (
        <div className="flex min-w-0 flex-col gap-6">
            <Alert>
                <Info />
                <AlertTitle>Template bisa diedit owner</AlertTitle>
                <AlertDescription>
                    <code className="font-mono">{'{nama}'}</code> diganti nama
                    depan customer,{' '}
                    <code className="font-mono">{'{link}'}</code> diganti link
                    hasil foto dari order. Template Tagihan juga memakai{' '}
                    <code className="font-mono">{'{nomor}'}</code>,{' '}
                    <code className="font-mono">{'{sisa}'}</code>,{' '}
                    <code className="font-mono">{'{jatuh_tempo}'}</code>, dan{' '}
                    <code className="font-mono">{'{link}'}</code> (link
                    invoice). Template Promo jadi isi awal pesan di tab blast.
                </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {templates.map((t) => (
                    <TemplateCard
                        key={t.key}
                        template={t}
                        sampleName={sampleName}
                    />
                ))}
            </div>
        </div>
    );
}

function TemplateCard({
    template,
    sampleName,
}: {
    template: Template;
    sampleName: string;
}) {
    const form = useForm({ body: template.body });
    const { data, setData, errors, processing } = form;

    return (
        <section className="flex min-w-0 flex-col gap-3 rounded-lg border p-5">
            <div className="flex flex-col gap-0.5">
                <h3 className="text-sm font-semibold">{template.title}</h3>
                <p className="text-xs text-muted-foreground">{template.when}</p>
            </div>
            <Textarea
                rows={6}
                value={data.body}
                onChange={(e) => setData('body', e.target.value)}
            />
            <InputError message={errors.body} />
            <div className="flex flex-col gap-1 rounded-md bg-muted p-3">
                <span className="text-xs text-muted-foreground">Pratinjau</span>
                <p className="text-sm whitespace-pre-line">
                    {personalise(data.body, contoh(sampleName))}
                </p>
            </div>
            <Button
                variant="outline"
                className="self-end"
                disabled={processing || data.body === template.body}
                onClick={() =>
                    form.put(
                        CommunicationController.updateTemplate(template.key)
                            .url,
                        { preserveScroll: true },
                    )
                }
            >
                Simpan template
            </Button>
        </section>
    );
}

function LineFilterTabs({
    value,
    onChange,
}: {
    value: LineFilter;
    onChange: (v: LineFilter) => void;
}) {
    return (
        <Tabs
            value={value}
            onValueChange={(v) => {
                const f = LINE_FILTERS.find((x) => x === v);
                if (f) onChange(f);
            }}
        >
            <TabsList>
                <TabsTrigger value="all">Semua</TabsTrigger>
                <TabsTrigger value="studio">Pernah studio</TabsTrigger>
                <TabsTrigger value="event">Pernah event</TabsTrigger>
                <TabsTrigger value="retail">Pernah retail</TabsTrigger>
            </TabsList>
        </Tabs>
    );
}

function RecipientTable({
    channel,
    recipients,
    selected,
    allChecked,
    onToggle,
    onToggleAll,
    action,
}: {
    channel: Channel;
    recipients: CustomerRow[];
    selected: Set<number>;
    allChecked: boolean;
    onToggle: (id: number) => void;
    onToggleAll: () => void;
    action?: (c: CustomerRow) => ReactNode;
}) {
    if (recipients.length === 0) {
        return (
            <KosongTabel
                kalimat={`Tidak ada customer dengan ${channel === 'phone' ? 'nomor HP' : 'email'} pada filter ini.`}
            />
        );
    }

    return (
        <TabelData>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-10">
                        <Checkbox
                            aria-label="Pilih semua customer"
                            checked={allChecked}
                            onCheckedChange={onToggleAll}
                        />
                    </TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>
                        {channel === 'phone' ? 'No HP' : 'Email'}
                    </TableHead>
                    <TableHead>Pernah beli</TableHead>
                    <TableHead>Transaksi terakhir</TableHead>
                    {/* Sumber disembunyikan di bawah 2xl: di samping panel pesan, kolom
                        ini yang membuat tombol Buka WhatsApp terdorong keluar. */}
                    <TableHead className="hidden 2xl:table-cell">
                        Sumber
                    </TableHead>
                    {action && <TableHead />}
                </TableRow>
            </TableHeader>
            <TableBody>
                {recipients.map((c) => (
                    <TableRow key={c.id}>
                        <TableCell>
                            <Checkbox
                                aria-label={`Pilih ${c.name}`}
                                checked={selected.has(c.id)}
                                onCheckedChange={() => onToggle(c.id)}
                            />
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                            {c.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                            {c[channel]}
                        </TableCell>
                        <TableCell>
                            <span className="flex gap-3">
                                {c.lines.map((l) => (
                                    <LineMark key={l} line={l} />
                                ))}
                            </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                            {c.last_transaction
                                ? formatTanggal(c.last_transaction)
                                : '—'}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground 2xl:table-cell">
                            {c.source ?? '—'}
                        </TableCell>
                        {action && <TableCell>{action(c)}</TableCell>}
                    </TableRow>
                ))}
            </TableBody>
        </TabelData>
    );
}

function MessagePanel({
    body,
    onChange,
    sampleName,
    count,
    header,
    children,
}: {
    body: string;
    onChange: (v: string) => void;
    sampleName: string | undefined;
    count: number;
    header?: ReactNode;
    children: ReactNode;
}) {
    return (
        <aside className="flex min-w-0 flex-col gap-4 self-start rounded-lg border p-5">
            <div className="flex flex-col gap-1">
                <h2 className="font-heading text-base font-semibold">Pesan</h2>
                <p className="text-xs text-muted-foreground">
                    <code className="font-mono">{'{nama}'}</code> diganti nama
                    depan customer. Isi awal dari template Promo; perubahan di
                    sini hanya untuk blast ini.
                </p>
            </div>
            {header}
            <Textarea
                rows={7}
                value={body}
                onChange={(e) => onChange(e.target.value)}
            />
            {sampleName && (
                <div className="flex flex-col gap-1 rounded-md bg-muted p-3">
                    <span className="text-xs text-muted-foreground">
                        Pratinjau
                    </span>
                    <p className="text-sm whitespace-pre-line">
                        {personalise(body, contoh(sampleName))}
                    </p>
                </div>
            )}
            <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">Terpilih</span>
                <span className="font-mono font-medium">{count} customer</span>
            </div>
            {children}
        </aside>
    );
}
