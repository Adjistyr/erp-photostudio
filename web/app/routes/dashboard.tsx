/**
 * Dashboard (prompt 4.13).
 *
 * Layar pembuka: apa yang menunggu owner hari ini, dan uang mana yang
 * menggantung. Urutan kartunya mengikuti urgensi, bukan besaran angka — piutang
 * lewat jatuh tempo ditaruh paling kanan justru karena itu yang paling menuntut
 * tindakan dan mata berhenti di ujung baris.
 */

import { Link } from "react-router";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Target,
  TriangleAlert,
  Wallet,
} from "lucide-react";

import { HeaderHalaman, KontenHalaman } from "~/components/app-shell";
import {
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
} from "~/components/status-order";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  HARI_INI,
  bookingHariIni,
  customerDari,
  daftarPiutang,
  katalog,
  omzetPeriode,
  piutangLewatJatuhTempo,
  ringkasanItem,
  sisaTagihan,
  titikImpas,
  totalPiutang,
  umurTagihan,
} from "~/lib/dummy";
import { useDataDemo } from "~/lib/store";
import {
  formatJadwal,
  formatPersen,
  formatRp,
  formatTanggal,
  formatUmurPiutang,
} from "~/lib/format";

const BULAN = HARI_INI.slice(0, 7);

export default function Dashboard() {
  // Daftar ke store demo supaya perubahan dari layar lain (pembayaran,
  // biaya, status order, katalog) langsung terlihat di sini.
  useDataDemo();
  const booking = bookingHariIni();
  const piutang = daftarPiutang();
  const lewat = piutangLewatJatuhTempo();
  const omzet = omzetPeriode(BULAN);

  /**
   * Dashboard bergantung pada Katalog: tanpa item, tidak ada yang bisa dijual
   * dan semua angka di sini nol. Empty state-nya mengarahkan ke Katalog, bukan
   * menawarkan aksi yang belum bisa dijalankan (R7).
   */
  if (katalog.length === 0) {
    return (
      <>
        <HeaderHalaman judul="Dashboard" />
        <KontenHalaman>
          <KosongTabel
            kalimat="Belum ada data. Mulai dengan mengisi katalog produk dan jasa."
            aksi={{ label: "Isi Katalog", ke: "/katalog" }}
          />
        </KontenHalaman>
      </>
    );
  }

  return (
    <>
      <HeaderHalaman judul="Dashboard" />
      <KontenHalaman>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Booking hari ini"
            nilai={String(booking.length)}
            catatan={formatTanggal(HARI_INI)}
            ikon={CalendarDays}
          />
          <Kpi
            label="Omzet Agustus"
            nilai={formatRp(omzet)}
            catatan="uang diterima, basis kas"
            ikon={Wallet}
          />
          <Kpi
            label="Piutang berjalan"
            nilai={formatRp(totalPiutang())}
            catatan={`${piutang.length} order belum lunas`}
            ikon={Clock}
          />
          <Kpi
            label="Lewat jatuh tempo"
            nilai={formatRp(lewat.reduce((s, o) => s + sisaTagihan(o), 0))}
            catatan={`${lewat.length} order perlu ditagih`}
            ikon={lewat.length > 0 ? TriangleAlert : undefined}
            mendesak={lewat.length > 0}
          />
        </div>

        <KartuTitikImpas />

        {/*
          Perbandingan yang tidak muncul di kartu mana pun kalau tidak ditulis
          eksplisit: piutang lebih besar daripada omzet sebulan. Di layar Piutang
          keempat tagihan tampil sebagai baris yang setara, jadi besarannya
          relatif terhadap omzet tidak pernah terlihat.
        */}
        {totalPiutang() > omzet && (
          <Alert>
            <TriangleAlert />
            <AlertTitle>
              Piutang {formatPersen(totalPiutang() / omzet)} dari omzet bulan ini
            </AlertTitle>
            <AlertDescription>
              {formatRp(totalPiutang())} menggantung, sementara yang benar-benar
              masuk sepanjang Agustus {formatRp(omzet)}. Lebih banyak uang di
              tagihan daripada di rekening.
            </AlertDescription>
          </Alert>
        )}

        <Seksi
          judul="Jadwal hari ini"
          aksi={{ label: "Semua order", ke: "/order" }}
        >
          {booking.length === 0 ? (
            <KosongTabel kalimat="Tidak ada jadwal hari ini." />
          ) : (
            <TabelData>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Lini</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Jam</TableHead>
                  <TableHead>
                    <LegendaProgres>Status Kerja</LegendaProgres>
                  </TableHead>
                  <TableHead>Status Bayar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {booking.map((o) => (
                  <TableRow key={o.no}>
                    <SelKode>{o.no}</SelKode>
                    <TableCell className="font-medium">{customerDari(o).nama}</TableCell>
                    <TableCell>
                      <TandaLini lini={o.tipe} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ringkasanItem(o)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatJadwal(o.tanggal)}
                    </TableCell>
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
        </Seksi>

        <Seksi
          judul="Perlu ditagih"
          aksi={{ label: "Semua piutang", ke: "/pembayaran" }}
        >
          {piutang.length === 0 ? (
            <KosongTabel nada="baik" kalimat="Tidak ada tagihan tertunggak." />
          ) : (
            <TabelData>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Lini</TableHead>
                  <KepalaUang>Sisa</KepalaUang>
                  <TableHead>Umur</TableHead>
                  <TableHead>Status Bayar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {piutang.map((o) => {
                  const umur = umurTagihan(o);
                  return (
                    <TableRow key={o.no}>
                      <SelKode>{o.no}</SelKode>
                      <TableCell className="font-medium">
                        {customerDari(o).nama}
                      </TableCell>
                      <TableCell>
                        <TandaLini lini={o.tipe} />
                      </TableCell>
                      <SelUang nominal={sisaTagihan(o)} />
                      <TableCell
                        className={
                          umur < 0 ? "text-destructive whitespace-nowrap" : "whitespace-nowrap"
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
          )}
        </Seksi>
      </KontenHalaman>
    </>
  );
}

/**
 * Titik impas bulan berjalan — pengganti "HPP per hari" di sheet client.
 *
 * Kartu lebar sendiri, bukan KPI kelima: angkanya butuh pembanding (laba
 * kotor vs biaya tetap), dan bar progres membuat "sudah seberapa dekat"
 * terbaca tanpa menghitung. Sebagai KPI kelima juga merusak grid 4 kolom.
 */
function KartuTitikImpas() {
  const t = titikImpas(BULAN);
  const impas = t.kurang === 0;

  return (
    <Card className="p-5">
      <CardHeader className="p-0">
        <CardDescription className="flex items-center gap-1.5 text-xs">
          <Target className="size-3.5" />
          Titik impas Agustus
        </CardDescription>
        <CardTitle className="font-heading text-base font-semibold">
          {impas
            ? "Biaya tetap bulan ini sudah tertutup"
            : `Kurang ${formatRp(t.kurang)} lagi untuk impas`}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-0">
        <Progress
          value={Math.min(100, Math.max(0, Math.round(t.rasio * 100)))}
          aria-label="Laba kotor terhadap biaya tetap"
        />
        <p className="font-mono text-xs text-muted-foreground">
          Laba kotor {formatRp(t.labaKotor)} dari biaya tetap{" "}
          {formatRp(t.biayaTetap)} · {formatPersen(t.rasio)}
        </p>
        <p className="text-xs text-muted-foreground">
          Biaya tetap = biaya operasional + dana maintenance. Dibandingkan
          dengan laba kotor, bukan omzet — omzet event yang habis untuk fee
          crew tidak ikut menutup sewa.
        </p>
      </CardContent>
    </Card>
  );
}

function Kpi({
  label,
  nilai,
  catatan,
  ikon: Ikon,
  mendesak,
}: {
  label: string;
  nilai: string;
  catatan: string;
  ikon?: React.ComponentType<{ className?: string }>;
  mendesak?: boolean;
}) {
  return (
    <Card className="p-5">
      <CardHeader className="p-0">
        <CardDescription className="flex items-center gap-1.5 text-xs">
          {Ikon && (
            <Ikon className={mendesak ? "size-3.5 text-destructive" : "size-3.5"} />
          )}
          {label}
        </CardDescription>
        {/*
          Angka KPI 30px/600 mono (R2). Mono dipakai supaya empat kartu yang
          berderet punya lebar digit sama — tanpa itu angka besar dan kecil
          terlihat tidak sejajar dan mata harus menyesuaikan tiap kartu.
        */}
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

function Seksi({
  judul,
  aksi,
  children,
}: {
  judul: string;
  aksi: { label: string; ke: string };
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold">{judul}</h2>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link to={aksi.ke} />}
        >
          {aksi.label}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
      {children}
    </section>
  );
}
