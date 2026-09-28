/**
 * Laporan — Piutang (prompt 4.22).
 *
 * Bedanya dengan layar Pembayaran: di sana keempat tagihan tampil sebagai baris
 * yang setara, jadi RISIKO-nya tidak terlihat. Layar ini ada untuk tiga angka
 * yang hanya muncul kalau dihitung relatif (stitch-prompts.md bagian 3):
 *
 *   1. piutang setara berapa persen omzet sebulan — lebih banyak uang
 *      menggantung daripada yang masuk;
 *   2. berapa persen piutang menumpuk di satu lini;
 *   3. berapa persen menumpuk di satu customer.
 *
 * Ketiganya ditulis sebagai kalimat di atas, bukan dibiarkan tersirat di tabel.
 */

import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

import { HeaderHalaman, KontenHalaman } from "~/components/app-shell";
import {
  KepalaUang,
  KosongTabel,
  SelKode,
  SelUang,
  TabelData,
} from "~/components/data-table";
import { BadgeStatusBayar, TandaLini } from "~/components/status-order";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "~/components/ui/progress";
import {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  HARI_INI,
  LABEL_LINI,
  WARNA_LINI,
  customerDari,
  daftarPiutang,
  omzetPeriode,
  piutangPerLini,
  sisaTagihan,
  totalPiutang,
  umurPiutang,
  umurTagihan,
} from "~/lib/dummy";
import { useDataDemo } from "~/lib/store";
import { formatPersen, formatRp, formatUmurPiutang } from "~/lib/format";

const BULAN = HARI_INI.slice(0, 7);

export default function LaporanPiutang() {
  // Daftar ke store demo supaya perubahan dari layar lain (pembayaran,
  // biaya, status order, katalog) langsung terlihat di sini.
  useDataDemo();
  const daftar = daftarPiutang();
  const total = totalPiutang();
  const omzet = omzetPeriode(BULAN);
  const kelompok = umurPiutang();
  const perLini = piutangPerLini();

  const terbesarLini = [...perLini].sort((a, b) => b.share - a.share)[0];
  const terbesarOrder = daftar[0];

  if (daftar.length === 0) {
    return (
      <>
        <HeaderHalaman judul="Piutang" induk="Laporan" />
        <KontenHalaman>
          <KosongTabel nada="baik" kalimat="Tidak ada tagihan tertunggak." />
        </KontenHalaman>
      </>
    );
  }

  return (
    <>
      <HeaderHalaman
        judul="Piutang"
        induk="Laporan"
        aksi={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/pembayaran" />}
          >
            Catat Pembayaran
            <ArrowRight data-icon="inline-end" />
          </Button>
        }
      />
      <KontenHalaman>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Sorot
            angka={formatPersen(total / omzet)}
            judul="dari omzet bulan ini"
            isi={`${formatRp(total)} menggantung, sementara yang benar-benar masuk sepanjang bulan ${formatRp(omzet)}.`}
          />
          <Sorot
            angka={formatPersen(terbesarLini.share)}
            judul={`piutang ada di lini ${LABEL_LINI[terbesarLini.lini]}`}
            isi={`${formatRp(terbesarLini.nilai)}. Lini dengan nilai transaksi terbesar juga yang paling lama dibayar.`}
          />
          <Sorot
            angka={formatPersen(sisaTagihan(terbesarOrder) / total)}
            judul="menumpuk pada satu customer"
            isi={`${customerDari(terbesarOrder).nama} — ${terbesarOrder.no}. Kalau tagihan ini tertunda, hampir seluruh piutang ikut tertunda.`}
          />
        </div>

        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="font-heading text-base font-semibold">
            Kelompok umur
          </h2>
          <TabelData>
            <TableHeader>
              <TableRow>
                <TableHead>Kelompok</TableHead>
                <TableHead className="text-right">Order</TableHead>
                <KepalaUang>Nilai</KepalaUang>
                <TableHead>Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kelompok.map((k) => (
                <TableRow key={k.label} className={k.nilai === 0 ? "opacity-60" : ""}>
                  <TableCell className="font-medium">{k.label}</TableCell>
                  <TableCell className="text-right font-mono">
                    {k.order.length}
                  </TableCell>
                  <SelUang nominal={k.nilai} />
                  <TableCell>
                    {/*
                      Bar proporsi di dalam sel, bukan kolom persen saja: mata
                      membaca panjang jauh lebih cepat daripada membandingkan
                      empat angka persen.
                    */}
                    <span className="flex items-center gap-2">
                      {/* Progress shadcn, bukan dua div bertumpuk: komponennya
                          membawa role="progressbar" + aria-valuenow. */}
                      <Progress
                        value={Math.round(k.share * 100)}
                        className="w-24"
                        aria-label={`Share ${k.label}`}
                      >
                        <ProgressTrack>
                          <ProgressIndicator />
                        </ProgressTrack>
                      </Progress>
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatPersen(k.share)}
                      </span>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {daftar.length}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {formatRp(total)}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  100%
                </TableCell>
              </TableRow>
            </TableFooter>
          </TabelData>
          <p className="text-xs text-muted-foreground">
            Tagihan yang jatuh tempo tepat hari ini dihitung belum lewat — sama
            dengan kartu "Lewat Jatuh Tempo" di layar Pembayaran.
          </p>
        </section>

        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="font-heading text-base font-semibold">Per lini</h2>
          <div className="flex flex-col gap-3 rounded-lg border p-5">
            {perLini.map((p) => (
              <div key={p.lini} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: WARNA_LINI[p.lini] }}
                    />
                    {LABEL_LINI[p.lini]}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {formatRp(p.nilai)} · {formatPersen(p.share)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${p.share * 100}%`,
                      background: WARNA_LINI[p.lini],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="font-heading text-base font-semibold">Rincian</h2>
          <TabelData>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Lini</TableHead>
                <KepalaUang>Sisa</KepalaUang>
                <TableHead>Share</TableHead>
                <TableHead>Umur</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {daftar.map((o) => {
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
                    <SelUang nominal={sisaTagihan(o)} />
                    <TableCell className="font-mono text-muted-foreground">
                      {formatPersen(sisaTagihan(o) / total)}
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
                    <TableCell>
                      <BadgeStatusBayar order={o} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </TabelData>
        </section>
      </KontenHalaman>
    </>
  );
}

function Sorot({
  angka,
  judul,
  isi,
}: {
  angka: string;
  judul: string;
  isi: string;
}) {
  return (
    <Alert className="flex-col items-start">
      <AlertTitle className="flex items-baseline gap-2">
        <span className="font-mono text-2xl font-semibold">{angka}</span>
        <span className="font-normal">{judul}</span>
      </AlertTitle>
      <AlertDescription>{isi}</AlertDescription>
    </Alert>
  );
}
