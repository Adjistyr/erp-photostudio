/**
 * Laporan — Laba Rugi (prompt 4.19).
 *
 * Layar yang dibawa ke client untuk mengunci keputusan **basis kas vs akrual**
 * (stitch-prompts.md bagian 7). Karena itu Alert basis kas dipasang di atas,
 * SEBELUM angka apa pun: kalau client melihat "Rugi Rp 2.104.500" lebih dulu,
 * percakapannya jadi soal kerugian, padahal yang harus diputuskan adalah cara
 * mengakui pendapatan. Angka ruginya justru konsekuensi dari pilihan itu.
 */

import { Link } from "react-router";
import { ArrowRight, Info } from "lucide-react";

import { HeaderHalaman, KontenHalaman } from "~/components/app-shell";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "~/components/ui/table";
import {
  HARI_INI,
  LABEL_LINI,
  WARNA_LINI,
  labaRugi,
  orderDenganNo,
  totalDibayar,
} from "~/lib/dummy";
import { useDataDemo } from "~/lib/store";
import { formatPersen, formatRp, formatTanggal, kelasRp } from "~/lib/format";

const BULAN = HARI_INI.slice(0, 7);

export default function Laporan() {
  // Daftar ke store demo supaya perubahan dari layar lain (pembayaran,
  // biaya, status order, katalog) langsung terlihat di sini.
  useDataDemo();
  const lr = labaRugi(BULAN);
  const wedding = orderDenganNo("ORD-0011");

  return (
    <>
      <HeaderHalaman
        judul="Laba Rugi"
        induk="Laporan"
        aksi={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/laporan/margin" />}
          >
            Margin per Lini
            <ArrowRight data-icon="inline-end" />
          </Button>
        }
      />
      <KontenHalaman>
        {/*
          Alert ini bukan hiasan — dia yang membuat client sadar basis kas itu
          PILIHAN, bukan fakta. Mengubahnya belakangan mengubah seluruh angka
          historis, jadi ini keputusan paling mahal di proyek (business-flow
          bagian 7).
        */}
        <Alert>
          <Info />
          <AlertTitle>Laporan ini memakai basis kas</AlertTitle>
          <AlertDescription>
            Omzet diakui saat uang diterima, bukan saat jasa selesai dikerjakan.
            {wedding && (
              <>
                {" "}
                Contohnya di bulan ini: DP {formatRp(totalDibayar(wedding))} untuk{" "}
                {wedding.no} masuk omzet Agustus walaupun acaranya{" "}
                {formatTanggal(wedding.tanggal)}.
              </>
            )}{" "}
            Dipilih supaya angka laporan cocok dengan mutasi rekening. Kalau
            basisnya diganti ke akrual, seluruh angka di halaman ini berubah.
          </AlertDescription>
        </Alert>

        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[1fr_20rem]">
          <section className="flex min-w-0 flex-col gap-4 rounded-lg border p-5">
            <h2 className="font-heading text-base font-semibold">
              Agustus 2026
            </h2>

            <Table className="[&_td]:px-0 [&_td]:py-2">
              <TableBody>
                <Judul>Omzet</Judul>
                {lr.omzetPerLini.map(({ lini, nilai }) => (
                  <Rincian
                    key={lini}
                    label={LABEL_LINI[lini]}
                    nilai={nilai}
                    warna={WARNA_LINI[lini]}
                  />
                ))}
                <Total label="Total Omzet" nilai={lr.totalOmzet} />

                <Judul>Biaya Langsung</Judul>
                <Rincian label="HPP bahan produk" nilai={lr.hppBahan} />
                <Rincian
                  label="Biaya job (crew, transport, sewa)"
                  nilai={lr.biayaJob}
                />
                <Total
                  label="Total Biaya Langsung"
                  nilai={lr.totalBiayaLangsung}
                />

                <Total
                  label="Laba Kotor"
                  nilai={lr.labaKotor}
                  catatan={formatPersen(lr.rasioLabaKotor)}
                  tebal
                />

                <Judul>Biaya Operasional</Judul>
                {lr.operasional.map((b) => (
                  <Rincian key={b.id} label={b.kategori} nilai={b.nominal} />
                ))}
                <Total
                  label="Total Biaya Operasional"
                  nilai={lr.totalOperasional}
                />
              </TableBody>
            </Table>

            <Separator />

            <div className="flex items-baseline justify-between">
              <span className="font-heading text-base font-semibold">
                Laba Bersih
              </span>
              <span
                className={`font-mono text-3xl font-semibold ${kelasRp(lr.labaBersih)}`}
              >
                {formatRp(lr.labaBersih)}
              </span>
            </div>
          </section>

          <aside className="flex min-w-0 flex-col gap-4">
            {/*
              Kesimpulan ditulis sebagai kalimat, bukan dibiarkan tersirat di
              tabel. Rugi di sini bukan tanda bisnisnya gagal — biaya
              operasional sebulan penuh bertemu omzet yang baru terkumpul
              sebagian bulan. Kalau ini tidak dijelaskan, angka merahnya akan
              jadi satu-satunya hal yang diingat client.
            */}
            <div className="flex flex-col gap-2 rounded-lg border p-5">
              <h3 className="text-sm font-semibold">Cara membacanya</h3>
              <p className="text-sm text-muted-foreground">
                Laba kotor {formatRp(lr.labaKotor)} (
                {formatPersen(lr.rasioLabaKotor)}) sebenarnya sehat — operasional
                jual-beli dan jasanya untung.
              </p>
              <p className="text-sm text-muted-foreground">
                Yang membuat bulan ini rugi adalah biaya tetap{" "}
                {formatRp(lr.totalOperasional)} yang berjalan penuh, sementara
                bisnisnya baru mulai. Titik balik ada di omzet sekitar{" "}
                <span className="font-mono text-foreground">
                  {formatRp(
                    Math.ceil(
                      lr.totalOperasional / Math.max(lr.rasioLabaKotor, 0.01) / 100_000,
                    ) * 100_000,
                  )}
                </span>{" "}
                per bulan pada margin yang sama.
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border p-5">
              <h3 className="text-sm font-semibold">Yang tidak ada di sini</h3>
              <p className="text-sm text-muted-foreground">
                Pekerjaan yang sudah dikerjakan tapi belum dibayar penuh tidak
                muncul sebagai omzet di basis kas. Angkanya ada di layar
                Piutang.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                nativeButton={false}
                render={<Link to="/pembayaran" />}
              >
                Lihat piutang
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </aside>
        </div>
      </KontenHalaman>
    </>
  );
}

