/**
 * Biaya — Biaya Job + Biaya Operasional (prompt 4.11).
 *
 * Dua jenis biaya yang sering tertukar, dan tertukarnya merusak laporan:
 *
 * - **Biaya job** menempel ke satu order (fee fotografer, MUA, transport, sewa
 *   lokasi/alat). Ini "HPP jasa" — berbeda tiap job, jadi tidak bisa ditaruh di
 *   katalog. Masuk ke Biaya Langsung dan mengurangi margin lini terkait.
 * - **Biaya operasional** bulanan dan tidak bisa dinisbatkan ke order mana pun
 *   (sewa tempat, listrik, iklan). Masuk setelah Laba Kotor.
 *
 * Dipisah jadi dua tab, bukan satu tabel dengan kolom "jenis": kalau digabung,
 * owner akan mencatat sewa bulanan sebagai biaya job dan margin per lini jadi
 * bohong tanpa ada yang sadar. Yang sengaja TIDAK dilakukan: alokasi overhead
 * ke tiap job — kerumitannya besar, manfaatnya tidak terasa di skala ini
 * (business-flow bagian 7).
 */

import { useState } from "react";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { HeaderHalaman, KontenHalaman } from "~/components/app-shell";
import {
  KepalaUang,
  KosongTabel,
  SelKode,
  SelUang,
  TabelData,
} from "~/components/data-table";
import { TandaLini } from "~/components/status-order";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  HARI_INI,
  biayaOperasional,
  customerDari,
  orders,
  type BiayaJob,
  type Lini,
} from "~/lib/dummy";
import { aksi, idBaru, useDataDemo } from "~/lib/store";
import { formatRp, formatTanggal } from "~/lib/format";

const BULAN = HARI_INI.slice(0, 7);

interface BarisBiayaJob extends BiayaJob {
  orderNo: string;
  customer: string;
  lini: Lini;
}

