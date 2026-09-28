/**
 * Modal & Bagi Hasil — business-flow bagian 8.
 *
 * Menu sendiri di grup Keluaran, bukan tab tambahan di Biaya. Biaya diisi
 * harian oleh siapa pun yang mencatat transaksi; layar ini dibuka owner
 * sebulan sekali. Kalau digabung, form biaya harian bersebelahan dengan
 * pemakaian dana dan investasi — tiga hal yang kalau tertukar merusak laba
 * (pemakaian dana dan investasi TIDAK boleh masuk Laba Rugi, 8.2 & 8.4).
 */

import { useState } from "react";
import { Plus, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { HeaderHalaman, KontenHalaman } from "~/components/app-shell";
import {
  KepalaUang,
  KosongTabel,
  SelUang,
  TabelData,
} from "~/components/data-table";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
import { Progress } from "~/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  BULAN_BERJALAN,
  HARI_INI,
  LABEL_POS_DANA,
  bagiHasil,
  bulanBerikut,
  investasi,
  mutasiPosDana,
  namaOwner,
  owners,
  pengaturanBagiHasil,
  pengaturanUntuk,
  progresBalikModal,
  saldoPosDana,
  setoranOwner,
  sisaPinjamanPerSetoran,
  validasiPemakaian,
  validasiPengaturan,
  type PengaturanBagiHasil,
  type PosDana,
  type SetoranOwner,
} from "~/lib/dummy";
import { aksi, idBaru, useDataDemo } from "~/lib/store";
import { formatBulan, formatPersen, formatRp, formatTanggal } from "~/lib/format";

const POS: PosDana[] = ["maintenance", "cadangan"];

const LABEL_TUJUAN: Record<SetoranOwner["tujuan"], string> = {
  kas: "Kas usaha",
  maintenance: "Dana maintenance",
  cadangan: "Dana cadangan",
  investasi: "Investasi",
};

/** Aksi utama header mengikuti tab aktif — tab Bagi Hasil hanya dibaca. */
const AKSI_TAB = [
  { tab: "setoran", label: "Catat Setoran" },
  { tab: "dana", label: "Catat Pemakaian" },
  { tab: "investasi", label: "Catat Investasi" },
  { tab: "rasio", label: "Ubah Rasio" },
] as const;