function Judul({ children }: { children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={2}
        className="pt-5 text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        {children}
      </TableCell>
    </TableRow>
  );
}

function Rincian({
  label,
  nilai,
  warna,
}: {
  label: string;
  nilai: number;
  warna?: string;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="pl-4 text-sm">
        <span className="flex items-center gap-2">
          {warna && (
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: warna }}
            />
          )}
          {label}
        </span>
      </TableCell>
      <TableCell className={`text-right font-mono text-sm ${kelasRp(nilai)}`}>
        {formatRp(nilai)}
      </TableCell>
    </TableRow>
  );
}

function Total({
  label,
  nilai,
  catatan,
  tebal,
}: {
  label: string;
  nilai: number;
  catatan?: string;
  tebal?: boolean;
}) {
  return (
    <TableRow className="border-t hover:bg-transparent">
      <TableCell className={tebal ? "text-sm font-semibold" : "text-sm font-medium"}>
        {label}
        {catatan && (
          <span className="ml-2 font-mono text-xs text-muted-foreground">
            {catatan}
          </span>
        )}
      </TableCell>
      <TableCell
        className={`text-right font-mono ${tebal ? "text-base font-semibold" : "text-sm font-medium"} ${kelasRp(nilai)}`}
      >
        {formatRp(nilai)}
      </TableCell>
    </TableRow>
  );
}
