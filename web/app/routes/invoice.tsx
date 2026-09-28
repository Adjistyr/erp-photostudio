/**
 * Invoice — Daftar + Preview & Kirim (prompt 4.14 & 4.15).
 *
 * Invoice DIGENERATE dari order, tidak diketik ulang (business-flow 5.5). Satu
 * invoice bisa dikirim berkali-kali seiring pembayaran bertambah — isinya
 * selalu mencerminkan kondisi terkini, jadi tidak perlu dokumen terpisah untuk
 * DP dan pelunasan. Itu sebabnya di sini tidak ada tombol "Buat Invoice":
 * invoicenya sudah ada begitu ordernya ada.
 *
 * Tombolnya "Buka WhatsApp" dan "Salin Link", bukan "Kirim". Pengiriman tetap
 * manual — alasan yang sama dengan layar Blast WhatsApp, dan menamai tombolnya
 * "Kirim" akan menjanjikan sesuatu yang tidak dilakukan app.
 */

import { useState } from "react";
import { Copy, Printer, Send } from "lucide-react";
import { toast } from "sonner";

import { HeaderHalaman, KontenHalaman, NAMA_STUDIO } from "~/components/app-shell";
import {
  KELAS_DENSITY,
  KepalaUang,
  KosongTabel,
  SelKode,
  SelUang,
  TabelData,
} from "~/components/data-table";
import { BadgeStatusBayar, TandaLini, kelasBarisOrder } from "~/components/status-order";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
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
import {
  customerDari,
  orders,
  ringkasanItem,
  sisaTagihan,
  totalDibayar,
  totalOrder,
  type Order,
} from "~/lib/dummy";
import { useDataDemo } from "~/lib/store";
import { formatJadwal, formatRp, formatTanggal, keNomorWa } from "~/lib/format";

/** Nomor rekening contoh. Di produksi ini masuk pengaturan studio. */
const REKENING = "BCA 1234567890 a.n. Agung Prasetyo";

