/**
 * Customer — Daftar + Detail (prompt 4.3 & 4.4).
 *
 * Yang dibutuhkan di sini bukan CRM dalam arti sales pipeline — client sudah
 * menyebut sendiri bahwa yang diperlukan hanya pendataan customer agar bisa
 * blast (business-flow 5.6). Jadi isinya daftar yang terkumpul otomatis dari
 * order, filter lini, dan jalan pintas ke Komunikasi.
 *
 * Detail memakai Sheet, bukan halaman: owner membandingkan beberapa customer
 * berurutan dan tidak boleh kehilangan posisi scroll serta filter di tabel.
 */

import { useState } from "react";
import { Link } from "react-router";
import { MessageSquare, Plus, Send } from "lucide-react";
import { toast } from "sonner";

import { HeaderHalaman, KontenHalaman } from "~/components/app-shell";
import {
  KELAS_DENSITY,
  KepalaUang,
  KosongTabel,
  SelKode,
  SelUang,
  TabelData,
} from "~/components/data-table";
import {
  BadgeStatusBayar,
  ProgresKerja,
  TandaLini,
  kelasBarisOrder,
} from "~/components/status-order";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  ringkasanCustomer,
  ringkasanItem,
  sisaTagihan,
  totalOrder,
  type Lini,
  type RingkasanCustomer,
} from "~/lib/dummy";
import { aksi, idBaru, useDataDemo } from "~/lib/store";
import { formatJadwal, formatRp, formatTanggal, keNomorWa } from "~/lib/format";

type Filter = "semua" | Lini;

