/**
 * Aset & Maintenance — business-flow 8.9. Bonus di luar quotation Paket B.
 *
 * Menu sendiri di grup Data, bukan tab di Modal & Bagi Hasil: daftar aset
 * adalah data master yang dirujuk setiap kali ada servis, bukan laporan yang
 * dibuka sebulan sekali.
 *
 * Satu-satunya pintu menambah aset. Menambah aset otomatis mencatat
 * investasinya (dan setoran modal kalau dibayar owner), dan alokasi dana
 * maintenance dihitung dari daftar ini — jadi tidak ada angka maintenance
 * yang diketik tangan. Di sheet client, angka ketik tangan itulah yang salah
 * Rp 97.350 karena jumlah unit lupa dikali.
 */

import { useState } from "react";
import { Link } from "react-router";
import { Plus, TriangleAlert, Wrench } from "lucide-react";
import { toast } from "sonner";

import { HeaderHalaman, KontenHalaman } from "~/components/app-shell";
import {
  KELAS_DENSITY,
  KepalaUang,
  KosongTabel,
  SelKode,
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  BULAN_BERJALAN,
  HARI_INI,
  KATEGORI_ASET,
  akumulasiMaintenanceAset,
  alokasiMaintenanceAset,
  alokasiMaintenanceBulan,
  aset,
  asetPerluRawat,
  investasi,
  namaOwner,
  nilaiBuku,
  owners,
  rawatBerikutnya,
  riwayatServis,
  saldoPosDana,
  setoranOwner,
  validasiAset,
  validasiServis,
  type Aset,
  type ServisAset,
} from "~/lib/dummy";
import { aksi, idBaru, useDataDemo } from "~/lib/store";
import {
  formatBulan,
  formatRp,
  formatTanggal,
  formatUmurPiutang,
  hanyaDigit,
  selisihHari,
} from "~/lib/format";

const LABEL_JENIS_SERVIS: Record<ServisAset["jenis"], string> = {
  rutin: "Perawatan rutin",
  perbaikan: "Perbaikan",
};

