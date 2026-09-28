/**
 * Kalender Booking (prompt 4.8).
 *
 * Menjawab satu pertanyaan yang tidak bisa dijawab tabel: "tanggal ini kosong
 * atau tidak". Owner mengecek ini setiap kali ada customer menanyakan slot
 * (business-flow 5.2 langkah 2), dan di tabel yang diurut per nomor order itu
 * berarti memindai seluruh daftar.
 *
 * Sengaja TIDAK memakai komponen Calendar shadcn meski R9 menyebutnya: Calendar
 * di sana adalah date picker (react-day-picker) yang dirancang untuk MEMILIH
 * tanggal, bukan menampilkan beberapa acara per hari. Memaksakannya berarti
 * meng-override render tiap sel — lebih banyak kode daripada grid bulan biasa,
 * dan hasilnya tetap tidak bisa diklik seperti yang dibutuhkan di sini.
 */

import { useState } from "react";
import { ChevronLeft, ChevronRight, List } from "lucide-react";
import { Link } from "react-router";

import { HeaderHalaman, KontenHalaman } from "~/components/app-shell";
import { BadgeStatusBayar, ProgresKerja } from "~/components/status-order";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import {
  HARI_INI,
  LABEL_LINI,
  WARNA_LINI,
  customerDari,
  orders,
  ringkasanItem,
  sisaTagihan,
  totalOrder,
  type Lini,
  type Order,
} from "~/lib/dummy";
import { useDataDemo } from "~/lib/store";
import { formatJadwal, formatRp } from "~/lib/format";

const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export default function Kalender() {
  // Daftar ke store demo supaya perubahan dari layar lain (pembayaran,
  // biaya, status order, katalog) langsung terlihat di sini.
  useDataDemo();
  const [bulan, setBulan] = useState(() => {
    const [th, bl] = HARI_INI.split("-").map(Number);
    return { tahun: th, bulan: bl - 1 };
  });
  const [detail, setDetail] = useState<Order | null>(null);

  const pertama = new Date(bulan.tahun, bulan.bulan, 1);
  const jumlahHari = new Date(bulan.tahun, bulan.bulan + 1, 0).getDate();

  /**
   * Minggu dimulai Senin, bukan Minggu. `getDay()` mengembalikan 0 untuk
   * Minggu, jadi digeser: Senin jadi 0. Kalau tidak, kolom Sabtu–Minggu
   * terpisah di dua ujung dan akhir pekan — yang paling padat untuk studio
   * foto — jadi sulit dibaca sebagai satu blok.
   */
  const geser = (pertama.getDay() + 6) % 7;

  const kunciBulan = `${bulan.tahun}-${String(bulan.bulan + 1).padStart(2, "0")}`;

  /** Order terjadwal per tanggal. Retail tidak punya jadwal, jadi tidak masuk. */
  const perTanggal = new Map<number, Order[]>();
  for (const o of orders) {
    if (o.tipe === "retail") continue;
    if (!o.tanggal.startsWith(kunciBulan)) continue;
    const tgl = Number(o.tanggal.slice(8, 10));
    perTanggal.set(tgl, [...(perTanggal.get(tgl) ?? []), o]);
  }

  const namaBulan = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(pertama);

  const pindah = (delta: number) =>
    setBulan(({ tahun, bulan: b }) => {
      const d = new Date(tahun, b + delta, 1);
      return { tahun: d.getFullYear(), bulan: d.getMonth() };
    });

  const hariIniTgl =
    HARI_INI.startsWith(kunciBulan) ? Number(HARI_INI.slice(8, 10)) : null;

  return (
    <>
      <HeaderHalaman
        judul="Kalender"
        induk="Order & Booking"
        aksi={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/order" />}
          >
            <List data-icon="inline-start" />
            Tampilan Daftar
          </Button>
        }
      />
      <KontenHalaman>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              aria-label="Bulan sebelumnya"
              onClick={() => pindah(-1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label="Bulan berikutnya"
              onClick={() => pindah(1)}
            >
              <ChevronRight />
            </Button>
            <h2 className="font-heading text-base font-semibold">{namaBulan}</h2>
          </div>

          {/* Legenda warna lini — sama dengan chart di Laporan (R6). */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {(["studio", "event"] as Lini[]).map((l) => (
              <span key={l} className="flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ background: WARNA_LINI[l] }}
                />
                {LABEL_LINI[l]}
              </span>
            ))}
            <span className="text-muted-foreground/70">
              Retail tidak terjadwal
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <div className="grid grid-cols-7 border-b bg-muted/40">
            {HARI.map((h) => (
              <div
                key={h}
                className="px-3 py-2 text-xs font-medium text-muted-foreground"
              >
                {h}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {Array.from({ length: geser }, (_, i) => (
              <div key={`kosong-${i}`} className="min-h-28 border-r border-b" />
            ))}

            {Array.from({ length: jumlahHari }, (_, i) => {
              const tgl = i + 1;
              const isi = perTanggal.get(tgl) ?? [];
              const hariIni = tgl === hariIniTgl;
              return (
                <div
                  key={tgl}
                  className="flex min-h-28 flex-col gap-1 border-r border-b p-2"
                >
                  <span
                    className={
                      hariIni
                        ? "flex size-6 items-center justify-center rounded-full bg-primary font-mono text-xs text-primary-foreground"
                        : "px-1 font-mono text-xs text-muted-foreground"
                    }
                  >
                    {tgl}
                  </span>
                  {isi.map((o) => (
                    <button
                      key={o.no}
                      onClick={() => setDetail(o)}
                      className={`flex flex-col items-start gap-0.5 rounded-md px-2 py-1 text-left transition-opacity hover:opacity-80 ${
                        o.statusKerja === "Batal" ? "opacity-60 line-through" : ""
                      }`}
                      style={{
                        background: `color-mix(in oklch, ${WARNA_LINI[o.tipe]} 18%, transparent)`,
                      }}
                    >
                      <span className="truncate text-xs font-medium">
                        {customerDari(o).nama}
                      </span>
                      {/*
                        Baris jam DIHILANGKAN kalau ordernya tidak punya jam,
                        bukan diisi "—". Order event berjadwal tanggal saja, dan
                        dash di empat dari tujuh kartu cuma jadi derau yang
                        harus dilewati mata tanpa memberi informasi apa pun.
                      */}
                      {o.tanggal.includes("T") && (
                        <span className="truncate font-mono text-[11px] text-muted-foreground">
                          {o.tanggal.slice(11, 16)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {perTanggal.size === 0 && (
          <p className="text-sm text-muted-foreground">
            Belum ada jadwal bulan ini.
          </p>
        )}
      </KontenHalaman>

      <Sheet open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full gap-0 sm:max-w-md">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono">{detail.no}</SheetTitle>
                <SheetDescription>
                  {customerDari(detail).nama} · {formatJadwal(detail.tanggal)}
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 p-4">
                <ProgresKerja status={detail.statusKerja} />
                <div className="flex flex-col gap-1 text-sm">
                  <span>{ringkasanItem(detail)}</span>
                  {detail.lokasi && (
                    <span className="text-muted-foreground">
                      {detail.lokasi}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-mono">
                      {formatRp(totalOrder(detail))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sisa</span>
                    <span className="font-mono">
                      {formatRp(sisaTagihan(detail))}
                    </span>
                  </div>
                </div>
                <BadgeStatusBayar order={detail} />
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link to="/order" />}
                >
                  Buka di daftar order
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