export default function Invoice() {
  // Daftar ke store demo supaya perubahan dari layar lain (pembayaran,
  // biaya, status order, katalog) langsung terlihat di sini.
  useDataDemo();
  const [preview, setPreview] = useState<Order | null>(null);

  /**
   * Order Batal tidak punya invoice: menagih pekerjaan yang dibatalkan akan
   * membingungkan customer, dan DP-nya sudah dicatat hangus.
   */
  const daftar = orders
    .filter((o) => o.statusKerja !== "Batal")
    .sort((a, b) => b.no.localeCompare(a.no));

  return (
    <>
      <HeaderHalaman judul="Invoice" />
      <KontenHalaman>
        <Alert>
          <AlertTitle>Invoice digenerate dari order</AlertTitle>
          <AlertDescription>
            Tidak ada yang perlu dibuat manual. Satu invoice dikirim berkali-kali
            seiring pembayaran bertambah — isinya selalu mengikuti kondisi
            terkini, jadi tidak ada dokumen terpisah untuk DP dan pelunasan.
          </AlertDescription>
        </Alert>

        {daftar.length === 0 ? (
          <KosongTabel kalimat="Invoice muncul otomatis begitu ada order." />
        ) : (
          <TabelData>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Lini</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Tanggal</TableHead>
                <KepalaUang>Total</KepalaUang>
                <KepalaUang>Sisa</KepalaUang>
                <TableHead>Status Bayar</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {daftar.map((o) => (
                <TableRow key={o.no} className={kelasBarisOrder(o)}>
                  <SelKode>INV-{o.no.replace("ORD-", "")}</SelKode>
                  <TableCell className="font-medium whitespace-nowrap">
                    {customerDari(o).nama}
                  </TableCell>
                  <TableCell>
                    <TandaLini lini={o.tipe} />
                  </TableCell>
                  <TableCell className="max-w-56 truncate text-muted-foreground">
                    {ringkasanItem(o)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatTanggal(o.tanggal)}
                  </TableCell>
                  <SelUang nominal={totalOrder(o)} />
                  <SelUang nominal={sisaTagihan(o)} />
                  <TableCell>
                    <BadgeStatusBayar order={o} />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreview(o)}
                    >
                      Lihat
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TabelData>
        )}
      </KontenHalaman>

      <SheetPreviewInvoice order={preview} onTutup={() => setPreview(null)} />
    </>
  );
}

function SheetPreviewInvoice({
  order,
  onTutup,
}: {
  order: Order | null;
  onTutup: () => void;
}) {
  if (!order) {
    return <Sheet open={false} onOpenChange={() => {}} />;
  }

  const customer = customerDari(order);
  const total = totalOrder(order);
  const dibayar = totalDibayar(order);
  const sisa = sisaTagihan(order);
  const noInvoice = `INV-${order.no.replace("ORD-", "")}`;

  const pesan =
    `Halo ${customer.nama.split(" ")[0]}, berikut invoice ${noInvoice} dari ${NAMA_STUDIO}.\n` +
    `Total ${formatRp(total)}` +
    (dibayar > 0 ? `, sudah dibayar ${formatRp(dibayar)}` : "") +
    (sisa > 0 ? `, sisa ${formatRp(sisa)}.\n` : `. Lunas, terima kasih!\n`) +
    (sisa > 0 ? `Pembayaran ke ${REKENING}. Terima kasih 🙏` : "");

  return (
    <Sheet open onOpenChange={(o) => !o && onTutup()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{noInvoice}</SheetTitle>
          <SheetDescription>
            {customer.nama} · {formatTanggal(order.tanggal)}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 p-4">
          {/* Badan invoice — ini yang dilihat customer. */}
          <div className="flex flex-col gap-5 rounded-lg border p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col">
                <span className="font-heading text-base font-semibold">
                  {NAMA_STUDIO}
                </span>
                <span className="text-xs text-muted-foreground">
                  Jl. Kaliurang KM 5 No. 12, Yogyakarta
                </span>
                <span className="text-xs text-muted-foreground">
                  0812-0000-1111
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-mono text-sm font-medium">{noInvoice}</span>
                <span className="text-xs text-muted-foreground">
                  {formatTanggal(order.tanggal)}
                </span>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Ditagihkan ke</span>
              <span className="text-sm font-medium">{customer.nama}</span>
              {customer.hp && (
                <span className="font-mono text-xs text-muted-foreground">
                  {customer.hp}
                </span>
              )}
              {order.lokasi && (
                <span className="text-xs text-muted-foreground">
                  Lokasi: {order.lokasi} · {formatJadwal(order.tanggal)}
                </span>
              )}
            </div>

            <div className="overflow-hidden rounded-lg border">
              <Table className={KELAS_DENSITY}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((i, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{i.nama}</TableCell>
                      <TableCell className="text-right font-mono">
                        {i.qty}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatRp(i.harga)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatRp(i.qty * i.harga)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-2 text-sm">
              <BarisTotal label="Total" nilai={total} />
              {/*
                Riwayat pembayaran ditampilkan per transaksi, bukan cuma
                totalnya: customer yang sudah mentransfer DP perlu melihat
                setorannya tercatat, dan itu yang membuat invoice kedua tidak
                terasa seperti tagihan baru.
              */}
              {order.payments.map((p, idx) => (
                <div
                  key={idx}
                  className="flex justify-between text-muted-foreground"
                >
                  <span>
                    {p.keterangan} · {formatTanggal(p.tanggal)} · {p.metode}
                  </span>
                  <span className="font-mono">−{formatRp(p.nominal)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex items-baseline justify-between">
                <span className="font-medium">
                  {sisa > 0 ? "Sisa tagihan" : "Lunas"}
                </span>
                <span
                  className={`font-mono text-xl font-semibold ${sisa > 0 ? "" : "text-success"}`}
                >
                  {formatRp(sisa)}
                </span>
              </div>
            </div>

            {sisa > 0 && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="text-xs text-muted-foreground">Pembayaran ke</p>
                <p className="font-mono">{REKENING}</p>
              </div>
            )}
          </div>

          {/*
            Tombolnya "Buka WhatsApp" dan "Salin Link", bukan "Kirim" —
            pengiriman tetap manual. Hint di bawahnya menjelaskan itu sebelum
            owner mengklik dan bingung kenapa tidak ada yang terkirim.
          */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {customer.hp && (
                <Button
                  nativeButton={false}
                  render={
                    <a
                      href={`https://wa.me/${keNomorWa(customer.hp)}?text=${encodeURIComponent(pesan)}`}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                >
                  <Send data-icon="inline-start" />
                  Buka WhatsApp
                </Button>
              )}
              <Button
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(
                    `${window.location.origin}/invoice/${noInvoice.toLowerCase()}`,
                  );
                  toast.success("Link invoice disalin");
                }}
              >
                <Copy data-icon="inline-start" />
                Salin Link
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer data-icon="inline-start" />
                Cetak / PDF
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              App menyiapkan pesannya; pengiriman tetap lewat WhatsApp kamu.
              Cetak memakai dialog print browser — tidak perlu layanan PDF
              terpisah.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BarisTotal({ label, nilai }: { label: string; nilai: number }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="font-mono">{formatRp(nilai)}</span>
    </div>
  );
}
