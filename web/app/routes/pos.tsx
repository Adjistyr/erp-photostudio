/**
 * POS — transaksi walk-in retail (prompt 4.12).
 *
 * Target desainnya satu angka: **satu transaksi selesai diinput dalam < 30
 * detik** (business-flow bagian 1). Risiko terbesar proyek ini bukan teknis
 * tapi disiplin input — kalau owner malas mencatat, app sebagus apa pun jadi
 * sampah dalam 2 minggu.
 *
 * Konsekuensinya di layar ini: customer bersifat OPSIONAL dan ditampilkan
 * sebagai teks pasif, bukan field wajib. Mewajibkannya adalah cara tercepat
 * membuat owner malas memakai app, dan begitu satu transaksi dilewat data
 * laporan sudah tidak bisa dipercaya. CRM lebih baik terisi 60% daripada
 * app-nya ditinggal sama sekali (business-flow 5.1).
 */

import { useState } from "react";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { HeaderHalaman } from "~/components/app-shell";
import { KosongTabel } from "~/components/data-table";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  HARI_INI,
  customers,
  katalog,
  type ItemKatalog,
  type MetodeBayar,
} from "~/lib/dummy";
import { aksi, idBaru, useDataDemo } from "~/lib/store";
import { formatRp } from "~/lib/format";

const METODE: MetodeBayar[] = ["Tunai", "Transfer", "QRIS"];

interface BarisKeranjang {
  item: ItemKatalog;
  qty: number;
}

