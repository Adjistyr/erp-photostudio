/**
 * Katalog — Daftar + Dialog Tambah Item (prompt 4.1 & 4.2).
 *
 * Module fondasi: POS, Form Order, dan seluruh laporan HPP bergantung ke sini
 * (business-flow bagian 6). Karena itu layar ini yang jadi tujuan empty state
 * di Dashboard dan POS.
 *
 * Aturan isi yang gampang hilang: kolom HPP dan Margin diisi "—" untuk baris
 * Jasa, bukan Rp 0. HPP jasa bukan nol — dia tidak tetap, dicatat per job lewat
 * BiayaJob (business-flow bagian 7). Menulis Rp 0 akan membuat laporan margin
 * jasa terlihat 100% dan itu salah besar.
 */

import { useState } from "react";
import { Eye, EyeOff, MoreHorizontal, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { HeaderHalaman, KontenHalaman } from "~/components/app-shell";
import {
  KepalaUang,
  KosongTabel,
  SelKode,
  SelUang,
  TabelData,
} from "~/components/data-table";
import { Badge } from "~/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { katalog, type ItemKatalog } from "~/lib/dummy";
import { aksi, idBaru, useDataDemo } from "~/lib/store";
import { formatPersen, formatRp } from "~/lib/format";

type FilterJenis = "semua" | "produk" | "jasa";

export default function Katalog() {
  useDataDemo();
  const [filter, setFilter] = useState<FilterJenis>("semua");
  /** null = dialog tertutup · "baru" = tambah · ItemKatalog = edit item itu. */
  const [edit, setEdit] = useState<ItemKatalog | "baru" | null>(null);

  const semua = katalog;
  const terlihat =
    filter === "semua" ? semua : semua.filter((k) => k.jenis === filter);

  return (
    <>
      <HeaderHalaman
        judul="Katalog"
        aksi={
          <Button onClick={() => setEdit("baru")}>
            <Plus data-icon="inline-start" />
            Tambah Item
          </Button>
        }
      />
      <KontenHalaman>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterJenis)}>
          <TabsList>
            <TabsTrigger value="semua">Semua</TabsTrigger>
            <TabsTrigger value="produk">Produk</TabsTrigger>
            <TabsTrigger value="jasa">Jasa</TabsTrigger>
          </TabsList>
        </Tabs>

        {terlihat.length === 0 ? (
          <KosongTabel
            kalimat="Belum ada produk atau jasa. Tambahkan yang paling sering dijual dulu."
            aksi={{ label: "Tambah Item", onClick: () => setEdit("baru") }}
          />
        ) : (
          <TabelData>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Kategori</TableHead>
                <KepalaUang>Harga jual</KepalaUang>
                <KepalaUang>HPP bahan</KepalaUang>
                <KepalaUang>Margin</KepalaUang>
                <KepalaUang>Margin %</KepalaUang>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {terlihat.map((k) => (
                <TableRow key={k.id} className={k.aktif ? "" : "opacity-60"}>
                  <SelKode>{k.id}</SelKode>
                  <TableCell className="font-medium whitespace-nowrap">
                    {k.nama}
                  </TableCell>
                  <TableCell>
                    <Badge variant={k.jenis === "jasa" ? "outline" : "secondary"}>
                      {k.jenis === "jasa" ? "Jasa" : "Produk"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {k.kategori}
                  </TableCell>
                  <SelUang nominal={k.harga} />
                  {/*
                    Tiga kolom berikut "—" untuk Jasa. Sengaja BUKAN Rp 0:
                    nol berarti "tidak ada biaya", sedangkan yang benar adalah
                    "biayanya tidak tetap, dicatat per job".
                  */}
                  {k.hpp === null ? (
                    <>
                      <SelTakBerlaku />
                      <SelTakBerlaku />
                      <SelTakBerlaku />
                    </>
                  ) : (
                    <>
                      <SelUang nominal={k.hpp} />
                      <SelUang nominal={k.harga - k.hpp} />
                      <TableCell className="text-right font-mono">
                        {formatPersen((k.harga - k.hpp) / k.harga)}
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    {k.aktif ? (
                      <Badge variant="success">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {/*
                      Item TIDAK bisa dihapus, hanya dinonaktifkan. Menghapus
                      item yang pernah terjual akan memutus referensi dari
                      OrderItem lama dan membuat laporan historis kehilangan
                      nama produknya. Nonaktif menyembunyikannya dari POS dan
                      Form Order tanpa merusak riwayat.
                    */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button size="icon" variant="ghost" aria-label={`Aksi ${k.nama}`}>
                            <MoreHorizontal />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuItem onClick={() => setEdit(k)}>
                            <Pencil />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              aksi.ubahKatalog(k.id, { aktif: !k.aktif });
                              toast.success(
                                k.aktif ? "Item dinonaktifkan" : "Item diaktifkan",
                                {
                                  description: k.aktif
                                    ? `${k.nama} tidak lagi muncul di POS dan Form Order.`
                                    : `${k.nama} bisa dijual lagi.`,
                                },
                              );
                            }}
                          >
                            {k.aktif ? <EyeOff /> : <Eye />}
                            {k.aktif ? "Nonaktifkan" : "Aktifkan"}
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TabelData>
        )}

        <p className="text-xs text-muted-foreground">
          HPP bahan hanya berlaku untuk produk fisik. HPP jasa berbeda tiap job —
          fee crew, transport, sewa — dan dicatat per order lewat menu Biaya.
        </p>
      </KontenHalaman>

      <DialogItem edit={edit} onTutup={() => setEdit(null)} />
    </>
  );
}

function SelTakBerlaku() {
  return (
    <TableCell className="text-right font-mono text-muted-foreground">
      —
    </TableCell>
  );
}

/**
 * Satu dialog untuk tambah DAN edit (R9: "Tambah/edit item katalog → Dialog").
 *
 * Di-remount lewat `key` saat targetnya berganti — tanpa itu, membuka Edit
 * untuk item lain setelah item pertama akan menampilkan isian item sebelumnya,
 * dan owner bisa menimpa harga produk yang salah tanpa sadar.
 */
function DialogItem({
  edit,
  onTutup,
}: {
  edit: ItemKatalog | "baru" | null;
  onTutup: () => void;
}) {
  if (!edit) return <Dialog open={false} onOpenChange={() => {}} />;
  return (
    <IsiDialogItem
      key={edit === "baru" ? "baru" : edit.id}
      awal={edit === "baru" ? null : edit}
      onTutup={onTutup}
    />
  );
}

function IsiDialogItem({
  awal,
  onTutup,
}: {
  awal: ItemKatalog | null;
  onTutup: () => void;
}) {
  const [jenis, setJenis] = useState<"produk" | "jasa">(awal?.jenis ?? "produk");
  const [nama, setNama] = useState(awal?.nama ?? "");
  const [kategori, setKategori] = useState(awal?.kategori ?? "");
  const [harga, setHarga] = useState(awal ? String(awal.harga) : "");
  const [hpp, setHpp] = useState(awal?.hpp != null ? String(awal.hpp) : "");

  const nHarga = Number(harga) || 0;
  const nHpp = Number(hpp) || 0;
  const lengkap = nama.trim() !== "" && nHarga > 0;
  const mengedit = awal !== null;

  const simpan = () => {
    const isi = {
      nama: nama.trim(),
      jenis,
      harga: nHarga,
      hpp: jenis === "produk" ? nHpp : null,
      kategori: kategori.trim() || "Lain-lain",
    };

    if (mengedit) {
      aksi.ubahKatalog(awal.id, isi);
      toast.success("Item diperbarui", {
        description: `${isi.nama}. Harga order lama tidak berubah — OrderItem menyimpan harga saat transaksi.`,
      });
    } else {
      aksi.tambahKatalog({
        ...isi,
        id: idBaru(jenis === "produk" ? "PRD" : "JSA"),
        aktif: true,
      });
      toast.success("Item ditambahkan", { description: isi.nama });
    }
    onTutup();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onTutup()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mengedit ? "Edit Item Katalog" : "Tambah Item Katalog"}
          </DialogTitle>
          <DialogDescription>
            {mengedit
              ? "Perubahan harga hanya berlaku untuk transaksi berikutnya."
              : "Dialog, bukan halaman penuh: formnya pendek dan sering diisi di tengah pekerjaan lain."}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel>Jenis</FieldLabel>
            <ToggleGroup
              value={[jenis]}
              onValueChange={(v) => {
                if (!v[0]) return;
                setJenis(v[0] as "produk" | "jasa");
                setHpp("");
              }}
            >
              <ToggleGroupItem value="produk">Produk fisik</ToggleGroupItem>
              <ToggleGroupItem value="jasa">Jasa</ToggleGroupItem>
            </ToggleGroup>
          </Field>

          <Field>
            <FieldLabel htmlFor="nama">Nama</FieldLabel>
            <Input
              id="nama"
              placeholder={
                jenis === "produk" ? "Keychain Foto Akrilik" : "Paket Studio 1 Jam"
              }
              value={nama}
              onChange={(e) => setNama(e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="kategori">
              Kategori <span className="text-muted-foreground">— opsional</span>
            </FieldLabel>
            <Input
              id="kategori"
              placeholder={jenis === "produk" ? "Cetak" : "Studio"}
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="harga">Harga jual</FieldLabel>
              <Input
                id="harga"
                inputMode="numeric"
                className="font-mono"
                placeholder="0"
                value={harga}
                onChange={(e) => setHarga(e.target.value.replace(/\D/g, ""))}
              />
            </Field>

            {/*
              Field HPP hanya muncul untuk produk. Untuk jasa dia tidak
              di-disable tapi DIHILANGKAN, dengan penjelasan penggantinya —
              field disabled mengundang pertanyaan "kenapa saya tidak boleh isi
              ini", sedangkan kalimatnya menjawab sebelum ditanya.
            */}
            {jenis === "produk" ? (
              <Field>
                <FieldLabel htmlFor="hpp">HPP bahan / unit</FieldLabel>
                <Input
                  id="hpp"
                  inputMode="numeric"
                  className="font-mono"
                  placeholder="0"
                  value={hpp}
                  onChange={(e) => setHpp(e.target.value.replace(/\D/g, ""))}
                />
              </Field>
            ) : (
              <div className="flex flex-col justify-center">
                <p className="text-xs text-muted-foreground">
                  Jasa tidak punya HPP tetap. Biaya crew, transport, dan sewa
                  dicatat per order lewat menu Biaya.
                </p>
              </div>
            )}
          </div>

          {jenis === "produk" && nHarga > 0 && (
            <p className="text-xs text-muted-foreground">
              Margin{" "}
              <span className="font-mono text-foreground">
                {formatRp(nHarga - nHpp)}
              </span>{" "}
              ({formatPersen((nHarga - nHpp) / nHarga)})
              {nHpp === 0 &&
                " — HPP belum diisi, margin ini belum mencerminkan biaya bahan."}
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
