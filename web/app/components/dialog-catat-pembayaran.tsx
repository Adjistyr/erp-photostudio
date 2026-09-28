/**
 * Dialog Catat Pembayaran (prompt 4.10).
 *
 * Komponen bersama, dipakai layar Piutang dan Sheet Detail Order. Sebelumnya
 * dialog ini hidup di dalam layar Piutang saja, jadi tombol "Catat Pembayaran"
 * di Detail Order cuma bisa melempar pengguna ke layar lain dan membuat dia
 * mencari ulang order yang barusan dibuka.
 *
 * Yang diperagakan di sini: status bayar TIDAK diinput. Pratinjau di bawah
 * form menunjukkan status yang akan dihasilkan oleh angka yang baru diketik —
 * itu poin business-flow bagian 4 yang paling susah dijelaskan lewat dokumen.
 */

import { useState } from "react";

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
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  HARI_INI,
  customerDari,
  sisaTagihan,
  totalDibayar,
  totalOrder,
  type MetodeBayar,
  type Order,
} from "~/lib/dummy";
import { aksi } from "~/lib/store";
import { formatPersen, formatRp } from "~/lib/format";

const METODE: MetodeBayar[] = ["Tunai", "Transfer", "QRIS"];

export function DialogCatatPembayaran({
  order,
  onTutup,
}: {
  order: Order | null;
  onTutup: () => void;
}) {
  if (!order) return <Dialog open={false} onOpenChange={() => {}} />;

  return (
    /*
      `key` memuat sisa tagihan, bukan cuma nomor order: kalau owner mencatat DP
      lalu membuka order yang SAMA lagi, nomornya tidak berubah sehingga state
      form tidak ter-reset dan nominal prefill-nya jadi sisa yang lama. Remount
      lewat key menghapus kebutuhan logika reset manual sama sekali.
    */
    <Isi
      key={`${order.no}-${sisaTagihan(order)}`}
      order={order}
      onTutup={onTutup}
    />
  );
}

function Isi({ order, onTutup }: { order: Order; onTutup: () => void }) {
  const sisa = sisaTagihan(order);
  // Prefill pelunasan penuh: kasus paling sering, dan owner tinggal mengubahnya
  // kalau customer bayar sebagian.
  const [nominal, setNominal] = useState(String(sisa));
  const [metode, setMetode] = useState<MetodeBayar>("Transfer");

  const angka = Number(nominal) || 0;
  const total = totalOrder(order);

  return (
    <Dialog open onOpenChange={(o) => !o && onTutup()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Catat Pembayaran</DialogTitle>
          <DialogDescription>
            {order.no} — {customerDari(order).nama}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <div className="flex justify-between rounded-md bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">Sisa tagihan</span>
            <span className="font-mono font-medium">{formatRp(sisa)}</span>
          </div>

          <Field>
            <FieldLabel htmlFor="nominal">Nominal</FieldLabel>
            {/*
              Non-digit dibuang, bukan divalidasi: owner sering menempel angka
              yang sudah terformat ("1.250.000") dan itu jadi 1250000 — yang
              dimaui. Konsekuensi yang disengaja: koma desimal juga terbuang.
              Aman HANYA karena R5 menetapkan rupiah tanpa desimal.
            */}
            <Input
              id="nominal"
              inputMode="numeric"
              className="font-mono"
              value={nominal}
              onChange={(e) => setNominal(e.target.value.replace(/\D/g, ""))}
            />
          </Field>

          <Field>
            <FieldLabel>Metode</FieldLabel>
            <ToggleGroup
              value={[metode]}
              onValueChange={(v) => v[0] && setMetode(v[0] as MetodeBayar)}
            >
              {METODE.map((m) => (
                <ToggleGroupItem key={m} value={m}>
                  {m}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>

          <p className="text-xs text-muted-foreground">
            Setelah dicatat, status order jadi{" "}
            <span className="font-medium text-foreground">
              {angka >= sisa
                ? "Lunas"
                : `DP ${formatPersen((totalDibayar(order) + angka) / total)}`}
            </span>
            . Status bayar tidak diinput — dihitung dari total pembayaran.
          </p>
        </FieldGroup>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Batal</Button>} />
          <Button
            disabled={angka <= 0}
            onClick={() => {
              aksi.catatPembayaran(order.no, {
                tanggal: HARI_INI,
                nominal: angka,
                metode,
                keterangan: angka >= sisa ? "Pelunasan" : "DP",
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
