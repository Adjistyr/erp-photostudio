/**
 * Pembayaran — Piutang + dialog Catat Pembayaran (prompt 4.9 & 4.10).
 *
 * Layar yang paling sering dibuka owner (business-flow 5.4). Tanpa layar ini
 * tagihan yang belum ditagih akan terlupakan, dan itu kebocoran paling umum di
 * bisnis jasa.
 *
 * Satu dari tiga flow yang benar-benar interaktif di mockup ini: mencatat
 * pembayaran di sini mengubah status bayar order SECARA TURUNAN, bukan karena
 * ada field status yang ikut diubah. Itu yang mau diperagakan ke client —
 * business-flow bagian 4 menyebut status bayar tidak pernah diinput manual.
 */

import { useState } from "react";
import { TriangleAlert } from "lucide-react";

import { HeaderHalaman, KontenHalaman } from "~/components/app-shell";
import {
  KepalaUang,
  KosongTabel,
  SelKode,
  SelUang,
  TabelData,
} from "~/components/data-table";
import { DialogCatatPembayaran } from "~/components/dialog-catat-pembayaran";
import { BadgeStatusBayar, TandaLini } from "~/components/status-order";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  customerDari,
  daftarPiutang,
  piutangLewatJatuhTempo,
  sisaTagihan,
  totalDibayar,
  totalOrder,
  totalPiutang,
  umurTagihan,
  type Order,
} from "~/lib/dummy";
import { useDataDemo } from "~/lib/store";
import {
  formatPersen,
  formatRp,
  formatTanggal,
  formatUmurPiutang,
} from "~/lib/format";

export default function Pembayaran() {
  // Mendaftarkan layar ini ke store: begitu pembayaran dicatat — dari sini
  // maupun dari Sheet Detail Order — seluruh angka di halaman dihitung ulang.
  useDataDemo();

  const [target, setTarget] = useState<Order | null>(null);

  const piutang = daftarPiutang();
  const total = totalPiutang();
  const lewat = piutangLewatJatuhTempo();
  const totalLewat = lewat.reduce((s, o) => s + sisaTagihan(o), 0);

  return (
    <>
      <HeaderHalaman judul="Pembayaran" induk="Piutang" />
      <KontenHalaman>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Ringkas
            label="Total piutang"
            nilai={formatRp(total)}
            catatan={`${piutang.length} order belum lunas`}
          />
          <Ringkas
            label="Lewat jatuh tempo"
            nilai={formatRp(totalLewat)}
            catatan={`${lewat.length} order`}
            mendesak={totalLewat > 0}
          />
          <Ringkas
            label="Belum jatuh tempo"
            nilai={formatRp(total - totalLewat)}
            catatan={`${piutang.length - lewat.length} order`}
          />
        </div>

        {/*
          Terkonsentrasinya piutang pada satu customer adalah risiko yang tidak
          kelihatan di tabel, karena di sana keempat tagihan tampil sebagai
          baris yang setara (stitch-prompts.md bagian 3).
        */}
        {piutang.length > 0 && sisaTagihan(piutang[0]) / total > 0.5 && (
          <Alert>
            <TriangleAlert />
            <AlertTitle>
              {formatPersen(sisaTagihan(piutang[0]) / total)} piutang menumpuk di
              satu customer
            </AlertTitle>
            <AlertDescription>
              {customerDari(piutang[0]).nama} — {piutang[0].no}. Kalau tagihan ini
              tertunda, hampir seluruh piutang ikut tertunda.
            </AlertDescription>
          </Alert>
        )}

        {piutang.length === 0 ? (
          /* Piutang kosong itu KABAR BAIK, bukan kekurangan data (R7). */
          <KosongTabel nada="baik" kalimat="Tidak ada tagihan tertunggak." />
        ) : (
          <TabelData>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Lini</TableHead>
                <TableHead>Jatuh tempo</TableHead>
                <TableHead>Umur</TableHead>
                <KepalaUang>Total</KepalaUang>
                <KepalaUang>Dibayar</KepalaUang>
                <KepalaUang>Sisa</KepalaUang>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {piutang.map((o) => {
                const umur = umurTagihan(o);
                return (
                  <TableRow key={o.no}>
                    <SelKode>{o.no}</SelKode>
                    <TableCell className="font-medium whitespace-nowrap">
                      {customerDari(o).nama}
                    </TableCell>
                    <TableCell>
                      <TandaLini lini={o.tipe} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatTanggal(o.tanggal)}
                    </TableCell>
                    <TableCell
                      className={
                        umur < 0
                          ? "whitespace-nowrap text-destructive"
                          : "whitespace-nowrap"
                      }
                    >
                      {formatUmurPiutang(umur)}
                    </TableCell>
                    <SelUang nominal={totalOrder(o)} />
                    <SelUang nominal={totalDibayar(o)} />
                    <SelUang nominal={sisaTagihan(o)} />
                    <TableCell>
                      <BadgeStatusBayar order={o} />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTarget(o)}
                      >
                        Catat Bayar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </TabelData>
        )}
      </KontenHalaman>

      <DialogCatatPembayaran order={target} onTutup={() => setTarget(null)} />
    </>
  );
}

function Ringkas({
  label,
  nilai,
  catatan,
  mendesak,
}: {
  label: string;
  nilai: string;
  catatan: string;
  mendesak?: boolean;
}) {
  return (
    <Card className="p-5">
      <CardHeader className="p-0">
        <CardDescription className="text-xs">{label}</CardDescription>
        <CardTitle
          className={`font-mono text-3xl font-semibold ${mendesak ? "text-destructive" : ""}`}
        >
          {nilai}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <p className="text-xs text-muted-foreground">{catatan}</p>
      </CardContent>
    </Card>
  );
}
