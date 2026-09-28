/**
 * Order & Booking — daftar (prompt 4.5).
 *
 * Layar yang paling banyak memuat aturan sekaligus: dua dimensi status, badge
 * DP berpersentase, baris Batal opacity 60%, legenda titik progres, dan kolom
 * uang mono rata kanan. Kalau layar ini benar, sisanya tinggal mengikuti.
 */

import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, CalendarDays, Plus } from "lucide-react";
import { toast } from "sonner";

import { HeaderHalaman, KontenHalaman } from "~/components/app-shell";
import { DialogCatatPembayaran } from "~/components/dialog-catat-pembayaran";
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
  LegendaProgres,
  ProgresKerja,
  TandaLini,
  kelasBarisOrder,
} from "~/components/status-order";
import { Button } from "~/components/ui/button";
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
} from "~/components/ui/alert-dialog";
import { Input } from "~/components/ui/input";
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
  biayaLangsung,
  customerDari,
  orders,
  ringkasanItem,
  sisaTagihan,
  totalDibayar,
  totalOrder,
  URUTAN_STATUS_KERJA,
  type Lini,
  type Order,
  type StatusKerja,
} from "~/lib/dummy";
import { aksi, useDataDemo } from "~/lib/store";
import {
  formatJadwal,
  formatPersen,
  formatRp,
  formatTanggal,
  kelasRp,
} from "~/lib/format";

type Filter = "semua" | Lini;

const TAB: { nilai: Filter; label: string }[] = [
  { nilai: "semua", label: "Semua" },
  { nilai: "studio", label: "Studio" },
  { nilai: "event", label: "Event" },
  { nilai: "retail", label: "Retail" },
];