export default function BagiHasil() {
  useDataDemo();
  const [tab, setTab] = useState("hasil");
  const [dialog, setDialog] = useState<string | null>(null);
  const tutup = () => setDialog(null);

  const riwayat = bagiHasil(BULAN_BERJALAN);
  const terakhir = riwayat.at(-1);
  const sisaPinjaman = sisaPinjamanPerSetoran();
  const totalPinjaman = [...sisaPinjaman.values()].reduce((s, n) => s + n, 0);
  const aksiTab = AKSI_TAB.find((a) => a.tab === tab);

  return (
    <>
      <HeaderHalaman
        judul="Modal & Bagi Hasil"
        aksi={
          aksiTab && (
            <Button onClick={() => setDialog(aksiTab.tab)}>
              <Plus data-icon="inline-start" />
              {aksiTab.label}
            </Button>
          )
        }
      />
      <KontenHalaman>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Ringkas
            label={LABEL_POS_DANA.maintenance}
            nilai={saldoPosDana("maintenance")}
            catatan="untuk servis dan ganti alat"
          />
          <Ringkas
            label={LABEL_POS_DANA.cadangan}
            nilai={saldoPosDana("cadangan")}
            catatan="untuk pembelian mendesak"
          />
          <Ringkas
            label="Pinjaman owner belum kembali"
            nilai={totalPinjaman}
            catatan="dilunasi sebelum laba dibagi"
          />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="hasil">Bagi Hasil</TabsTrigger>
            <TabsTrigger value="setoran">Setoran Owner</TabsTrigger>
            <TabsTrigger value="dana">Pos Dana</TabsTrigger>
            <TabsTrigger value="investasi">Investasi</TabsTrigger>
            <TabsTrigger value="rasio">Rasio</TabsTrigger>
          </TabsList>

          <TabsContent value="hasil" className="mt-4 flex flex-col gap-6">
            {riwayat.length === 0 ? (
              <KosongTabel
                kalimat="Belum ada aturan bagi hasil. Tentukan rasio tiap owner dulu."
                aksi={{ label: "Atur Rasio", onClick: () => setDialog("rasio") }}
              />
            ) : (
              <TabBagiHasil riwayat={riwayat} />
            )}
            {terakhir &&
              (terakhir.akumulasiRugi > 0 || terakhir.sisaPinjaman > 0) && (
                <Alert>
                  <TriangleAlert />
                  <AlertTitle>
                    {formatBulan(bulanBerikut(BULAN_BERJALAN))}: laba ditahan
                    dulu sampai{" "}
                    {formatRp(
                      Math.max(terakhir.akumulasiRugi, terakhir.sisaPinjaman),
                    )}
                  </AlertTitle>
                  <AlertDescription>
                    {terakhir.akumulasiRugi > 0 &&
                      `Rugi ${formatRp(terakhir.akumulasiRugi)} dibawa ke bulan depan. `}
                    {terakhir.sisaPinjaman > 0 &&
                      `Pinjaman owner ${formatRp(terakhir.sisaPinjaman)} dilunasi dari potongan yang sama — rugi dan pinjaman itu uang yang sama, jadi tidak dipotong dua kali. `}
                    Baru setelah itu sisanya dibagi.
                  </AlertDescription>
                </Alert>
              )}
            <ProgresModal />
          </TabsContent>

          <TabsContent value="setoran" className="mt-4 flex flex-col gap-3">
            <TabSetoran
              sisaPinjaman={sisaPinjaman}
              onCatat={() => setDialog("setoran")}
            />
          </TabsContent>

          <TabsContent value="dana" className="mt-4 flex flex-col gap-6">
            {POS.map((pos) => (
              <TabelPosDana key={pos} pos={pos} />
            ))}
            <p className="text-xs text-muted-foreground">
              Pemakaian dana tidak masuk Laba Rugi — uangnya sudah dikurangi
              saat disisihkan. Servis alat dicatat di sini, bukan di Biaya,
              supaya laba tidak terpotong dua kali. Alokasi{" "}
              {formatBulan(BULAN_BERJALAN)} masuk setelah bulan tutup.
            </p>
          </TabsContent>

          <TabsContent value="investasi" className="mt-4 flex flex-col gap-3">
            <TabInvestasi onCatat={() => setDialog("investasi")} />
          </TabsContent>

          <TabsContent value="rasio" className="mt-4 flex flex-col gap-3">
            <TabRasio />
          </TabsContent>
        </Tabs>
      </KontenHalaman>

      {dialog === "setoran" && <DialogSetoran onTutup={tutup} />}
      {dialog === "dana" && (
        <DialogPemakaian
          onTutup={tutup}
          onBukaSetoran={() => setDialog("setoran")}
        />
      )}
      {dialog === "investasi" && <DialogInvestasi onTutup={tutup} />}
      {dialog === "rasio" && <DialogRasio onTutup={tutup} />}
    </>
  );
}

// ── Tab ─────────────────────────────────────────────────────────────────────