export default function CustomerLayar() {
  useDataDemo();
  const [filter, setFilter] = useState<Filter>("semua");
  const [detail, setDetail] = useState<RingkasanCustomer | null>(null);
  const [tambah, setTambah] = useState(false);

  const semua = ringkasanCustomer();
  const terlihat =
    filter === "semua" ? semua : semua.filter((r) => r.lini.includes(filter));

  return (
    <>
      <HeaderHalaman
        judul="Customer"
        aksi={
          <>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to="/komunikasi" />}
            >
              <MessageSquare data-icon="inline-start" />
              Kirim Blast
            </Button>
            {/*
              Tambah Customer ada meski customer terkumpul otomatis dari order:
              owner sering dapat kontak lebih dulu (DM Instagram, teman yang
              minta nomor dihubungi) sebelum ada transaksinya sama sekali, dan
              tanpa tombol ini kontak itu tidak punya tempat sampai deal jadi.
            */}
            <Button onClick={() => setTambah(true)}>
              <Plus data-icon="inline-start" />
              Tambah Customer
            </Button>
          </>
        }
      />
      <KontenHalaman>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="semua">Semua</TabsTrigger>
            <TabsTrigger value="studio">Pernah studio</TabsTrigger>
            <TabsTrigger value="event">Pernah event</TabsTrigger>
            <TabsTrigger value="retail">Pernah retail</TabsTrigger>
          </TabsList>
        </Tabs>

        {terlihat.length === 0 ? (
          <KosongTabel
            kalimat="Customer akan terkumpul otomatis dari setiap transaksi."
            aksi={{ label: "Tambah Customer", onClick: () => setTambah(true) }}
          />
        ) : (
          <TabelData>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>No HP</TableHead>
                <TableHead>Sumber</TableHead>
                <TableHead>Pernah beli</TableHead>
                <TableHead className="text-right">Order</TableHead>
                <KepalaUang>Nilai order</KepalaUang>
                {/*
                  "Sudah dibayar" sengaja bersebelahan dengan "Nilai order": di
                  basis kas, customer dengan nilai order terbesar belum tentu
                  yang paling banyak menyetor uang. Kalau dipisah jauh, selisih
                  itu tidak pernah terbaca (stitch-prompts.md bagian 3).
                */}
                <KepalaUang>Sudah dibayar</KepalaUang>
                <TableHead>Transaksi terakhir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {terlihat.map((r) => (
                <TableRow
                  key={r.customer.id}
                  className="cursor-pointer"
                  onClick={() => setDetail(r)}
                >
                  <TableCell className="font-medium whitespace-nowrap">
                    {r.customer.nama}
                  </TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {r.customer.hp ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.customer.sumber ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span className="flex gap-3">
                      {r.lini.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        r.lini.map((l) => <TandaLini key={l} lini={l} />)
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {r.jumlahOrder}
                  </TableCell>
                  <SelUang nominal={r.nilaiOrder} />
                  <SelUang nominal={r.sudahDibayar} />
                  <TableCell className="whitespace-nowrap">
                    {r.terakhirTransaksi ? formatTanggal(r.terakhirTransaksi) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TabelData>
        )}

        <p className="text-xs text-muted-foreground">
          Customer terkumpul otomatis dari transaksi — tidak ada yang perlu
          diinput manual di sini. Order yang dibatalkan tidak menaikkan nilai
          order, tapi tetap muncul di riwayat.
        </p>
      </KontenHalaman>

      <SheetDetailCustomer data={detail} onTutup={() => setDetail(null)} />
      <DialogTambahCustomer buka={tambah} onTutup={() => setTambah(false)} />
    </>
  );
}

function SheetDetailCustomer({
  data,
  onTutup,
}: {
  data: RingkasanCustomer | null;
  onTutup: () => void;
}) {
  const sisa = data
    ? data.order
        .filter((o) => o.statusKerja !== "Batal")
        .reduce((s, o) => s + sisaTagihan(o), 0)
    : 0;

  return (
    <Sheet open={data !== null} onOpenChange={(o) => !o && onTutup()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-2xl">
        {data && (
          <>
            <SheetHeader>
              <SheetTitle>{data.customer.nama}</SheetTitle>
              <SheetDescription>
                {data.customer.hp ?? "Tanpa nomor HP"}
                {data.customer.email ? ` · ${data.customer.email}` : ""}
                {data.customer.sumber ? ` · dari ${data.customer.sumber}` : ""}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-6 p-4">
              <div className="grid grid-cols-3 gap-4">
                <Angka label="Order" nilai={String(data.jumlahOrder)} />
                <Angka label="Nilai order" nilai={formatRp(data.nilaiOrder)} />
                <Angka
                  label="Sisa tagihan"
                  nilai={formatRp(sisa)}
                  mendesak={sisa > 0}
                />
              </div>

              {data.customer.catatan && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  {data.customer.catatan}
                </div>
              )}

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Riwayat transaksi</h3>
                <div className="overflow-hidden rounded-lg border">
                  <Table className={KELAS_DENSITY}>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.order.map((o) => (
                        <TableRow key={o.no} className={kelasBarisOrder(o)}>
                          <SelKode>{o.no}</SelKode>
                          <TableCell className="max-w-48 truncate text-muted-foreground">
                            {ringkasanItem(o)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatJadwal(o.tanggal)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatRp(totalOrder(o))}
                          </TableCell>
                          <TableCell>
                            <span className="flex flex-col items-start gap-1">
                              <ProgresKerja status={o.statusKerja} />
                              <BadgeStatusBayar order={o} />
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>

              {data.customer.hp && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={
                      <a
                        href={`https://wa.me/${keNomorWa(data.customer.hp)}`}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    <Send data-icon="inline-start" />
                    Buka WhatsApp
                  </Button>
                  <Button
                    variant="ghost"
                    nativeButton={false}
                    render={<Link to="/komunikasi" />}
                  >
                    Masukkan ke blast
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Angka({
  label,
  nilai,
  mendesak,
}: {
  label: string;
  nilai: string;
  mendesak?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`font-mono text-lg font-semibold ${mendesak ? "text-destructive" : ""}`}
      >
        {nilai}
      </span>
    </div>
  );
}

/** Sumber tahu — dipakai untuk mengukur kanal mana yang benar-benar mendatangkan
 *  customer, salah satu alasan CRM ini ada (business-flow 5.6). */
const SUMBER = ["Instagram", "Teman", "Lewat depan studio", "Google Maps", "Lainnya"];

function DialogTambahCustomer({
  buka,
  onTutup,
}: {
  buka: boolean;
  onTutup: () => void;
}) {
  return buka ? (
    <IsiDialogCustomer key={String(buka)} onTutup={onTutup} />
  ) : (
    <Dialog open={false} onOpenChange={() => {}} />
  );
}

function IsiDialogCustomer({ onTutup }: { onTutup: () => void }) {
  const [nama, setNama] = useState("");
  const [hp, setHp] = useState("");
  const [email, setEmail] = useState("");
  const [sumber, setSumber] = useState("");
  const [catatan, setCatatan] = useState("");

  // Hanya nama yang wajib. Kontak dibiarkan opsional dengan alasan yang sama
  // seperti customer di POS: field wajib adalah cara tercepat membuat
  // pencatatan dilewat (business-flow 5.1).
  const lengkap = nama.trim() !== "";

  return (
    <Dialog open onOpenChange={(o) => !o && onTutup()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Customer</DialogTitle>
          <DialogDescription>
            Untuk kontak yang masuk sebelum ada transaksi. Customer dari
            transaksi terkumpul sendiri tanpa perlu diisi di sini.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="nama-cus">Nama</FieldLabel>
            <Input
              id="nama-cus"
              placeholder="Nama customer"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="hp-cus">
                No HP <span className="text-muted-foreground">— opsional</span>
              </FieldLabel>
              <Input
                id="hp-cus"
                inputMode="tel"
                className="font-mono"
                placeholder="0812-3344-5566"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="email-cus">
                Email <span className="text-muted-foreground">— opsional</span>
              </FieldLabel>
              <Input
                id="email-cus"
                type="email"
                placeholder="nama@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="sumber-cus">
              Sumber tahu <span className="text-muted-foreground">— opsional</span>
            </FieldLabel>
            <Select value={sumber} onValueChange={(v) => setSumber(v ?? "")}>
              <SelectTrigger id="sumber-cus">
                <SelectValue placeholder="Dari mana tahu studio?" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {SUMBER.map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="cat-cus">
              Catatan <span className="text-muted-foreground">— opsional</span>
            </FieldLabel>
            <Input
              id="cat-cus"
              placeholder="Rencana prewed Desember"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </Field>

          {!hp.trim() && !email.trim() && (
            <p className="text-xs text-muted-foreground">
              Tanpa nomor HP maupun email, customer ini tidak akan muncul di
              daftar blast.
            </p>
          )}
        </FieldGroup>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Batal</Button>} />
          <Button
            disabled={!lengkap}
            onClick={() => {
              aksi.tambahCustomer({
                id: idBaru("CUS"),
                nama: nama.trim(),
                hp: hp.trim() || null,
                email: email.trim() || null,
                sumber: sumber || null,
                catatan: catatan.trim() || undefined,
              });
              toast.success("Customer ditambahkan", {
                description: `${nama.trim()} akan muncul begitu punya transaksi.`,
              });
              onTutup();
            }}
          >
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