export default function Biaya() {
  useDataDemo();
  const [tab, setTab] = useState("job");
  /**
   * Dialog dibuka dengan mode yang mengikuti tab aktif. Owner yang sedang
   * melihat daftar biaya job hampir pasti mau mencatat biaya job — memaksanya
   * memilih jenis lagi di dalam dialog adalah langkah yang jawabannya sudah
   * dia berikan lewat tab.
   */
  const [buka, setBuka] = useState(false);

  const biayaJob: BarisBiayaJob[] = orders
    .flatMap((o) =>
      o.biayaJob.map((b) => ({
        ...b,
        orderNo: o.no,
        customer: customerDari(o).nama,
        lini: o.tipe,
      })),
    )
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  const opsBulanIni = biayaOperasional.filter((b) =>
    b.tanggal.startsWith(BULAN),
  );

  const totalJob = biayaJob.reduce((s, b) => s + b.nominal, 0);
  const totalOps = opsBulanIni.reduce((s, b) => s + b.nominal, 0);

  return (
    <>
      <HeaderHalaman
        judul="Biaya"
        aksi={
          <Button onClick={() => setBuka(true)}>
            <Plus data-icon="inline-start" />
            Catat Biaya
          </Button>
        }
      />
      <KontenHalaman>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Ringkas
            label="Biaya langsung (job)"
            nilai={formatRp(totalJob)}
            catatan="menempel ke order, mengurangi margin lini"
          />
          <Ringkas
            label="Biaya operasional"
            nilai={formatRp(totalOps)}
            catatan="bulanan, tidak dialokasikan ke lini"
          />
          <Ringkas
            label="Total keluar Agustus"
            nilai={formatRp(totalJob + totalOps)}
            catatan="belum termasuk HPP bahan produk"
          />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="job">Biaya Job</TabsTrigger>
            <TabsTrigger value="operasional">Biaya Operasional</TabsTrigger>
          </TabsList>

          <TabsContent value="job" className="mt-4 flex flex-col gap-3">
            {biayaJob.length === 0 ? (
              <KosongTabel
                kalimat="Belum ada biaya langsung tercatat. Catat fee crew, transport, dan sewa setelah acara selesai."
                aksi={{ label: "Catat Biaya", onClick: () => setBuka(true) }}
              />
            ) : (
              <TabelData>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Lini</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <KepalaUang>Nominal</KepalaUang>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {biayaJob.map((b, i) => (
                    <TableRow key={`${b.orderNo}-${i}`}>
                      <TableCell className="whitespace-nowrap">
                        {formatTanggal(b.tanggal)}
                      </TableCell>
                      <SelKode>{b.orderNo}</SelKode>
                      <TableCell className="whitespace-nowrap">
                        {b.customer}
                      </TableCell>
                      <TableCell>
                        <TandaLini lini={b.lini} />
                      </TableCell>
                      <TableCell>{b.kategori}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {b.keterangan}
                      </TableCell>
                      <SelUang nominal={b.nominal} />
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={6} className="font-semibold">
                      Total biaya job
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatRp(totalJob)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </TabelData>
            )}
            <p className="text-xs text-muted-foreground">
              Biaya job dicatat setelah acara, bukan saat deal — nilainya baru
              pasti setelah dikerjakan, dan ini yang menentukan job benar-benar
              untung atau tidak.
            </p>
          </TabsContent>

          <TabsContent value="operasional" className="mt-4 flex flex-col gap-3">
            {opsBulanIni.length === 0 ? (
              <KosongTabel
                kalimat="Belum ada biaya tercatat bulan ini."
                aksi={{ label: "Catat Biaya", onClick: () => setBuka(true) }}
              />
            ) : (
              <TabelData>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <KepalaUang>Nominal</KepalaUang>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opsBulanIni.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatTanggal(b.tanggal)}
                      </TableCell>
                      <TableCell className="font-medium">{b.kategori}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {b.keterangan}
                      </TableCell>
                      <SelUang nominal={b.nominal} />
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="font-semibold">
                      Total biaya operasional
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatRp(totalOps)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </TabelData>
            )}
            <p className="text-xs text-muted-foreground">
              Biaya operasional tidak dibagi-bagi ke tiap order. Di skala ini,
              alokasi overhead menambah kerumitan besar dengan manfaat yang tidak
              terasa — cukup dikurangkan sekali dari laba kotor.
            </p>
          </TabsContent>
        </Tabs>
      </KontenHalaman>

      <DialogCatatBiaya
        buka={buka}
        modeAwal={tab === "operasional" ? "operasional" : "job"}
        onTutup={() => setBuka(false)}
      />
    </>
  );
}

/** Kategori yang sudah ada dipakai sebagai saran, bukan daftar tertutup —
 *  bisnis baru jalan sebulan dan kategorinya masih akan berubah. */
const KATEGORI_JOB = ["Crew", "Transport", "Sewa alat", "Sewa lokasi", "Bahan"];
const KATEGORI_OPS = [
  "Sewa tempat",
  "Utilitas",
  "Marketing",
  "Gaji tetap",
  "Lain-lain",
];

function DialogCatatBiaya({
  buka,
  modeAwal,
  onTutup,
}: {
  buka: boolean;
  modeAwal: "job" | "operasional";
  onTutup: () => void;
}) {
  // Remount tiap kali dibuka: form ini pendek dan selalu diisi dari nol, jadi
  // mempertahankan isian sebelumnya cuma bikin owner menghapus manual.
  return buka ? (
    <IsiDialogBiaya key={modeAwal + String(buka)} modeAwal={modeAwal} onTutup={onTutup} />
  ) : (
    <Dialog open={false} onOpenChange={() => {}} />
  );
}

function IsiDialogBiaya({
  modeAwal,
  onTutup,
}: {
  modeAwal: "job" | "operasional";
  onTutup: () => void;
}) {
  const [mode, setMode] = useState<"job" | "operasional">(modeAwal);
  const [orderNo, setOrderNo] = useState("");
  const [kategori, setKategori] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [nominal, setNominal] = useState("");
  const [tanggal, setTanggal] = useState(HARI_INI);

  const angka = Number(nominal) || 0;
  const lengkap =
    angka > 0 && kategori !== "" && (mode === "operasional" || orderNo !== "");

  /**
   * Hanya order studio & event yang bisa dibebani biaya job. Retail sudah punya
   * HPP bahan dari katalog — membebaninya biaya job lagi akan menghitung biaya
   * yang sama dua kali di laporan margin.
   */
  const orderBisa = orders.filter(
    (o) => o.tipe !== "retail" && o.statusKerja !== "Batal",
  );
  const dipilih = orders.find((o) => o.no === orderNo);

  const simpan = () => {
    if (mode === "job") {
      aksi.catatBiayaJob(orderNo, {
        tanggal,
        kategori,
        keterangan: keterangan.trim() || kategori,
        nominal: angka,
      });
      toast.success("Biaya job tercatat", {
        description: `${orderNo} · ${formatRp(angka)} — margin order dan lini dihitung ulang.`,
      });
    } else {
      aksi.catatBiayaOperasional({
        id: idBaru("OPS"),
        tanggal,
        kategori,
        keterangan: keterangan.trim() || kategori,
        nominal: angka,
      });
      toast.success("Biaya operasional tercatat", {
        description: `${formatRp(angka)} — masuk setelah laba kotor, tidak dibagi ke lini.`,
      });
    }
    onTutup();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onTutup()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Catat Biaya</DialogTitle>
          <DialogDescription>
            Jenisnya menentukan di mana biaya ini muncul di Laba Rugi.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel>Jenis biaya</FieldLabel>
            <ToggleGroup
              value={[mode]}
              onValueChange={(v) => {
                if (!v[0]) return;
                setMode(v[0] as "job" | "operasional");
                setKategori("");
              }}
            >
              <ToggleGroupItem value="job">Biaya job</ToggleGroupItem>
              <ToggleGroupItem value="operasional">Operasional</ToggleGroupItem>
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">
              {mode === "job"
                ? "Menempel ke satu order dan mengurangi margin lini order itu."
                : "Bulanan, tidak dinisbatkan ke order mana pun. Dikurangkan setelah laba kotor."}
            </p>
            {/*
              Dua salah catat yang memotong laba dua kali (business-flow 8.2
              & 8.4, blocker): beli alat/renovasi dicatat sebagai biaya, dan
              servis alat dicatat sebagai biaya padahal sudah disisihkan lewat
              dana maintenance. Ditaruh di form ini karena di sinilah owner
              memutuskan "ini biaya" — layar Modal & Bagi Hasil baru dibuka
              setelah salahnya terjadi.
            */}
            <p className="text-xs text-muted-foreground">
              Beli alat atau renovasi? Itu investasi, bukan biaya. Servis alat
              dibayar dari dana maintenance. Keduanya dicatat di{" "}
              <Link
                to="/bagi-hasil"
                className="font-medium text-foreground underline underline-offset-2"
              >
                Modal & Bagi Hasil
              </Link>
              .
            </p>
          </Field>

          {mode === "job" && (
            <Field>
              <FieldLabel htmlFor="order">Order</FieldLabel>
              <Select value={orderNo} onValueChange={(v) => setOrderNo(v ?? "")}>
                <SelectTrigger id="order">
                  <SelectValue placeholder="Pilih order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {orderBisa.map((o) => (
                      <SelectItem key={o.no} value={o.no}>
                        {o.no} · {customerDari(o).nama} · {formatTanggal(o.tanggal)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {dipilih && (
                <p className="text-xs text-muted-foreground">
                  Biaya job {dipilih.no} saat ini{" "}
                  {formatRp(dipilih.biayaJob.reduce((s, b) => s + b.nominal, 0))}.
                </p>
              )}
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor="kategori">Kategori</FieldLabel>
            <Select value={kategori} onValueChange={(v) => setKategori(v ?? "")}>
              <SelectTrigger id="kategori">
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {(mode === "job" ? KATEGORI_JOB : KATEGORI_OPS).map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="ket">
              Keterangan <span className="text-muted-foreground">— opsional</span>
            </FieldLabel>
            <Input
              id="ket"
              placeholder={
                mode === "job" ? "Fee fotografer utama" : "Listrik + internet"
              }
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="tgl">Tanggal</FieldLabel>
              <Input
                id="tgl"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="nom">Nominal</FieldLabel>
              {/* Non-digit dibuang — rupiah di app ini selalu integer (R5). */}
              <Input
                id="nom"
                inputMode="numeric"
                className="font-mono"
                placeholder="0"
                value={nominal}
                onChange={(e) => setNominal(e.target.value.replace(/\D/g, ""))}
              />
            </Field>
          </div>
        </FieldGroup>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Batal</Button>} />
          <Button disabled={!lengkap} onClick={simpan}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Ringkas({
  label,
  nilai,
  catatan,
}: {
  label: string;
  nilai: string;
  catatan: string;
}) {
  return (
    <Card className="p-5">
      <CardHeader className="p-0">
        <CardDescription className="text-xs">{label}</CardDescription>
        <CardTitle className="font-mono text-2xl font-semibold">
          {nilai}
        </CardTitle>
      </CardHeader>
      <p className="text-xs text-muted-foreground">{catatan}</p>
    </Card>
  );
}
