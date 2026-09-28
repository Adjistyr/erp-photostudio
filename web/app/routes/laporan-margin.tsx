/**
 * Laporan — Margin per Lini (prompt 4.20).
 *
 * Output paling berharga bagi owner menurut business-flow bagian 7: **lini mana
 * yang sebenarnya menghasilkan uang.** Sering kali lini dengan omzet terbesar
 * justru marginnya paling tipis setelah fee crew dan transport dihitung, dan
 * tanpa layar ini itu tidak akan pernah kelihatan.
 *
 * Ukuran keberhasilan layar ini spesifik: kontras "Event 69% omzet tapi margin
 * 30%, Retail 5% omzet tapi margin 67%" harus langsung terbaca. Kalau kontras
 * itu butuh dicari di dalam tabel, desainnya gagal sekalipun rapi
 * (stitch-prompts.md bagian 3). Karena itu kesimpulannya ditulis sebagai
 * kalimat di atas, dan bar-nya disandingkan omzet vs margin — bukan cuma
 * tabel angka.
 */

import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

import { HeaderHalaman, KontenHalaman } from "~/components/app-shell";
import { KepalaUang, TabelData } from "~/components/data-table";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
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
  labaRugi,
  marginPerLini,
} from "~/lib/dummy";
import { useDataDemo } from "~/lib/store";
import { formatPersen, formatRp } from "~/lib/format";

const BULAN = HARI_INI.slice(0, 7);

export default function LaporanMargin() {
  // Daftar ke store demo supaya perubahan dari layar lain (pembayaran,
  // biaya, status order, katalog) langsung terlihat di sini.
  useDataDemo();
  const baris = marginPerLini(BULAN);
  const lr = labaRugi(BULAN);

  const terbesar = [...baris].sort((a, b) => b.share - a.share)[0];
  const tertipis = [...baris]
    .filter((b) => b.omzet > 0)
    .sort((a, b) => a.rasioMargin - b.rasioMargin)[0];
  const tergemuk = [...baris]
    .filter((b) => b.omzet > 0)
    .sort((a, b) => b.rasioMargin - a.rasioMargin)[0];

  // Skala bar disamakan lintas lini terhadap omzet terbesar, bukan
  // dinormalisasi per baris. Kalau tiap bar dinormalisasi ke lebar penuh,
  // perbandingan antar lini — inti layar ini — justru hilang.
  const maks = Math.max(...baris.map((b) => b.omzet), 1);

  return (
    <>
      <HeaderHalaman
        judul="Margin per Lini"
        induk="Laporan"
        aksi={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/laporan" />}
          >
            Laba Rugi
            <ArrowRight data-icon="inline-end" />
          </Button>
        }
      />
      <KontenHalaman>
        {terbesar && tertipis && tergemuk && terbesar.lini === tertipis.lini && (
          <Alert>
            <AlertTitle>
              {LABEL_LINI[terbesar.lini]} menyumbang{" "}
              {formatPersen(terbesar.share)} omzet tapi marginnya paling tipis (
              {formatPersen(terbesar.rasioMargin)})
            </AlertTitle>
            <AlertDescription>
              Sementara {LABEL_LINI[tergemuk.lini]} cuma{" "}
              {formatPersen(tergemuk.share)} omzet dengan margin{" "}
              {formatPersen(tergemuk.rasioMargin)}. Lini yang terlihat paling
              besar bukan yang paling menguntungkan — selisihnya habis di fee
              crew, transport, dan sewa.
            </AlertDescription>
          </Alert>
        )}

        <section className="flex min-w-0 flex-col gap-4 rounded-lg border p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-heading text-base font-semibold">
              Omzet vs margin
            </h2>
            <span className="text-xs text-muted-foreground">
              batang penuh = omzet · batang pekat = margin
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {baris.map((b) => (
              <div key={b.lini} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: WARNA_LINI[b.lini] }}
                    />
                    {LABEL_LINI[b.lini]}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {formatRp(b.omzet)} · margin {formatPersen(b.rasioMargin)}
                  </span>
                </div>
                {/*
                  Bar bersarang, bukan dua bar bertumpuk: margin adalah BAGIAN
                  dari omzet, dan menampilkannya sebagai potongan di dalam
                  batang yang sama membuat proporsinya terbaca tanpa menghitung.
                  Progress dari shadcn tidak dipakai di sini karena butuh dua
                  nilai dalam satu track (R9 menyebut Progress, tapi untuk bar
                  tunggal).
                */}
                <div
                  className="h-6 w-full overflow-hidden rounded-md"
                  style={{ background: "var(--muted)" }}
                >
                  <div
                    className="flex h-full items-center"
                    style={{
                      width: `${(b.omzet / maks) * 100}%`,
                      // color-mix, BUKAN `opacity: 0.25`. Properti opacity
                      // mengalikan ke seluruh keturunan dan tidak bisa
                      // dibatalkan dari dalam, jadi bar margin di dalamnya ikut
                      // pudar dan lebur dengan induknya — segmen pekatnya hilang
                      // total. Alfa di background hanya mengenai elemen ini.
                      background: `color-mix(in oklch, ${WARNA_LINI[b.lini]} 22%, transparent)`,
                    }}
                  >
                    <div
                      className="h-full"
                      style={{
                        width: `${b.omzet === 0 ? 0 : (b.margin / b.omzet) * 100}%`,
                        background: WARNA_LINI[b.lini],
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <TabelData>
          <TableHeader>
            <TableRow>
              <TableHead>Lini</TableHead>
              <KepalaUang>Omzet</KepalaUang>
              <KepalaUang>Share</KepalaUang>
              <KepalaUang>Biaya Langsung</KepalaUang>
              <KepalaUang>Margin</KepalaUang>
              <KepalaUang>Margin %</KepalaUang>
            </TableRow>
          </TableHeader>
          <TableBody>
            {baris.map((b) => (
              <TableRow key={b.lini}>
                <TableCell>
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: WARNA_LINI[b.lini] }}
                    />
                    {LABEL_LINI[b.lini]}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatRp(b.omzet)}
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">
                  {formatPersen(b.share)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatRp(b.biayaLangsung)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatRp(b.margin)}
                </TableCell>
                <TableCell className="text-right font-mono font-medium">
                  {formatPersen(b.rasioMargin)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold">Total</TableCell>
              <TableCell className="text-right font-mono font-semibold">
                {formatRp(lr.totalOmzet)}
              </TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">
                100%
              </TableCell>
              <TableCell className="text-right font-mono font-semibold">
                {formatRp(lr.totalBiayaLangsung)}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold">
                {formatRp(lr.labaKotor)}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold">
                {formatPersen(lr.rasioLabaKotor)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </TabelData>

        <p className="text-xs text-muted-foreground">
          Biaya langsung Retail = HPP bahan dari katalog. Biaya langsung Studio
          dan Event = biaya job yang dicatat per order (fee crew, transport,
          sewa lokasi/alat). Biaya operasional bulanan tidak dialokasikan ke
          lini mana pun — lihat Laba Rugi.
        </p>
      </KontenHalaman>
    </>
  );
}