export default function OrderBooking() {
  useDataDemo();
  const [filter, setFilter] = useState<Filter>("semua");
  const [detail, setDetail] = useState<Order | null>(null);
  const [bayar, setBayar] = useState<Order | null>(null);

  const terlihat =
    filter === "semua" ? orders : orders.filter((o) => o.tipe === filter);

  return (
    <>
      <HeaderHalaman
        judul="Order & Booking"
        aksi={
          /*
            nativeButton={false} pada keduanya: render-nya jadi <a>, dan Base UI
            benar menolak elemen non-button yang masih mengaku punya semantik
            button — itu merusak navigasi keyboard dan pembacaan screen reader.
          */
          <>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to="/order/kalender" />}
            >
              <CalendarDays data-icon="inline-start" />
              Kalender
            </Button>
            <Button nativeButton={false} render={<Link to="/order/baru" />}>
              <Plus data-icon="inline-start" />
              Buat Order
            </Button>
          </>
        }
      />
      <KontenHalaman>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            {TAB.map((t) => (
              <TabsTrigger key={t.nilai} value={t.nilai}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {terlihat.length === 0 ? (
          <KosongTabel
            kalimat="Belum ada order. Buat order pertama untuk sesi studio atau event."
            aksi={{ label: "Buat Order", ke: "/order/baru" }}
          />
        ) : (
          <TabelData>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Lini</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Jadwal</TableHead>
                {/*
                  Kolom "Dibayar" sengaja tidak ditampilkan di sini. Sepuluh
                  kolom tidak muat di laptop 1280px, dan Dibayar adalah satu-
                  satunya yang nilainya sudah terbaca dari kolom lain: Total
                  dikali persentase di badge DP. Yang menuntut tindakan adalah
                  Sisa — itu yang ditagih. Angka Dibayar lengkap ada di detail
                  order.
                */}
                <KepalaUang>Total</KepalaUang>
                <KepalaUang>Sisa</KepalaUang>
                <TableHead>
                  <LegendaProgres>Status Kerja</LegendaProgres>
                </TableHead>
                <TableHead>Status Bayar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {terlihat.map((o) => (
                <TableRow
                  key={o.no}
                  className={`cursor-pointer ${kelasBarisOrder(o)}`}
                  onClick={() => setDetail(o)}
                >
                  <SelKode>{o.no}</SelKode>
                  <TableCell className="font-medium whitespace-nowrap">
                    {customerDari(o).nama}
                  </TableCell>
                  <TableCell>
                    <TandaLini lini={o.tipe} />
                  </TableCell>
                  <TableCell className="max-w-64 truncate text-muted-foreground">
                    {ringkasanItem(o)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatJadwal(o.tanggal)}
                  </TableCell>
                  <SelUang nominal={totalOrder(o)} />
                  <SelUang nominal={sisaTagihan(o)} />
                  <TableCell>
                    <ProgresKerja status={o.statusKerja} />
                  </TableCell>
                  <TableCell>
                    <BadgeStatusBayar order={o} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TabelData>
        )}
      </KontenHalaman>

      <SheetDetailOrder
        order={detail}
        onTutup={() => setDetail(null)}
        onCatatBayar={(o) => setBayar(o)}
      />
      <DialogCatatPembayaran order={bayar} onTutup={() => setBayar(null)} />
    </>
  );
}

/**
 * Detail order (prompt 4.7) — Sheet, bukan halaman.
 *
 * Owner membuka-tutup beberapa order berurutan saat menagih atau mengecek
 * jadwal; halaman penuh memaksa dia kehilangan posisi scroll dan filter tabel
 * tiap kali (R9).
 */
function SheetDetailOrder({
  order,
  onTutup,
  onCatatBayar,
}: {
  order: Order | null;
  onTutup: () => void;
  onCatatBayar: (o: Order) => void;
}) {
  if (!order) return <Sheet open={false} onOpenChange={() => {}} />;

  const customer = customerDari(order);
  const total = totalOrder(order);
  const dibayar = totalDibayar(order);
  const sisa = sisaTagihan(order);
  const biaya = biayaLangsung(order);
  const margin = total - biaya;

  /**
   * Link hasil foto baru bisa diisi setelah pengerjaan selesai — sebelum itu
   * belum ada yang mau ditautkan. Di-disable dengan penjelasan, bukan
   * disembunyikan: owner perlu tahu field ini ADA dan kapan bisa dipakai,
   * supaya tidak mencari-cari di menu lain.
   */
  const bolehIsiHasil =
    order.statusKerja === "Selesai Dikerjakan" ||
    order.statusKerja === "Diserahkan";

  return (
    <Sheet open onOpenChange={(o) => !o && onTutup()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <span className="font-mono">{order.no}</span>
            <BadgeStatusBayar order={order} />
          </SheetTitle>
          <SheetDescription>
            {customer.nama} · {formatJadwal(order.tanggal)}
            {order.lokasi ? ` · ${order.lokasi}` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 p-4">
          <KontrolStatus order={order} />

          {order.catatan && (
            <div className="rounded-md bg-muted p-3 text-sm">{order.catatan}</div>
          )}

          <Bagian judul="Item">
            <Table className={KELAS_DENSITY}>
              <TableBody>
                {order.items.map((i, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{i.nama}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {i.qty} × {formatRp(i.harga)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatRp(i.qty * i.harga)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Bagian>

          <Bagian judul="Pembayaran">
            {order.payments.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                Belum ada pembayaran diterima.
              </p>
            ) : (
              <Table className={KELAS_DENSITY}>
                <TableBody>
                  {order.payments.map((p, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{p.keterangan}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatTanggal(p.tanggal)} · {p.metode}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatRp(p.nominal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="flex flex-col gap-1 px-3 pt-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total order</span>
                <span className="font-mono">{formatRp(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sudah dibayar</span>
                <span className="font-mono">{formatRp(dibayar)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Sisa tagihan</span>
                <span className={`font-mono ${sisa > 0 ? "" : "text-success"}`}>
                  {formatRp(sisa)}
                </span>
              </div>
            </div>
          </Bagian>

          <Bagian judul="Biaya job & margin">
            {order.biayaJob.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                Belum ada biaya langsung untuk order ini.
              </p>
            ) : (
              <Table className={KELAS_DENSITY}>
                <TableBody>
                  {order.biayaJob.map((b, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{b.kategori}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {b.keterangan}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatRp(b.nominal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {/*
              Margin per order ditampilkan di sini, bukan cuma di laporan
              agregat: ini angka yang membuat owner memutuskan apakah paket
              sejenis masih layak dijual dengan harga yang sama.
            */}
            <div className="flex justify-between px-3 pt-2 text-sm font-medium">
              <span>Margin job</span>
              <span className={`font-mono ${kelasRp(margin)}`}>
                {formatRp(margin)}
                {total > 0 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {formatPersen(margin / total)}
                  </span>
                )}
              </span>
            </div>
          </Bagian>

          <Bagian judul="Hasil foto">
            <div className="flex flex-col gap-2 px-3 py-2">
              <Input
                disabled={!bolehIsiHasil}
                placeholder={
                  bolehIsiHasil
                    ? "Tempel link Google Drive di sini"
                    : "Aktif setelah status Selesai Dikerjakan"
                }
                value={order.linkHasil ?? ""}
                onChange={(e) => aksi.isiLinkHasil(order.no, e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {bolehIsiHasil
                  ? "Begitu link diisi dan status jadi Diserahkan, Thank You mail dikirim berisi link ini."
                  : "Foto belum selesai diedit, jadi belum ada yang bisa ditautkan."}
              </p>
            </div>
          </Bagian>

          <div className="flex flex-wrap gap-2">
            {/*
              Membuka dialog untuk order INI, bukan melempar ke layar Piutang:
              melempar berarti owner harus mencari ulang order yang barusan dia
              buka, dan itu langkah yang informasinya sudah ada di tangan.
            */}
            <Button disabled={sisa <= 0} onClick={() => onCatatBayar(order)}>
              Catat Pembayaran
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to="/invoice" />}
            >
              Lihat Invoice
            </Button>
            {order.statusKerja !== "Batal" && <BatalkanOrder order={order} />}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Kontrol status kerja — SATU-SATUNYA status yang diinput manual.
 *
 * Tidak ada kontrol untuk status bayar di mana pun, dan itu disengaja: status
 * bayar diturunkan dari catatan Payment (business-flow bagian 4). Menyediakan
 * setternya akan membuka kemungkinan order berstatus "Lunas" padahal
 * pembayarannya kurang — persis yang desain dua-dimensi ini cegah.
 *
 * Hanya maju satu langkah, tidak ada mundur. Mundur itu koreksi kesalahan, dan
 * di skala satu pengguna koreksi seperti itu jarang; menyediakannya sekarang
 * berarti mendesain alur pembatalan-status yang belum tentu dibutuhkan.
 */
function KontrolStatus({ order }: { order: Order }) {
  const idx = URUTAN_STATUS_KERJA.indexOf(
    order.statusKerja as (typeof URUTAN_STATUS_KERJA)[number],
  );
  const berikutnya =
    order.statusKerja === "Batal" || idx === -1
      ? null
      : (URUTAN_STATUS_KERJA[idx + 1] as StatusKerja | undefined);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
      <ProgresKerja status={order.statusKerja} />
      <div className="flex items-center gap-2">
        <TandaLini lini={order.tipe} />
        {berikutnya && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              aksi.ubahStatusKerja(order.no, berikutnya);
              toast.success(`Status jadi ${berikutnya}`, {
                description:
                  berikutnya === "Diserahkan"
                    ? "Thank You mail dikirim berisi link hasil foto."
                    : undefined,
              });
            }}
          >
            Lanjut ke {berikutnya}
            <ArrowRight data-icon="inline-end" />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Batalkan order — AlertDialog, bukan tombol langsung (R9).
 *
 * Yang dikonfirmasi bukan "apakah kamu yakin" melainkan KONSEKUENSINYA: DP yang
 * sudah masuk tetap tercatat sebagai omzet karena kebijakan refund belum ada
 * (business-flow bagian 2 pertanyaan 6). Kalau itu tidak disebut di sini, owner
 * akan bertanya-tanya kenapa omzetnya tidak turun setelah membatalkan order.
 */
function BatalkanOrder({ order }: { order: Order }) {
  const [alasan, setAlasan] = useState("");
  const dibayar = totalDibayar(order);

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="outline" className="text-destructive">
            Batalkan Order
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Batalkan {order.no}?</AlertDialogTitle>
          <AlertDialogDescription>
            Order keluar dari daftar piutang dan tidak lagi ditagih.
            {dibayar > 0 && (
              <>
                {" "}
                DP {formatRp(dibayar)} yang sudah diterima <b>tetap</b> tercatat
                sebagai omzet — kebijakan refund belum disepakati, jadi DP
                diperlakukan hangus.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Input
          placeholder="Alasan pembatalan — opsional"
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
        />

        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant="outline">Kembali</Button>} />
          <AlertDialogAction
            render={
              <Button
                variant="destructive"
                onClick={() => {
                  aksi.batalkanOrder(order.no, alasan.trim());
                  toast.success(`${order.no} dibatalkan`);
                }}
              >
                Batalkan Order
              </Button>
            }
          />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Bagian({
  judul,
  children,
}: {
  judul: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{judul}</h3>
      <div className="overflow-hidden rounded-lg border py-1">{children}</div>
    </section>
  );
}