export default function AsetPage() {
  useDataDemo();
  const [tambah, setTambah] = useState(false);
  // Simpan ID, bukan objek: setelah servis atau lepas aset, Sheet harus
  // membaca data terbaru dari store, bukan salinan saat baris diklik.
  const [detailId, setDetailId] = useState<string | null>(null);

  const daftar = [...aset].sort(
    // Aset yang dilepas di bawah — masih ditampilkan sebagai riwayat.
    (a, b) => Number(Boolean(a.lepas)) - Number(Boolean(b.lepas)) || a.id.localeCompare(b.id),
  );
  const dimiliki = aset.filter((a) => !a.lepas);
  const perlu = asetPerluRawat();
  const detail = aset.find((a) => a.id === detailId) ?? null;

  return (
    <>
      <HeaderHalaman
        judul="Aset & Maintenance"
        aksi={
          <Button onClick={() => setTambah(true)}>
            <Plus data-icon="inline-start" />
            Tambah Aset
          </Button>
        }
      />
      <KontenHalaman>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Ringkas
            label="Aset dimiliki"
            nilai={`${dimiliki.reduce((s, a) => s + a.unit, 0)} unit`}
            catatan={`${dimiliki.length} jenis alat`}
          />
          <Ringkas
            label="Nilai beli"
            nilai={formatRp(dimiliki.reduce((s, a) => s + a.hargaSatuan * a.unit, 0))}
            catatan="harga saat dibeli"
          />
          <Ringkas
            label="Nilai buku"
            nilai={formatRp(dimiliki.reduce((s, a) => s + nilaiBuku(a), 0))}
            catatan="setelah penyusutan, hanya informasi"
          />
          <Ringkas
            label={`Alokasi maintenance ${formatBulan(BULAN_BERJALAN)}`}
            nilai={formatRp(alokasiMaintenanceBulan(BULAN_BERJALAN))}
            catatan="dihitung dari daftar ini, masuk Laba Rugi"
          />
        </div>

        {perlu.length > 0 && (
          <Alert>
            <TriangleAlert />
            <AlertTitle>{perlu.length} aset perlu dirawat</AlertTitle>
            <AlertDescription>
              {perlu.map((p) => (
                <span key={p.aset.id} className="block">
                  {p.aset.nama} ({p.aset.catatan}) — perawatan{" "}
                  {formatUmurPiutang(p.selisihHari)}.
                </span>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {daftar.length === 0 ? (
          <KosongTabel
            kalimat="Belum ada aset. Catat alat studio supaya dana maintenance dihitung otomatis."
            aksi={{ label: "Tambah Aset", onClick: () => setTambah(true) }}
          />
        ) : (
          <TabelData>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Aset</TableHead>
                <TableHead>Kategori</TableHead>
                <KepalaUang>Unit</KepalaUang>
                <KepalaUang>Harga beli</KepalaUang>
                <KepalaUang>Maintenance / bln</KepalaUang>
                <KepalaUang>Nilai buku</KepalaUang>
                <TableHead>Perawatan berikutnya</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {daftar.map((a) => (
                <TableRow
                  key={a.id}
                  // Dipudarkan seperti order Batal: masih tampil sebagai
                  // riwayat, tapi jelas bukan bagian dari yang aktif.
                  className={`cursor-pointer ${a.lepas ? "opacity-60" : ""}`}
                  onClick={() => setDetailId(a.id)}
                >
                  <SelKode>{a.id}</SelKode>
                  <TableCell>
                    <span className="font-medium">{a.nama}</span>
                    {a.catatan && (
                      <span className="ml-2 text-xs text-muted-foreground">{a.catatan}</span>
                    )}
                  </TableCell>
                  <TableCell>{a.kategori}</TableCell>
                  <TableCell className="text-right font-mono">{a.unit}</TableCell>
                  <SelUang nominal={a.hargaSatuan * a.unit} />
                  <SelUang nominal={alokasiMaintenanceAset(a, BULAN_BERJALAN)} />
                  <SelUang nominal={nilaiBuku(a)} />
                  <TableCell className="whitespace-nowrap">
                    <JadwalRawat aset={a} />
                  </TableCell>
                  <TableCell>
                    <StatusAset aset={a} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TabelData>
        )}

        <p className="text-xs text-muted-foreground">
          Alokasi maintenance = harga × unit × persen, untuk aset yang dimiliki
          di akhir bulan. Dikurangkan di Laba Rugi sebelum laba bersih dan masuk
          dana maintenance. Nilai buku hanya informasi — tidak masuk Laba Rugi,
          supaya keausan alat tidak dibebankan dua kali. Klik baris untuk riwayat
          servis.
        </p>
      </KontenHalaman>

      {tambah && <DialogTambahAset onTutup={() => setTambah(false)} />}
      {detail && <SheetAset aset={detail} onTutup={() => setDetailId(null)} />}
    </>
  );
}

// ── Sel ─────────────────────────────────────────────────────────────────────

function JadwalRawat({ aset: a }: { aset: Aset }) {
  if (a.lepas) return <span className="text-muted-foreground">—</span>;
  const tanggal = rawatBerikutnya(a);
  if (!tanggal) return <span className="text-muted-foreground">Tanpa jadwal</span>;
  const selisih = selisihHari(HARI_INI, tanggal);
  return (
    <span className="flex flex-col">
      <span>{formatTanggal(tanggal)}</span>
      {/* Merah untuk yang lewat — konvensi yang sama dengan umur piutang. */}
      <span className={`text-xs ${selisih < 0 ? "text-destructive" : "text-muted-foreground"}`}>
        {formatUmurPiutang(selisih)}
      </span>
    </span>
  );
}

/** Netral, tanpa warna: yang menuntut aksi adalah jadwal lewat, bukan status. */
function StatusAset({ aset: a }: { aset: Aset }) {
  if (a.lepas) {
    return <span className="text-xs text-muted-foreground">Dilepas · {a.lepas.alasan}</span>;
  }
  return a.status === "rusak" ? (
    <Badge variant="outline">Rusak</Badge>
  ) : (
    <Badge variant="secondary">Aktif</Badge>
  );
}

// ── Detail ──────────────────────────────────────────────────────────────────

function SheetAset({ aset: a, onTutup }: { aset: Aset; onTutup: () => void }) {
  const [dialog, setDialog] = useState<"servis" | "lepas" | null>(null);
  const riwayat = riwayatServis(a.id);
  const totalServis = riwayat.reduce((s, x) => s + x.nominal, 0);
  const disisihkan = akumulasiMaintenanceAset(a);
  const inv = investasi.find((i) => i.id === a.investasiId);
  const setoran = setoranOwner.find((s) => s.id === inv?.setoranId);
  const jadwal = rawatBerikutnya(a);

  return (
    <>
      <Sheet open onOpenChange={(o) => !o && onTutup()}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              {a.nama}
              <StatusAset aset={a} />
            </SheetTitle>
            <SheetDescription>
              <span className="font-mono">{a.id}</span> · {a.kategori}
              {a.catatan ? ` · ${a.catatan}` : ""}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-6 p-4">
            {!a.lepas && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setDialog("servis")}>
                  <Wrench data-icon="inline-start" />
                  Catat Servis
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const baru = a.status === "rusak" ? "aktif" : "rusak";
                    aksi.ubahStatusAset(a.id, baru);
                    toast.success(baru === "rusak" ? "Ditandai rusak" : "Ditandai aktif kembali", {
                      description: "Alokasi maintenance tetap berjalan selama aset masih dimiliki.",
                    });
                  }}
                >
                  {a.status === "rusak" ? "Tandai Aktif" : "Tandai Rusak"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDialog("lepas")}>
                  Lepas Aset
                </Button>
              </div>
            )}

            {a.lepas && (
              <div className="rounded-md bg-muted p-3 text-sm">
                Dilepas {formatTanggal(a.lepas.tanggal)} — {a.lepas.alasan}.
                {a.lepas.hargaJual > 0
                  ? ` Hasil jual ${formatRp(a.lepas.hargaJual)} masuk dana maintenance.`
                  : " Tidak ada hasil jual."}{" "}
                Alokasi maintenance berhenti sejak bulan itu.
              </div>
            )}

            <Bagian judul="Rincian">
              <Table className={KELAS_DENSITY}>
                <TableBody>
                  <Baris label="Harga beli">
                    {a.unit} × {formatRp(a.hargaSatuan)} = {formatRp(a.hargaSatuan * a.unit)}
                  </Baris>
                  <Baris label="Tanggal beli">{formatTanggal(a.tanggalBeli)}</Baris>
                  <Baris label="Dibiayai">
                    {setoran ? `Modal ${namaOwner(setoran.ownerId)}` : inv ? "Kas usaha" : "—"}
                  </Baris>
                  <Baris label="Maintenance">
                    {a.persenMaintenance}% · {formatRp(alokasiMaintenanceAset(a, BULAN_BERJALAN))} / bulan
                  </Baris>
                  <Baris label="Nilai buku">
                    {formatRp(nilaiBuku(a))} · umur ekonomis {a.umurBulan} bulan
                  </Baris>
                  <Baris label="Perawatan">
                    {a.intervalRawatBulan === null
                      ? "Tanpa jadwal berkala"
                      : `Tiap ${a.intervalRawatBulan} bulan${jadwal && !a.lepas ? ` · berikutnya ${formatTanggal(jadwal)}` : ""}`}
                  </Baris>
                </TableBody>
              </Table>
            </Bagian>

            <Bagian judul="Riwayat servis">
              {riwayat.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  Belum ada riwayat servis.
                </p>
              ) : (
                <Table className={KELAS_DENSITY}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <KepalaUang>Biaya</KepalaUang>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {riwayat.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="whitespace-nowrap">{formatTanggal(s.tanggal)}</TableCell>
                        <TableCell className="whitespace-nowrap">{LABEL_JENIS_SERVIS[s.jenis]}</TableCell>
                        <TableCell className="text-muted-foreground">{s.keterangan}</TableCell>
                        <SelUang nominal={s.nominal} />
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Bagian>

            {/*
              Perbandingan ini yang membuat daftar aset berguna melampaui
              sheet: alat mana yang biaya servisnya melebihi dana yang
              disisihkan untuknya — kandidat pertama diganti, atau tanda
              persen maintenance-nya terlalu kecil.
            */}
            <p className="text-sm text-muted-foreground">
              Total servis{" "}
              <span className="font-mono text-foreground">{formatRp(totalServis)}</span> dari{" "}
              <span className="font-mono text-foreground">{formatRp(disisihkan)}</span> yang
              sudah disisihkan untuk aset ini (bulan yang sudah tutup).
              {totalServis > disisihkan &&
                " Biaya servisnya melebihi dana yang disisihkan — pertimbangkan menaikkan persen maintenance atau mengganti alat."}
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {dialog === "servis" && <DialogServis aset={a} onTutup={() => setDialog(null)} />}
      {dialog === "lepas" && <DialogLepas aset={a} onTutup={() => setDialog(null)} />}
    </>
  );
}

function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{judul}</h3>
      <div className="overflow-hidden rounded-lg border py-1">{children}</div>
    </section>
  );
}

function Baris({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="w-36 text-muted-foreground">{label}</TableCell>
      <TableCell>{children}</TableCell>
    </TableRow>
  );
}

// ── Dialog ──────────────────────────────────────────────────────────────────

function DialogTambahAset({ onTutup }: { onTutup: () => void }) {
  const awal = KATEGORI_ASET[0];
  const [nama, setNama] = useState("");
  const [kategori, setKategori] = useState(awal.nama);
  const [catatan, setCatatan] = useState("");
  const [unit, setUnit] = useState("1");
  const [harga, setHarga] = useState("");
  const [tanggal, setTanggal] = useState(HARI_INI);
  const [persen, setPersen] = useState("5");
  const [umur, setUmur] = useState(String(awal.umurBulan));
  const [interval, setIntervalRawat] = useState(awal.intervalRawatBulan === null ? "" : String(awal.intervalRawatBulan));
  const [dibiayai, setDibiayai] = useState("kas");

  const calon: Omit<Aset, "id" | "investasiId"> = {
    nama: nama.trim(),
    kategori,
    catatan: catatan.trim(),
    unit: Number(unit) || 0,
    hargaSatuan: Number(harga) || 0,
    tanggalBeli: tanggal,
    persenMaintenance: Number(persen) || 0,
    umurBulan: Number(umur) || 0,
    intervalRawatBulan: interval === "" ? null : Number(interval),
    status: "aktif",
    lepas: null,
  };
  const salah = validasiAset({ ...calon, id: "", investasiId: null });
  // Pesan baru muncul setelah ada isian — form kosong bukan kesalahan.
  const tampilSalah = salah && (nama !== "" || harga !== "");
  const perBulan = Math.round((calon.hargaSatuan * calon.unit * calon.persenMaintenance) / 100);

  const gantiKategori = (k: string) => {
    setKategori(k);
    // Default umur & interval ikut kategori — owner jarang tahu angkanya, dan
    // yang tahu tetap bisa mengubahnya setelah ini.
    const def = KATEGORI_ASET.find((x) => x.nama === k);
    if (!def) return;
    setUmur(String(def.umurBulan));
    setIntervalRawat(def.intervalRawatBulan === null ? "" : String(def.intervalRawatBulan));
  };

  const simpan = () => {
    try {
      aksi.tambahAset(calon, dibiayai === "kas" ? null : dibiayai);
      toast.success("Aset tercatat", {
        description:
          dibiayai === "kas"
            ? `${calon.nama} — tercatat juga sebagai investasi dari kas usaha.`
            : `${calon.nama} — tercatat juga sebagai investasi dan modal ${namaOwner(dibiayai)}.`,
      });
      onTutup();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onTutup()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Tambah Aset</DialogTitle>
          <DialogDescription>
            Alat yang dipakai berbulan-bulan. Otomatis tercatat sebagai investasi —
            tidak masuk Biaya maupun Laba Rugi.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="nama-aset">Nama</FieldLabel>
              <Input
                id="nama-aset"
                placeholder="Lensa portrait"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="kategori-aset">Kategori</FieldLabel>
              <Select value={kategori} onValueChange={(v) => v && gantiKategori(v)}>
                <SelectTrigger id="kategori-aset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {KATEGORI_ASET.map((k) => (
                      <SelectItem key={k.nama} value={k.nama}>
                        {k.nama}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="catatan-aset">
              Merek / model <span className="text-muted-foreground">— opsional</span>
            </FieldLabel>
            <Input
              id="catatan-aset"
              placeholder="Canon RF 50mm f/1.8"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <Field>
              <FieldLabel htmlFor="unit-aset">Unit</FieldLabel>
              <Input
                id="unit-aset"
                inputMode="numeric"
                className="font-mono"
                value={unit}
                onChange={(e) => setUnit(hanyaDigit(e.target.value))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="harga-aset">Harga / unit</FieldLabel>
              <Input
                id="harga-aset"
                inputMode="numeric"
                className="font-mono"
                placeholder="0"
                value={harga}
                onChange={(e) => setHarga(hanyaDigit(e.target.value))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="tgl-aset">Tanggal beli</FieldLabel>
              <Input
                id="tgl-aset"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field>
              <FieldLabel htmlFor="persen-aset">Maintenance (%/bln)</FieldLabel>
              <Input
                id="persen-aset"
                inputMode="numeric"
                className="font-mono"
                value={persen}
                onChange={(e) => setPersen(hanyaDigit(e.target.value))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="umur-aset">Umur (bulan)</FieldLabel>
              <Input
                id="umur-aset"
                inputMode="numeric"
                className="font-mono"
                value={umur}
                onChange={(e) => setUmur(hanyaDigit(e.target.value))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="interval-aset">Rawat tiap (bulan)</FieldLabel>
              <Input
                id="interval-aset"
                inputMode="numeric"
                className="font-mono"
                placeholder="tanpa jadwal"
                value={interval}
                onChange={(e) => setIntervalRawat(hanyaDigit(e.target.value))}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel>Dibayar dari</FieldLabel>
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
          </Field>

          <p className={`text-xs ${tampilSalah ? "text-destructive" : "text-muted-foreground"}`}>
            {tampilSalah
              ? salah
              : perBulan > 0
                ? `Alokasi maintenance +${formatRp(perBulan)} / bulan mulai ${formatBulan(tanggal.slice(0, 7))}. Bulan sebelumnya tidak berubah.`
                : "Umur dan jadwal perawatan terisi otomatis dari kategori — ubah kalau tahu angka sebenarnya."}
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

const JENIS_SERVIS = ["rutin", "perbaikan"] as const;

function DialogServis({ aset: a, onTutup }: { aset: Aset; onTutup: () => void }) {
  const [jenis, setJenis] = useState<ServisAset["jenis"]>("rutin");
  const [keterangan, setKeterangan] = useState("");
  const [tanggal, setTanggal] = useState(HARI_INI);
  const [nominal, setNominal] = useState("");

  const angka = Number(nominal) || 0;
  const salah = validasiServis(angka);
  const lengkap = keterangan.trim() !== "" && !salah;

  const simpan = () => {
    try {
      aksi.catatServis({
        id: idBaru("SRV"),
        asetId: a.id,
        tanggal,
        jenis,
        keterangan: keterangan.trim(),
        nominal: angka,
      });
      toast.success("Servis tercatat", {
        description:
          angka > 0
            ? `${formatRp(angka)} dari dana maintenance — tidak masuk Laba Rugi.`
            : "Tanpa biaya — jadwal perawatan berikutnya dihitung ulang.",
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
          <DialogTitle>Catat Servis — {a.nama}</DialogTitle>
          <DialogDescription>
            Biayanya diambil dari dana maintenance, bukan dicatat di Biaya.
            Jadwal perawatan berikutnya dihitung dari tanggal ini.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel>Jenis</FieldLabel>
            <ToggleGroup
              value={[jenis]}
              onValueChange={(v) => {
                const j = JENIS_SERVIS.find((x) => x === v[0]);
                if (j) setJenis(j);
              }}
            >
              <ToggleGroupItem value="rutin">Perawatan rutin</ToggleGroupItem>
              <ToggleGroupItem value="perbaikan">Perbaikan</ToggleGroupItem>
            </ToggleGroup>
          </Field>

          <Field>
            <FieldLabel htmlFor="ket-servis">Keterangan</FieldLabel>
            <Input
              id="ket-servis"
              placeholder={jenis === "rutin" ? "Head cleaning" : "Ganti kipas pendingin"}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="tgl-servis">Tanggal</FieldLabel>
              <Input
                id="tgl-servis"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="nom-servis">
                Biaya <span className="text-muted-foreground">— boleh 0</span>
              </FieldLabel>
              <Input
                id="nom-servis"
                inputMode="numeric"
                className="font-mono"
                placeholder="0"
                value={nominal}
                aria-invalid={Boolean(salah)}
                onChange={(e) => setNominal(hanyaDigit(e.target.value))}
              />
            </Field>
          </div>

          <p className="font-mono text-xs text-muted-foreground">
            Saldo dana maintenance {formatRp(saldoPosDana("maintenance"))}
          </p>
          {salah && (
            <p className="text-xs text-destructive">
              {salah}{" "}
              <Link to="/bagi-hasil" className="font-medium underline underline-offset-2">
                Buka Modal & Bagi Hasil
              </Link>
            </p>
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

const ALASAN_LEPAS = ["Dijual", "Rusak total", "Hilang"] as const;

function DialogLepas({ aset: a, onTutup }: { aset: Aset; onTutup: () => void }) {
  const [alasan, setAlasan] = useState<(typeof ALASAN_LEPAS)[number]>("Dijual");
  const [tanggal, setTanggal] = useState(HARI_INI);
  const [harga, setHarga] = useState("");

  const hargaJual = alasan === "Dijual" ? Number(harga) || 0 : 0;

  const simpan = () => {
    try {
      aksi.lepasAset(a.id, { tanggal, alasan, hargaJual });
      toast.success("Aset dilepas", {
        description:
          hargaJual > 0
            ? `Hasil jual ${formatRp(hargaJual)} masuk dana maintenance.`
            : "Riwayatnya tetap tersimpan.",
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
          <DialogTitle>Lepas Aset — {a.nama}</DialogTitle>
          <DialogDescription>
            Aset tidak dihapus — riwayat servis dan alokasi bulan-bulan
            sebelumnya tetap ada. Alokasi maintenance berhenti mulai bulan
            aset dilepas.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel>Alasan</FieldLabel>
            <ToggleGroup
              value={[alasan]}
              onValueChange={(v) => {
                const x = ALASAN_LEPAS.find((y) => y === v[0]);
                if (x) setAlasan(x);
              }}
            >
              {ALASAN_LEPAS.map((x) => (
                <ToggleGroupItem key={x} value={x}>
                  {x}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="tgl-lepas">Tanggal</FieldLabel>
              <Input
                id="tgl-lepas"
                type="date"
                min={a.tanggalBeli}
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </Field>
            {alasan === "Dijual" && (
              <Field>
                <FieldLabel htmlFor="harga-jual">Harga jual</FieldLabel>
                <Input
                  id="harga-jual"
                  inputMode="numeric"
                  className="font-mono"
                  placeholder="0"
                  value={harga}
                  onChange={(e) => setHarga(hanyaDigit(e.target.value))}
                />
              </Field>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {alasan === "Dijual"
              ? `Hasil jual masuk dana maintenance untuk membeli pengganti — bukan omzet. Nilai buku saat ini ${formatRp(nilaiBuku(a))}.`
              : "Tidak ada uang masuk. Kalau perlu pengganti, beli dari dana maintenance atau catat sebagai aset baru."}
          </p>
        </FieldGroup>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Batal</Button>} />
          <Button onClick={simpan}>Lepas Aset</Button>
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
        <CardTitle className="font-mono text-2xl font-semibold">{nilai}</CardTitle>
      </CardHeader>
      <p className="text-xs text-muted-foreground">{catatan}</p>
    </Card>
  );
}
