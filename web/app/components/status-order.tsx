/**
 * Sistem badge status — DESIGN.md R3 (blocker).
 *
 * Satu order punya dua status independen: progres kerja (6 nilai) dan progres
 * bayar (3 nilai). Kalau keduanya diberi warna penuh, satu baris tabel memuat
 * 9 kemungkinan warna dan yang penting jadi tenggelam. Pemisahannya berdasar
 * mana yang butuh aksi owner: status kerja itu informasi progres — owner sudah
 * tahu pekerjaannya sampai mana. Status bayar yang menuntut tindakan:
 * menagih. Jadi hanya status bayar yang dapat warna.
 *
 * Dipakai di Dashboard, Order List, Kalender, Piutang, dan Customer Detail.
 * Kalau tidak seragam, setiap layar jadi bahasa sendiri — dan itu persis yang
 * terjadi di mockup Stitch.
 */

import { X } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import {
  LABEL_LINI,
  URUTAN_STATUS_KERJA,
  WARNA_LINI,
  langkahProgres,
  rasioDibayar,
  statusBayar,
  type Lini,
  type Order,
  type StatusKerja,
} from "~/lib/dummy";
import { formatPersen } from "~/lib/format";

const TOTAL_LANGKAH = URUTAN_STATUS_KERJA.length;

/**
 * Indikator progres kerja — netral, bukan berwarna. Titik aktif `--foreground`,
 * titik sisa `--border`. Diserahkan (langkah terakhir) labelnya `--success`.
 */
export function ProgresKerja({ status }: { status: StatusKerja }) {
  if (status === "Batal") {
    return (
      <span className="flex items-center gap-2 text-destructive">
        <X className="size-3.5" />
        <span className="text-xs font-medium">Batal</span>
      </span>
    );
  }

  const langkah = langkahProgres(status);
  const selesai = langkah === TOTAL_LANGKAH;

  return (
    <span className="flex items-center gap-2">
      <Titik langkah={langkah} />
      <span
        className={cn(
          "text-xs font-medium",
          selesai ? "text-success" : "text-muted-foreground",
        )}
      >
        {status}
      </span>
    </span>
  );
}

function Titik({ langkah }: { langkah: number }) {
  return (
    <span className="flex shrink-0 gap-1">
      {Array.from({ length: TOTAL_LANGKAH }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-1.5 rounded-full",
            i < langkah ? "bg-foreground" : "bg-border",
          )}
        />
      ))}
    </span>
  );
}

/**
 * Legenda notasi titik — WAJIB ada di setiap layar yang menampilkan
 * ProgresKerja (R3). Notasi titik tidak menjelaskan dirinya sendiri, dan owner
 * tidak boleh perlu menghafal urutan 5 status. Dipasang sebagai tooltip di
 * header kolom supaya tidak memakan ruang vertikal di layar padat.
 */
export function LegendaProgres({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="cursor-help underline decoration-dotted decoration-from-font underline-offset-4">
            {children}
          </span>
        }
      />
      <TooltipContent align="start" className="w-auto">
        <span className="flex flex-col gap-1.5">
          {URUTAN_STATUS_KERJA.map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <Titik langkah={i + 1} />
              <span className="text-xs">{s}</span>
            </span>
          ))}
          <span className="flex items-center gap-2">
            <X className="size-3.5" />
            <span className="text-xs">Batal</span>
          </span>
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Badge status bayar. Persentase DP selalu ikut ditampilkan — "DP 40%", bukan
 * "DP" saja. Angka itu yang menentukan apakah tagihan perlu dikejar sekarang
 * atau bisa nanti (R3).
 */
export function BadgeStatusBayar({ order }: { order: Order }) {
  const status = statusBayar(order);

  if (status === "Lunas") return <Badge variant="success">Lunas</Badge>;
  if (status === "Belum Bayar") return <Badge variant="danger">Belum Bayar</Badge>;
  return <Badge variant="warning">DP {formatPersen(rasioDibayar(order))}</Badge>;
}

/**
 * Baris order yang dibatalkan ditampilkan opacity 60% (R3) — masih bisa dibaca
 * sebagai riwayat, tapi jelas tidak menuntut tindakan apa pun.
 */
export function kelasBarisOrder(order: Order): string {
  return order.statusKerja === "Batal" ? "opacity-60" : "";
}

/**
 * Penanda lini. Titik warnanya memakai token chart yang sama dengan chart di
 * layar Laporan (R6) — Retail biru, Studio amber, Event ungu. Konsistensi itu
 * yang membuat owner tidak perlu membaca legenda tiap kali berpindah layar.
 */
export function TandaLini({ lini }: { lini: Lini }) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ background: WARNA_LINI[lini] }}
      />
      <span className="text-sm">{LABEL_LINI[lini]}</span>
    </span>
  );
}