function TabBagiHasil({ riwayat }: { riwayat: ReturnType<typeof bagiHasil> }) {
  return (
    <div className="flex flex-col gap-3">
      <TabelData>
        <TableHeader>
          <TableRow>
            <TableHead>Bulan</TableHead>
            <KepalaUang>Laba bersih</KepalaUang>
            <KepalaUang>Kompensasi</KepalaUang>
            <KepalaUang>Dibagi</KepalaUang>
            <KepalaUang>Cadangan</KepalaUang>
            {owners.map((o) => (
              <KepalaUang key={o.id}>{o.nama}</KepalaUang>
            ))}
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {riwayat.map((b) => (
            <TableRow key={b.bulan}>
              <TableCell className="whitespace-nowrap">
                {formatBulan(b.bulan)}
                {b.dariSaldoAwal && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    dari sheet
                  </span>
                )}
              </TableCell>
              <SelUang nominal={b.labaBersih} />
              <SelUang nominal={-b.potongan} />
              <SelUang nominal={b.dibagi} />
              <SelUang nominal={b.cadangan} />
              {owners.map((o) => {
                const bagian = b.bagian.find((x) => x.ownerId === o.id);
                return (
                  <TableCell key={o.id} className="text-right">
                    <span className={`font-mono ${bagian?.nominal ? "" : "text-muted-foreground"}`}>
                      {formatRp(bagian?.nominal ?? 0)}
                    </span>
                    {/* Persen di tiap baris, bukan di header: rasio bisa
                        berbeda antar bulan (business-flow 8.6). */}
                    <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                      {bagian ? `${bagian.persen}%` : "—"}
                    </span>
                  </TableCell>
                );
              })}
              <TableCell>
                {b.final ? (
                  <Badge variant="outline">Final</Badge>
                ) : (
                  <Badge variant="secondary">Berjalan</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TabelData>
      <p className="text-xs text-muted-foreground">
        Bulan berjalan masih berubah setiap ada transaksi. Angka jadi final
        setelah bulan tutup. Yang dihitung di sini adalah hak tiap owner —
        pencairannya terjadi di luar app.
      </p>
    </div>
  );
}

function ProgresModal() {
  const progres = progresBalikModal();

  // Modal awal belum diisi → widget disembunyikan, bukan tampil 0%
  // (business-flow 8.7). Angka 0% menyesatkan: terbaca "belum balik modal
  // sama sekali", padahal yang benar "modalnya belum dicatat".
  if (progres.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Progres balik modal muncul setelah modal awal owner dicatat di tab
        Setoran Owner.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border p-5">
      <h2 className="font-heading text-base font-semibold">
        Progres balik modal
      </h2>
      {progres.map((p) => (
        <div key={p.owner.id} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium">{p.owner.nama}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {formatRp(p.hakBagiHasil)} dari {formatRp(p.modal)} ·{" "}
              {formatPersen(p.rasio)}
            </span>
          </div>
          <Progress
            value={Math.min(100, Math.round(p.rasio * 100))}
            aria-label={`Progres balik modal ${p.owner.nama}`}
          />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Dari hak bagi hasil bulan yang sudah tutup. Kalau owner sepakat
        mengubah rasio setelah balik modal, tambahkan aturan baru di tab Rasio.
      </p>
    </section>
  );
}

function TabSetoran({
  sisaPinjaman,
  onCatat,
}: {
  sisaPinjaman: Map<string, number>;
  onCatat: () => void;
}) {
  const daftar = [...setoranOwner].sort((a, b) =>
    b.tanggal.localeCompare(a.tanggal),
  );

  return (
    <>
      {daftar.length === 0 ? (
        <KosongTabel
          kalimat="Belum ada setoran owner. Catat modal awal atau pinjaman owner ke usaha."
          aksi={{ label: "Catat Setoran", onClick: onCatat }}
        />
      ) : (
        <TabelData>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Tujuan</TableHead>
              <TableHead>Keterangan</TableHead>
              <KepalaUang>Nominal</KepalaUang>
              <KepalaUang>Sisa pinjaman</KepalaUang>
            </TableRow>
          </TableHeader>
          <TableBody>
            {daftar.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="whitespace-nowrap">
                  {formatTanggal(s.tanggal)}
                </TableCell>
                <TableCell className="font-medium">{namaOwner(s.ownerId)}</TableCell>
                <TableCell>
                  {/* Netral, bukan warna: hanya status bayar yang dapat
                      warna karena hanya itu yang menuntut aksi (R3). */}
                  <Badge variant={s.jenis === "pinjaman" ? "outline" : "secondary"}>
                    {s.jenis === "pinjaman" ? "Pinjaman" : "Modal"}
                  </Badge>
                </TableCell>
                <TableCell>{LABEL_TUJUAN[s.tujuan]}</TableCell>
                <TableCell className="text-muted-foreground">{s.keterangan}</TableCell>
                <SelUang nominal={s.nominal} />
                {s.jenis === "pinjaman" ? (
                  <SelUang nominal={sisaPinjaman.get(s.id) ?? 0} />
                ) : (
                  <TableCell className="text-right text-muted-foreground">—</TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </TabelData>
      )}
      <p className="text-xs text-muted-foreground">
        Setoran bukan omzet dan tidak muncul di Laba Rugi. Pinjaman dikembalikan
        sebelum laba dibagi; modal kembali lewat bagi hasil.
      </p>
    </>
  );
}

function TabelPosDana({ pos }: { pos: PosDana }) {
  const mutasi = mutasiPosDana(pos);

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-base font-semibold">
          {LABEL_POS_DANA[pos]}
        </h2>
        <span className="font-mono text-sm">
          Saldo {formatRp(saldoPosDana(pos))}
        </span>
      </div>
      {mutasi.length === 0 ? (
        <KosongTabel kalimat="Belum ada mutasi. Alokasi masuk otomatis setiap akhir bulan." />
      ) : (
        <TabelData>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Keterangan</TableHead>
              <KepalaUang>Masuk</KepalaUang>
              <KepalaUang>Keluar</KepalaUang>
              <KepalaUang>Saldo</KepalaUang>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mutasi.map((m, i) => (
              <TableRow key={`${m.tanggal}-${i}`}>
                <TableCell className="whitespace-nowrap">
                  {formatTanggal(m.tanggal)}
                </TableCell>
                <TableCell className="whitespace-nowrap">{m.jenis}</TableCell>
                <TableCell className="text-muted-foreground">{m.keterangan}</TableCell>
                <SelUang nominal={m.masuk} />
                <SelUang nominal={m.keluar === 0 ? 0 : -m.keluar} />
                <SelUang nominal={m.saldo} />
              </TableRow>
            ))}
          </TableBody>
        </TabelData>
      )}
    </section>
  );
}

function TabInvestasi({ onCatat }: { onCatat: () => void }) {
  const daftar = [...investasi].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  const total = daftar.reduce((s, i) => s + i.nominal, 0);
  const pembiaya = (setoranId: string | null) => {
    const s = setoranOwner.find((x) => x.id === setoranId);
    return s ? `Modal ${namaOwner(s.ownerId)}` : "Kas usaha";
  };

  return (
    <>
      {daftar.length === 0 ? (
        <KosongTabel
          kalimat="Belum ada investasi. Renovasi dan pembelian alat dicatat di sini, bukan di Biaya."
          aksi={{ label: "Catat Investasi", onClick: onCatat }}
        />
      ) : (
        <TabelData>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead>Dibiayai</TableHead>
              <KepalaUang>Nominal</KepalaUang>
            </TableRow>
          </TableHeader>
          <TableBody>
            {daftar.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="whitespace-nowrap">
                  {formatTanggal(i.tanggal)}
                </TableCell>
                <TableCell className="font-medium">{i.keterangan}</TableCell>
                <TableCell>{pembiaya(i.setoranId)}</TableCell>
                <SelUang nominal={i.nominal} />
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="font-semibold">
                Total investasi
              </TableCell>
              <TableCell className="text-right font-mono font-semibold">
                {formatRp(total)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </TabelData>
      )}
      <p className="text-xs text-muted-foreground">
        Investasi tidak masuk Laba Rugi. Kalau renovasi dicatat sebagai biaya,
        bulan itu rugi besar dan bagi hasil kedua owner tertahan berbulan-bulan
        — modal satu owner ikut dikembalikan dari bagian owner lain.
      </p>
    </>
  );
}

function TabRasio() {
  const daftar = [...pengaturanBagiHasil].sort((a, b) =>
    b.berlakuMulai.localeCompare(a.berlakuMulai),
  );
  const sekarang = pengaturanUntuk(BULAN_BERJALAN);

  return (
    <>
      <TabelData>
        <TableHeader>
          <TableRow>
            <TableHead>Berlaku mulai</TableHead>
            {owners.map((o) => (
              <KepalaUang key={o.id}>{o.nama}</KepalaUang>
            ))}
            <KepalaUang>Dana cadangan</KepalaUang>
            <KepalaUang>Maintenance / bulan</KepalaUang>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {daftar.map((p) => (
            <TableRow key={p.berlakuMulai}>
              <TableCell className="whitespace-nowrap font-medium">
                {formatBulan(p.berlakuMulai)}
              </TableCell>
              {owners.map((o) => {
                const b = p.bagian.find((x) => x.ownerId === o.id);
                return (
                  <TableCell key={o.id} className="text-right font-mono">
                    {b ? `${b.persen}%` : "—"}
                  </TableCell>
                );
              })}
              <TableCell className="text-right font-mono">
                {p.persenCadangan}%
              </TableCell>
              <SelUang nominal={p.alokasiMaintenance} />
              <TableCell>
                {p === sekarang ? (
                  <Badge variant="secondary">Berlaku</Badge>
                ) : p.berlakuMulai > BULAN_BERJALAN ? (
                  <Badge variant="outline">Terjadwal</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Riwayat</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TabelData>
      <p className="text-xs text-muted-foreground">
        Aturan lama tidak bisa diedit. Mengubah rasio menambah baris baru yang
        berlaku mulai bulan tertentu, supaya bagi hasil bulan lalu tidak ikut
        berubah.
      </p>
    </>
  );
}

// ── Dialog ──────────────────────────────────────────────────────────────────

/** Non-digit dibuang — rupiah di app ini selalu integer (R5). */
function hanyaAngka(v: string): string {
  return v.replace(/\D/g, "");
}

const JENIS_SETORAN = ["pinjaman", "modal"] as const;
const TUJUAN_PINJAMAN = ["kas", "maintenance", "cadangan"] as const;

function DialogSetoran({ onTutup }: { onTutup: () => void }) {
  const [ownerId, setOwnerId] = useState(owners[0]?.id ?? "");
  const [jenis, setJenis] = useState<SetoranOwner["jenis"]>("pinjaman");
  const [tujuan, setTujuan] = useState<SetoranOwner["tujuan"]>("kas");
  const [keterangan, setKeterangan] = useState("");
  const [tanggal, setTanggal] = useState(HARI_INI);
  const [nominal, setNominal] = useState("");

  const angka = Number(nominal) || 0;
  const lengkap = angka > 0 && ownerId !== "";

  const simpan = () => {
    aksi.catatSetoran({
      id: idBaru("STR"),
      tanggal,
      ownerId,
      nominal: angka,
      jenis,
      // Modal lewat dialog ini selalu ke kas; modal untuk renovasi/alat
      // dicatat lewat Catat Investasi supaya investasinya ikut tercatat.
      tujuan: jenis === "modal" ? "kas" : tujuan,
      keterangan: keterangan.trim() || (jenis === "modal" ? "Setoran modal" : "Pinjaman owner"),
    });
    toast.success("Setoran tercatat", {
      description: `${namaOwner(ownerId)} · ${formatRp(angka)} — tidak masuk omzet.`,
    });
    onTutup();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onTutup()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Catat Setoran Owner</DialogTitle>
          <DialogDescription>
            Uang dari owner ke usaha. Bukan omzet, tidak memengaruhi laba.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel>Owner</FieldLabel>
            <ToggleGroup
              value={[ownerId]}
              onValueChange={(v) => v[0] && setOwnerId(v[0])}
            >
              {owners.map((o) => (
                <ToggleGroupItem key={o.id} value={o.id}>
                  {o.nama}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>

          <Field>
            <FieldLabel>Jenis</FieldLabel>
            <ToggleGroup
              value={[jenis]}
              onValueChange={(v) => {
                const j = JENIS_SETORAN.find((x) => x === v[0]);
                if (j) setJenis(j);
              }}
            >
              <ToggleGroupItem value="pinjaman">Pinjaman</ToggleGroupItem>
              <ToggleGroupItem value="modal">Modal</ToggleGroupItem>
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">
              {jenis === "pinjaman"
                ? "Dikembalikan ke owner ini sebelum laba dibagi. Pakai untuk menutup rugi atau kekurangan dana."
                : "Tidak dikembalikan langsung — kembalinya lewat bagi hasil. Untuk renovasi atau alat, pakai Catat Investasi."}
            </p>
          </Field>

          {jenis === "pinjaman" && (
            <Field>
              <FieldLabel htmlFor="tujuan">Masuk ke</FieldLabel>
              <Select
                value={tujuan}
                onValueChange={(v) => {
                  const t = TUJUAN_PINJAMAN.find((x) => x === v);
                  if (t) setTujuan(t);
                }}
              >
                <SelectTrigger id="tujuan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {TUJUAN_PINJAMAN.map((t) => (
                      <SelectItem key={t} value={t}>
                        {LABEL_TUJUAN[t]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {tujuan === "kas"
                  ? "Dilunasi dari laba bulan berikutnya, sebelum dibagi."
                  : "Dilunasi dari alokasi pos dana ini di bulan berikutnya."}
              </p>
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor="ket-setoran">
              Keterangan <span className="text-muted-foreground">— opsional</span>
            </FieldLabel>
            <Input
              id="ket-setoran"
              placeholder="Menutup kekurangan kas"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="tgl-setoran">Tanggal</FieldLabel>
              <Input
                id="tgl-setoran"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="nom-setoran">Nominal</FieldLabel>
              <Input
                id="nom-setoran"
                inputMode="numeric"
                className="font-mono"
                placeholder="0"
                value={nominal}
                onChange={(e) => setNominal(hanyaAngka(e.target.value))}
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

function DialogPemakaian({
  onTutup,
  onBukaSetoran,
}: {
  onTutup: () => void;
  onBukaSetoran: () => void;
}) {
  const [pos, setPos] = useState<PosDana>("maintenance");
  const [keterangan, setKeterangan] = useState("");
  const [tanggal, setTanggal] = useState(HARI_INI);
  const [nominal, setNominal] = useState("");

  const angka = Number(nominal) || 0;
  // Pesan saldo baru muncul setelah ada nominal — kosong bukan kesalahan.
  const salah = angka > 0 ? validasiPemakaian(pos, angka) : null;
  const lengkap = angka > 0 && keterangan.trim() !== "" && !salah;

  const simpan = () => {
    try {
      aksi.catatPemakaianDana({
        id: idBaru("DNA"),
        tanggal,
        pos,
        nominal: angka,
        keterangan: keterangan.trim(),
      });
      toast.success("Pemakaian dana tercatat", {
        description: `${LABEL_POS_DANA[pos]} · ${formatRp(angka)} — tidak masuk Laba Rugi.`,
      });
      onTutup();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onTutup()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Catat Pemakaian Dana</DialogTitle>
          <DialogDescription>
            Servis alat atau pembelian mendesak. Tidak dicatat di Biaya — uangnya
            sudah dikurangi dari laba saat disisihkan.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel>Pos dana</FieldLabel>
            <ToggleGroup
              value={[pos]}
              onValueChange={(v) => {
                const p = POS.find((x) => x === v[0]);
                if (p) setPos(p);
              }}
            >
              {POS.map((p) => (
                <ToggleGroupItem key={p} value={p}>
                  {LABEL_POS_DANA[p]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="font-mono text-xs text-muted-foreground">
              Saldo {formatRp(saldoPosDana(pos))}
            </p>
          </Field>

          <Field>
            <FieldLabel htmlFor="ket-dana">Keterangan</FieldLabel>
            <Input
              id="ket-dana"
              placeholder="Servis lighting"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="tgl-dana">Tanggal</FieldLabel>
              <Input
                id="tgl-dana"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="nom-dana">Nominal</FieldLabel>
              <Input
                id="nom-dana"
                inputMode="numeric"
                className="font-mono"
                placeholder="0"
                value={nominal}
                aria-invalid={Boolean(salah)}
                onChange={(e) => setNominal(hanyaAngka(e.target.value))}
              />
            </Field>
          </div>

          {salah && (
            <div className="flex flex-col items-start gap-2">
              <p className="text-xs text-destructive">{salah}</p>
              <Button variant="outline" size="sm" onClick={onBukaSetoran}>
                Catat Setoran Owner
              </Button>
            </div>
          )}
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

function DialogInvestasi({ onTutup }: { onTutup: () => void }) {
  const [keterangan, setKeterangan] = useState("");
  const [tanggal, setTanggal] = useState(HARI_INI);
  const [nominal, setNominal] = useState("");
  const [dibiayai, setDibiayai] = useState("kas");

  const angka = Number(nominal) || 0;
  const lengkap = angka > 0 && keterangan.trim() !== "";

  const simpan = () => {
    aksi.catatInvestasi(
      { id: idBaru("INV"), tanggal, keterangan: keterangan.trim(), nominal: angka },
      dibiayai === "kas" ? null : dibiayai,
    );
    toast.success("Investasi tercatat", {
      description:
        dibiayai === "kas"
          ? `${formatRp(angka)} dari kas usaha — tidak masuk Laba Rugi.`
          : `${formatRp(angka)} — sekaligus tercatat sebagai modal ${namaOwner(dibiayai)}.`,
    });
    onTutup();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onTutup()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Catat Investasi</DialogTitle>
          <DialogDescription>
            Renovasi atau pembelian alat baru. Servis rutin dicatat sebagai
            pemakaian dana maintenance, bukan di sini.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="ket-inv">Keterangan</FieldLabel>
            <Input
              id="ket-inv"
              placeholder="Renovasi ruang studio"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel>Dibiayai dari</FieldLabel>
            <ToggleGroup
              value={[dibiayai]}
              onValueChange={(v) => v[0] && setDibiayai(v[0])}
            >
              <ToggleGroupItem value="kas">Kas usaha</ToggleGroupItem>
              {owners.map((o) => (
                <ToggleGroupItem key={o.id} value={o.id}>
                  {o.nama}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">
              {dibiayai === "kas"
                ? "Dibayar dari uang usaha. Tidak menambah modal siapa pun."
                : `Otomatis tercatat sebagai setoran modal ${namaOwner(dibiayai)} — dipakai untuk menghitung progres balik modal.`}
            </p>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="tgl-inv">Tanggal</FieldLabel>
              <Input
                id="tgl-inv"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="nom-inv">Nominal</FieldLabel>
              <Input
                id="nom-inv"
                inputMode="numeric"
                className="font-mono"
                placeholder="0"
                value={nominal}
                onChange={(e) => setNominal(hanyaAngka(e.target.value))}
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

function DialogRasio({ onTutup }: { onTutup: () => void }) {
  const acuan = pengaturanUntuk(BULAN_BERJALAN) ?? pengaturanBagiHasil.at(-1);
  // Default bulan depan (atau sesudah aturan terjadwal terakhir): aturan
  // untuk bulan berjalan boleh, tapi jarang yang dimaksud — rasio biasanya
  // disepakati untuk periode berikutnya.
  const terakhir = [...pengaturanBagiHasil]
    .map((p) => p.berlakuMulai)
    .sort()
    .at(-1);
  const dasar =
    terakhir && terakhir >= BULAN_BERJALAN ? terakhir : BULAN_BERJALAN;

  const [berlakuMulai, setBerlakuMulai] = useState(bulanBerikut(dasar));
  const [persen, setPersen] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      owners.map((o) => [
        o.id,
        String(acuan?.bagian.find((b) => b.ownerId === o.id)?.persen ?? 0),
      ]),
    ),
  );
  const [cadangan, setCadangan] = useState(String(acuan?.persenCadangan ?? 10));
  const [maintenance, setMaintenance] = useState(
    String(acuan?.alokasiMaintenance ?? 0),
  );

  const calon: PengaturanBagiHasil = {
    berlakuMulai,
    alokasiMaintenance: Number(maintenance) || 0,
    persenCadangan: Number(cadangan) || 0,
    bagian: owners.map((o) => ({ ownerId: o.id, persen: Number(persen[o.id]) || 0 })),
  };
  const salah = validasiPengaturan(calon);

  const simpan = () => {
    try {
      aksi.tambahPengaturan(calon);
      toast.success("Rasio baru tersimpan", {
        description: `Berlaku mulai ${formatBulan(berlakuMulai)}. Bulan sebelumnya tetap memakai rasio lama.`,
      });
      onTutup();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onTutup()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ubah Rasio Bagi Hasil</DialogTitle>
          <DialogDescription>
            Menambah aturan baru, bukan mengedit yang lama — bagi hasil bulan
            sebelumnya tidak ikut berubah.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="mulai">Berlaku mulai</FieldLabel>
            <Input
              id="mulai"
              type="month"
              min={BULAN_BERJALAN}
              value={berlakuMulai}
              onChange={(e) => setBerlakuMulai(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            {owners.map((o) => (
              <Field key={o.id}>
                <FieldLabel htmlFor={`persen-${o.id}`}>Bagian {o.nama} (%)</FieldLabel>
                <Input
                  id={`persen-${o.id}`}
                  inputMode="numeric"
                  className="font-mono"
                  value={persen[o.id] ?? ""}
                  onChange={(e) =>
                    setPersen((p) => ({ ...p, [o.id]: hanyaAngka(e.target.value) }))
                  }
                />
              </Field>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="cadangan">Dana cadangan (%)</FieldLabel>
              <Input
                id="cadangan"
                inputMode="numeric"
                className="font-mono"
                value={cadangan}
                onChange={(e) => setCadangan(hanyaAngka(e.target.value))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="maintenance">Maintenance / bulan</FieldLabel>
              <Input
                id="maintenance"
                inputMode="numeric"
                className="font-mono"
                value={maintenance}
                onChange={(e) => setMaintenance(hanyaAngka(e.target.value))}
              />
            </Field>
          </div>

          <p className={`text-xs ${salah ? "text-destructive" : "text-muted-foreground"}`}>
            {salah ??
              `Dana cadangan diambil dulu dari laba yang dibagi, sisanya dibagi ke owner sesuai persen di atas.`}
          </p>
        </FieldGroup>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Batal</Button>} />
          <Button disabled={Boolean(salah)} onClick={simpan}>
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
  nilai: number;
  catatan: string;
}) {
  return (
    <Card className="p-5">
      <CardHeader className="p-0">
        <CardDescription className="text-xs">{label}</CardDescription>
        <CardTitle className="font-mono text-2xl font-semibold">
          {formatRp(nilai)}
        </CardTitle>
      </CardHeader>
      <p className="text-xs text-muted-foreground">{catatan}</p>
    </Card>
  );
}