export default function Pos() {
  // Daftar ke store demo supaya perubahan dari layar lain (pembayaran,
  // biaya, status order, katalog) langsung terlihat di sini.
  useDataDemo();
  const [cari, setCari] = useState("");
  const [keranjang, setKeranjang] = useState<BarisKeranjang[]>([]);
  const [diskon, setDiskon] = useState("");
  const [metode, setMetode] = useState<MetodeBayar>("Tunai");
  const [namaCustomer, setNamaCustomer] = useState("");

  /**
   * POS hanya menjual produk fisik. Jasa punya jadwal dan biaya per job, jadi
   * masuk lewat Form Order — memasukkannya ke POS berarti owner bisa menjual
   * paket wedding tanpa mencatat tanggal acaranya.
   */
  const tersedia = katalog.filter(
    (k) =>
      k.jenis === "produk" &&
      k.aktif &&
      k.nama.toLowerCase().includes(cari.toLowerCase()),
  );

  const subtotal = keranjang.reduce((s, b) => s + b.qty * b.item.harga, 0);
  const potongan = Math.min(Number(diskon) || 0, subtotal);
  const total = subtotal - potongan;
  const hpp = keranjang.reduce((s, b) => s + b.qty * (b.item.hpp ?? 0), 0);

  const tambah = (item: ItemKatalog) =>
    setKeranjang((k) => {
      const ada = k.find((b) => b.item.id === item.id);
      return ada
        ? k.map((b) => (b.item.id === item.id ? { ...b, qty: b.qty + 1 } : b))
        : [...k, { item, qty: 1 }];
    });

  const ubahQty = (id: string, delta: number) =>
    setKeranjang((k) =>
      k
        .map((b) => (b.item.id === id ? { ...b, qty: b.qty + delta } : b))
        .filter((b) => b.qty > 0),
    );

  const reset = () => {
    setKeranjang([]);
    setDiskon("");
    setNamaCustomer("");
    setMetode("Tunai");
    setCari("");
  };

  const simpan = () => {
    /**
     * Customer baru dibuat HANYA kalau namanya diisi; kalau tidak, transaksi
     * ditempelkan ke customer "Umum". Ini yang membuat pencatatan nama tetap
     * opsional tanpa meninggalkan order tanpa pemilik (business-flow 5.1).
     */
    let customerId = "CUS-00";
    const nama = namaCustomer.trim();
    if (nama) {
      const ada = customers.find(
        (c) => c.nama.toLowerCase() === nama.toLowerCase(),
      );
      if (ada) {
        customerId = ada.id;
      } else {
        customerId = idBaru("CUS");
        aksi.tambahCustomer({
          id: customerId,
          nama,
          hp: null,
          email: null,
          sumber: "Walk-in",
        });
      }
    }

    const no = aksi.tambahOrder({
      customerId,
      tipe: "retail",
      tanggal: HARI_INI,
      // Retail lahir langsung berstatus Diserahkan: barangnya dibawa pulang
      // saat itu juga (business-flow 5.1).
      statusKerja: "Diserahkan",
      items: keranjang.map((b) => ({
        katalogId: b.item.id,
        nama: b.item.nama,
        qty: b.qty,
        harga: b.item.harga,
        hpp: b.item.hpp,
      })),
      diskon: potongan,
      payments: [
        {
          tanggal: HARI_INI,
          nominal: total,
          metode,
          keterangan: "Pelunasan",
        },
      ],
      biayaJob: [],
    });

    toast.success(`${no} tersimpan`, {
      description: `${formatRp(total)} · ${metode} · ${nama || "Umum"} — masuk omzet hari ini.`,
    });
    reset();
  };

  /* POS bergantung pada Katalog — arahkan ke sana, bukan tawarkan aksi yang
     belum bisa dijalankan (R7). */
  if (katalog.filter((k) => k.jenis === "produk").length === 0) {
    return (
      <>
        <HeaderHalaman judul="POS" />
        <div className="p-6">
          <KosongTabel
            kalimat="Katalog masih kosong. Isi dulu supaya bisa jualan."
            aksi={{ label: "Isi Katalog", ke: "/katalog" }}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <HeaderHalaman judul="POS" />
      {/*
        Dua kolom sejajar, bukan wizard bertahap: 30 detik tidak cukup untuk
        berpindah langkah. Item, keranjang, dan tombol bayar harus terlihat
        serentak.
      */}
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_22rem]">
        <section className="flex min-w-0 flex-col gap-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Cari item — ketik nama produk"
              className="pl-9"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tersedia.map((k) => (
              <button
                key={k.id}
                onClick={() => tambah(k)}
                className="flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <span className="text-sm font-medium">{k.nama}</span>
                <span className="font-mono text-sm text-muted-foreground">
                  {formatRp(k.harga)}
                </span>
              </button>
            ))}
          </div>

          {tersedia.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Tidak ada item cocok dengan "{cari}".
            </p>
          )}
        </section>

        <aside className="flex min-w-0 flex-col gap-4 rounded-lg border p-5">
          <h2 className="font-heading text-base font-semibold">Keranjang</h2>

          {keranjang.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Klik item di kiri untuk menambahkan.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {keranjang.map((b) => (
                <div key={b.item.id} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.item.nama}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {formatRp(b.item.harga)} × {b.qty}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Kurangi ${b.item.nama}`}
                      onClick={() => ubahQty(b.item.id, -1)}
                    >
                      {b.qty === 1 ? <Trash2 /> : <Minus />}
                    </Button>
                    <span className="w-6 text-center font-mono text-sm">
                      {b.qty}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Tambah ${b.item.nama}`}
                      onClick={() => ubahQty(b.item.id, 1)}
                    >
                      <Plus />
                    </Button>
                  </div>
                  <span className="w-24 shrink-0 text-right font-mono text-sm">
                    {formatRp(b.qty * b.item.harga)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <div className="flex flex-col gap-2 text-sm">
            <Baris label="Subtotal" nilai={formatRp(subtotal)} />
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="diskon" className="text-muted-foreground">
                Diskon
              </label>
              <Input
                id="diskon"
                inputMode="numeric"
                placeholder="0"
                className="h-8 w-28 text-right font-mono"
                value={diskon}
                // Non-digit dibuang — sama seperti input nominal di layar
                // Pembayaran. Rupiah di app ini selalu integer (R5).
                onChange={(e) => setDiskon(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <Separator />
            <div className="flex items-baseline justify-between">
              <span className="font-medium">Total</span>
              <span className="font-mono text-2xl font-semibold">
                {formatRp(total)}
              </span>
            </div>
            {/*
              HPP tercatat otomatis dari data HPP bahan di katalog (5.1). Ini
              yang paling sering bocor: produk terlihat untung karena harga
              bahannya tidak pernah dihitung. Ditampilkan sebagai metadata,
              bukan angka yang harus diisi owner.
            */}
            {keranjang.length > 0 && (
              <p className="text-xs text-muted-foreground">
                HPP bahan {formatRp(hpp)} · margin {formatRp(total - hpp)}
              </p>
            )}
          </div>

          <Separator />

          {/*
            Customer sebagai field OPSIONAL tanpa tanda wajib, dengan hint yang
            menyatakan konsekuensi kalau dikosongkan. Bukan Select yang harus
            dipilih, bukan dialog yang harus ditutup.
          */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="customer" className="text-sm">
              Customer{" "}
              <span className="text-muted-foreground">— opsional</span>
            </label>
            <Input
              id="customer"
              placeholder="Kosongkan kalau tidak perlu dicatat"
              value={namaCustomer}
              onChange={(e) => setNamaCustomer(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Tanpa nama, transaksi disimpan atas nama "Umum".
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm">Metode bayar</span>
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
          </div>

          <Button
            size="lg"
            disabled={keranjang.length === 0}
            onClick={simpan}
          >
            Simpan & Bayar {total > 0 ? formatRp(total) : ""}
          </Button>
        </aside>
      </div>
    </>
  );
}

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{nilai}</span>
    </div>
  );
}
