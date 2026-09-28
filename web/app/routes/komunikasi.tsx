/**
 * Komunikasi — Template, Blast Email, Blast WhatsApp (prompt 4.16–4.18).
 *
 * Tiga tab dalam satu layar, bukan tiga menu: ketiganya memakai daftar customer
 * dan template yang sama, dan memisahkannya jadi tiga entri sidebar akan
 * menambah tiga item pada menu yang sudah 10 (R8).
 *
 * Keputusan yang paling menentukan ada di tab WhatsApp: blast WA otomatis
 * memerlukan WhatsApp Business API — verifikasi bisnis ke Meta, template harus
 * disetujui, dan ada biaya per pesan. Untuk customer yang masih puluhan,
 * biayanya jauh melebihi manfaatnya. Jadi app menyiapkan, owner yang mengirim,
 * dan konsekuensinya: TIDAK ADA tombol "Kirim Semua" di tab itu. Menyediakannya
 * berarti menjanjikan sesuatu yang tidak dilakukan app.
 */

import { useMemo, useState } from "react";
import { Copy, ExternalLink, Info, Send, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { HeaderHalaman, KontenHalaman, NAMA_STUDIO } from "~/components/app-shell";
import { KosongTabel, TabelData } from "~/components/data-table";
import { TandaLini } from "~/components/status-order";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import {
  ringkasanCustomer,
  type Customer,
  type Lini,
  type RingkasanCustomer,
} from "~/lib/dummy";
import { useDataDemo } from "~/lib/store";
import { formatTanggal, keNomorWa } from "~/lib/format";

/** Broadcast list WhatsApp Business dibatasi 256 kontak. Batasan WA, bukan app. */
const BATAS_BROADCAST = 256;

const TEMPLATE_AWAL = {
  promo:
    "Halo {nama}! Studio Foto Agung ada promo cetak foto bulan ini: " +
    "gratis 1 keychain untuk setiap cetak 10R + bingkai. Berlaku sampai akhir " +
    "bulan. Kalau berminat balas pesan ini ya, terima kasih 🙏",
  terimaKasih:
    "Halo {nama}, terima kasih sudah mempercayakan momennya ke Studio Foto " +
    "Agung! Hasil fotonya bisa diunduh di sini: {link}\n\n" +
    "Kalau berkenan, kami sangat terbantu kalau {nama} meninggalkan ulasan " +
    "singkat. Sampai jumpa di sesi berikutnya!",
  reminder:
    "Halo {nama}, mengingatkan sesi foto besok di Studio Foto Agung. " +
    "Datang 10 menit lebih awal ya supaya persiapannya santai. " +
    "Kalau ada perubahan jadwal, balas pesan ini.",
};

type KunciTemplate = keyof typeof TEMPLATE_AWAL;

const JUDUL_TEMPLATE: Record<KunciTemplate, { judul: string; kapan: string }> = {
  promo: { judul: "Promo / blast", kapan: "Dikirim manual saat ada promo." },
  terimaKasih: {
    judul: "Thank You mail",
    kapan: "Dikirim saat order berpindah ke status Diserahkan.",
  },
  reminder: {
    judul: "Reminder H-1",
    kapan: "Dikirim sehari sebelum sesi studio atau acara.",
  },
};

export default function Komunikasi() {
  // Daftar ke store demo supaya perubahan dari layar lain (pembayaran,
  // biaya, status order, katalog) langsung terlihat di sini.
  useDataDemo();
  const [template, setTemplate] = useState(TEMPLATE_AWAL);

  return (
    <>
      <HeaderHalaman judul="Komunikasi" />
      <KontenHalaman>
        <Tabs defaultValue="wa">
          <TabsList>
            <TabsTrigger value="wa">Blast WhatsApp</TabsTrigger>
            <TabsTrigger value="email">Blast Email</TabsTrigger>
            <TabsTrigger value="template">Template</TabsTrigger>
          </TabsList>

          <TabsContent value="wa" className="mt-4">
            <TabWhatsApp
              template={template.promo}
              onUbah={(v) => setTemplate((t) => ({ ...t, promo: v }))}
            />
          </TabsContent>

          <TabsContent value="email" className="mt-4">
            <TabEmail
              template={template.promo}
              onUbah={(v) => setTemplate((t) => ({ ...t, promo: v }))}
            />
          </TabsContent>

          <TabsContent value="template" className="mt-4">
            <TabTemplate template={template} onUbah={setTemplate} />
          </TabsContent>
        </Tabs>
      </KontenHalaman>
    </>
  );
}

/** Ganti placeholder. `{nama}` diikat kurung kurawal supaya kata "nama" di
 *  prosa Indonesia ("atas nama", "nama lengkap") tidak ikut tergantikan. */
function isiPlaceholder(teks: string, nama: string, link = "") {
  return teks
    .replace(/\{nama\}/g, nama.split(" ")[0])
    .replace(/\{link\}/g, link || "[link hasil foto]");
}

/**
 * Customer yang punya kontak — dasar kedua tab blast.
 *
 * Diawali `use` karena memanggil useMemo: React mengandalkan prefiks itu untuk
 * mengecek rules-of-hooks, dan fungsi ber-hook tanpa prefiks lolos dari
 * pemeriksaan tanpa peringatan apa pun.
 */
function usePenerima(kanal: "hp" | "email", filter: "semua" | Lini) {
  return useMemo<RingkasanCustomer[]>(
    () =>
      ringkasanCustomer()
        .filter((r) => r.customer.id !== "CUS-00")
        .filter((r) => (filter === "semua" ? true : r.lini.includes(filter)))
        .filter((r) => Boolean(r.customer[kanal])),
    [kanal, filter],
  );
}

function usePilihan() {
  const [terpilih, setTerpilih] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setTerpilih((s) => {
      const baru = new Set(s);
      baru.has(id) ? baru.delete(id) : baru.add(id);
      return baru;
    });
  return { terpilih, setTerpilih, toggle };
}

function TabWhatsApp({
  template,
  onUbah,
}: {
  template: string;
  onUbah: (v: string) => void;
}) {
  const [filter, setFilter] = useState<"semua" | Lini>("semua");
  const penerima = usePenerima("hp", filter);
  const { terpilih, setTerpilih, toggle } = usePilihan();

  const dipilih = penerima.filter((r) => terpilih.has(r.customer.id));
  const semuaTercentang =
    penerima.length > 0 && dipilih.length === penerima.length;

  const salinNomor = async () => {
    await navigator.clipboard.writeText(
      dipilih.map((r) => keNomorWa(r.customer.hp!)).join("\n"),
    );
    toast.success(`${dipilih.length} nomor disalin`, {
      description: "Tempel ke broadcast list di WhatsApp Business.",
    });
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/*
        Alert batasan WA di PALING ATAS, sebelum daftar dan sebelum editor.
        Kalau ditaruh di bawah, owner sudah membayangkan "pilih semua lalu
        kirim" sebelum membaca kenapa itu tidak ada.
      */}
      <Alert>
        <TriangleAlert />
        <AlertTitle>App menyiapkan, pengiriman tetap manual</AlertTitle>
        <AlertDescription>
          Blast WhatsApp otomatis butuh WhatsApp Business API — verifikasi bisnis
          ke Meta, template harus disetujui dulu, dan ada biaya per pesan
          terkirim. Untuk customer yang masih puluhan, biayanya jauh melebihi
          manfaatnya. Di sini app menyiapkan nomor dan pesannya, lalu kamu yang
          mengirim lewat WhatsApp.
        </AlertDescription>
      </Alert>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[1fr_24rem]">
        <section className="flex min-w-0 flex-col gap-4">
          <FilterLini nilai={filter} onUbah={setFilter} />
          <TabelPenerima
            kanal="hp"
            penerima={penerima}
            terpilih={terpilih}
            onToggle={toggle}
            onToggleSemua={() =>
              setTerpilih(
                semuaTercentang
                  ? new Set()
                  : new Set(penerima.map((r) => r.customer.id)),
              )
            }
            semuaTercentang={semuaTercentang}
            aksi={(c) => (
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={
                  <a
                    href={`https://wa.me/${keNomorWa(c.hp!)}?text=${encodeURIComponent(isiPlaceholder(template, c.nama))}`}
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

        <PanelPesan
          template={template}
          onUbah={onUbah}
          contoh={dipilih[0]?.customer ?? penerima[0]?.customer}
          jumlah={dipilih.length}
        >
          <Button
            variant="outline"
            disabled={dipilih.length === 0}
            onClick={salinNomor}
          >
            <Copy data-icon="inline-start" />
            Salin nomor terpilih
          </Button>
          {/* Sengaja TIDAK ada tombol "Kirim Semua". Lihat catatan di atas. */}

          <Alert>
            <Info />
            <AlertTitle>Dua batasan WhatsApp</AlertTitle>
            <AlertDescription>
              Broadcast list dibatasi {BATAS_BROADCAST} kontak, dan pesan
              broadcast hanya sampai ke penerima yang sudah menyimpan nomor
              studio. Keduanya batasan WhatsApp, bukan batasan app.
              {dipilih.length > BATAS_BROADCAST && (
                <> Pilihan saat ini {dipilih.length} kontak — harus dipecah.</>
              )}
            </AlertDescription>
          </Alert>
        </PanelPesan>
      </div>
    </div>
  );
}

function TabEmail({
  template,
  onUbah,
}: {
  template: string;
  onUbah: (v: string) => void;
}) {
  const [filter, setFilter] = useState<"semua" | Lini>("semua");
  const penerima = usePenerima("email", filter);
  const { terpilih, setTerpilih, toggle } = usePilihan();

  const dipilih = penerima.filter((r) => terpilih.has(r.customer.id));
  const semuaTercentang =
    penerima.length > 0 && dipilih.length === penerima.length;

  /**
   * Customer tanpa email dihitung eksplisit dan ditampilkan sebagai Alert.
   * Tanpa angka ini, owner mengira blast sampai ke semua customer padahal
   * sebagian tidak pernah menerimanya — dan itu baru ketahuan saat responsnya
   * sepi.
   */
  const tanpaEmail = ringkasanCustomer().filter(
    (r) => r.customer.id !== "CUS-00" && !r.customer.email,
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {tanpaEmail.length > 0 && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>
            {tanpaEmail.length} customer tidak masuk daftar — belum ada email
          </AlertTitle>
          <AlertDescription>
            {tanpaEmail.map((r) => r.customer.nama).join(", ")}. Mereka tetap
            bisa dihubungi lewat tab Blast WhatsApp.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[1fr_24rem]">
        <section className="flex min-w-0 flex-col gap-4">
          <FilterLini nilai={filter} onUbah={setFilter} />
          <TabelPenerima
            kanal="email"
            penerima={penerima}
            terpilih={terpilih}
            onToggle={toggle}
            onToggleSemua={() =>
              setTerpilih(
                semuaTercentang
                  ? new Set()
                  : new Set(penerima.map((r) => r.customer.id)),
              )
            }
            semuaTercentang={semuaTercentang}
          />
        </section>

        <PanelPesan
          template={template}
          onUbah={onUbah}
          contoh={dipilih[0]?.customer ?? penerima[0]?.customer}
          jumlah={dipilih.length}
        >
          {/*
            Email volumenya kecil sehingga bisa dikirim langsung dari app tanpa
            layanan khusus (business-flow 5.6) — jadi di sini tombol "Kirim"
            memang jujur, berbeda dengan tab WhatsApp.
          */}
          <Button
            disabled={dipilih.length === 0}
            onClick={() =>
              toast.success(`Email terkirim ke ${dipilih.length} customer`, {
                description: `Dikirim dari ${NAMA_STUDIO}.`,
              })
            }
          >
            <Send data-icon="inline-start" />
            Kirim Email
          </Button>
          <p className="text-xs text-muted-foreground">
            Volume email masih kecil, jadi bisa dikirim langsung dari app tanpa
            layanan blast berbayar.
          </p>
        </PanelPesan>
      </div>
    </div>
  );
}

function TabTemplate({
  template,
  onUbah,
}: {
  template: typeof TEMPLATE_AWAL;
  onUbah: (t: typeof TEMPLATE_AWAL) => void;
}) {
  const contoh = ringkasanCustomer()[0]?.customer;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Alert>
        <Info />
        <AlertTitle>Template bisa diedit owner</AlertTitle>
        <AlertDescription>
          <code className="font-mono">{"{nama}"}</code> diganti nama depan
          customer, <code className="font-mono">{"{link}"}</code> diganti link
          hasil foto dari order. Perubahan langsung dipakai di tab blast.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {(Object.keys(template) as KunciTemplate[]).map((kunci) => (
          <section
            key={kunci}
            className="flex min-w-0 flex-col gap-3 rounded-lg border p-5"
          >
            <div className="flex flex-col gap-0.5">
              <h3 className="text-sm font-semibold">
                {JUDUL_TEMPLATE[kunci].judul}
              </h3>
              <p className="text-xs text-muted-foreground">
                {JUDUL_TEMPLATE[kunci].kapan}
              </p>
            </div>
            <Textarea
              rows={6}
              value={template[kunci]}
              onChange={(e) => onUbah({ ...template, [kunci]: e.target.value })}
            />
            {contoh && (
              <div className="flex flex-col gap-1 rounded-md bg-muted p-3">
                <span className="text-xs text-muted-foreground">Pratinjau</span>
                <p className="text-sm whitespace-pre-line">
                  {isiPlaceholder(template[kunci], contoh.nama)}
                </p>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function FilterLini({
  nilai,
  onUbah,
}: {
  nilai: "semua" | Lini;
  onUbah: (v: "semua" | Lini) => void;
}) {
  return (
    <Tabs value={nilai} onValueChange={(v) => onUbah(v as "semua" | Lini)}>
      <TabsList>
        <TabsTrigger value="semua">Semua</TabsTrigger>
        <TabsTrigger value="studio">Pernah studio</TabsTrigger>
        <TabsTrigger value="event">Pernah event</TabsTrigger>
        <TabsTrigger value="retail">Pernah retail</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

function TabelPenerima({
  kanal,
  penerima,
  terpilih,
  onToggle,
  onToggleSemua,
  semuaTercentang,
  aksi,
}: {
  kanal: "hp" | "email";
  penerima: RingkasanCustomer[];
  terpilih: Set<string>;
  onToggle: (id: string) => void;
  onToggleSemua: () => void;
  semuaTercentang: boolean;
  aksi?: (c: Customer) => React.ReactNode;
}) {
  if (penerima.length === 0) {
    return (
      <KosongTabel
        kalimat={`Tidak ada customer dengan ${kanal === "hp" ? "nomor HP" : "email"} pada filter ini.`}
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
              checked={semuaTercentang}
              onCheckedChange={onToggleSemua}
            />
          </TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>{kanal === "hp" ? "No HP" : "Email"}</TableHead>
          <TableHead>Pernah beli</TableHead>
          <TableHead>Transaksi terakhir</TableHead>
          <TableHead>Sumber</TableHead>
          {aksi && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {penerima.map((r) => (
          <TableRow key={r.customer.id}>
            <TableCell>
              <Checkbox
                aria-label={`Pilih ${r.customer.nama}`}
                checked={terpilih.has(r.customer.id)}
                onCheckedChange={() => onToggle(r.customer.id)}
              />
            </TableCell>
            <TableCell className="font-medium whitespace-nowrap">
              {r.customer.nama}
            </TableCell>
            <TableCell className="font-mono text-xs whitespace-nowrap">
              {r.customer[kanal]}
            </TableCell>
            <TableCell>
              <span className="flex gap-3">
                {r.lini.map((l) => (
                  <TandaLini key={l} lini={l} />
                ))}
              </span>
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {r.terakhirTransaksi ? formatTanggal(r.terakhirTransaksi) : "—"}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {r.customer.sumber ?? "—"}
            </TableCell>
            {aksi && <TableCell>{aksi(r.customer)}</TableCell>}
          </TableRow>
        ))}
      </TableBody>
    </TabelData>
  );
}

function PanelPesan({
  template,
  onUbah,
  contoh,
  jumlah,
  children,
}: {
  template: string;
  onUbah: (v: string) => void;
  contoh?: Customer;
  jumlah: number;
  children: React.ReactNode;
}) {
  return (
    <aside className="flex min-w-0 flex-col gap-4 self-start rounded-lg border p-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-base font-semibold">Pesan</h2>
        <p className="text-xs text-muted-foreground">
          <code className="font-mono">{"{nama}"}</code> diganti nama depan
          customer. Edit lengkap ada di tab Template.
        </p>
      </div>

      <Textarea rows={7} value={template} onChange={(e) => onUbah(e.target.value)} />

      {contoh && (
        <div className="flex flex-col gap-1 rounded-md bg-muted p-3">
          <span className="text-xs text-muted-foreground">Pratinjau</span>
          <p className="text-sm whitespace-pre-line">
            {isiPlaceholder(template, contoh.nama)}
          </p>
        </div>
      )}

      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">Terpilih</span>
        <span className="font-mono font-medium">{jumlah} customer</span>
      </div>

      {children}
    </aside>
  );
}
