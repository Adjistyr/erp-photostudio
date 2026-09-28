/**
 * Order — Form Buat Order (prompt 4.6).
 *
 * Halaman penuh, BUKAN modal (R9). Formnya punya banyak bagian (customer, item,
 * jadwal, biaya) dan sering diisi bertahap — modal memaksa selesai sekali
 * duduk dan gampang tertutup tidak sengaja, dan kehilangan isian order wedding
 * setengah jalan adalah cara cepat membuat owner berhenti memakai app.
 *
 * Hanya studio & event yang lewat sini. Retail masuk lewat POS: walk-in tidak
 * punya jadwal dan tidak butuh form sepanjang ini.
 */

import { useState } from "react";
import { useNavigate } from "react-router";
import { Info, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { HeaderHalaman, KontenHalaman } from "~/components/app-shell";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
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
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { HARI_INI, customers, katalog, type ItemKatalog } from "~/lib/dummy";
import { aksi, useDataDemo } from "~/lib/store";
import { formatPersen, formatRp } from "~/lib/format";

type TipeOrder = "studio" | "event";

interface BarisItem {
  key: number;
  katalogId: string;
  qty: number;
}

export default function OrderBaru() {
  // Daftar ke store demo supaya perubahan dari layar lain (pembayaran,
  // biaya, status order, katalog) langsung terlihat di sini.
  useDataDemo();
  const navigate = useNavigate();

  const [tipe, setTipe] = useState<TipeOrder>("studio");
  const [customerId, setCustomerId] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [jam, setJam] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [catatan, setCatatan] = useState("");
  const [dp, setDp] = useState("");
  const [baris, setBaris] = useState<BarisItem[]>([
    { key: 1, katalogId: "", qty: 1 },
  ]);

  const jasa = katalog.filter(
    (k) => k.jenis === "jasa" && k.aktif && kategoriCocok(k, tipe),
  );

  const itemDari = (id: string) => katalog.find((k) => k.id === id);

  const total = baris.reduce((s, b) => {
    const k = itemDari(b.katalogId);
    return s + (k ? k.harga * b.qty : 0);
  }, 0);

  const nominalDp = Math.min(Number(dp) || 0, total);
  const lengkap = customerId !== "" && tanggal !== "" && total > 0;

  const simpan = () => {
    const no = aksi.tambahOrder({
      customerId,
      tipe,
      // Jam digabung ke tanggal hanya kalau diisi — formatJadwal membedakan
      // keduanya, dan "00:00" palsu di kolom jadwal menyesatkan.
      tanggal: jam ? `${tanggal}T${jam}` : tanggal,
      // DP masuk = tanggalnya sudah fix = Dijadwalkan. Tanpa DP masih Booking
      // (business-flow 5.2 langkah 5).
      statusKerja: nominalDp > 0 ? "Dijadwalkan" : "Booking",
      lokasi: lokasi.trim() || (tipe === "studio" ? "Studio" : undefined),
      catatan: catatan.trim() || undefined,
      items: baris
        .filter((b) => b.katalogId)
        .map((b) => {
          const k = itemDari(b.katalogId)!;
          return {
            katalogId: k.id,
            nama: k.nama,
            qty: b.qty,
            harga: k.harga,
            hpp: k.hpp,
          };
        }),
      diskon: 0,
      payments:
        nominalDp > 0
          ? [
              {
                tanggal: HARI_INI,
                nominal: nominalDp,
                metode: "Transfer" as const,
                keterangan: "DP",
              },
            ]
          : [],
      biayaJob: [],
    });

    toast.success(`${no} tersimpan`, {
      description: `${formatRp(total)}${
        nominalDp > 0
          ? ` · DP ${formatPersen(nominalDp / total)}`
          : " · Belum Bayar"
      }`,
    });
    navigate("/order");
  };

  return (
    <>
      <HeaderHalaman judul="Buat Order" induk="Order & Booking" />
      <KontenHalaman>
        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[1fr_20rem]">
          <div className="flex min-w-0 flex-col gap-6">
            <Bagian judul="Jenis & customer">
              <FieldGroup>
                <Field>
                  <FieldLabel>Jenis order</FieldLabel>
                  {/*
                    Hanya studio & event. Retail tidak ada di sini — kalau
                    dimasukkan, owner bisa membuat order retail berjadwal, dan
                    itu bertabrakan dengan alur POS yang justru dirancang untuk
                    selesai dalam 30 detik.
                  */}
                  <ToggleGroup
                    value={[tipe]}
                    onValueChange={(v) => {
                      if (!v[0]) return;
                      setTipe(v[0] as TipeOrder);
                      // Item direset: paket studio dan paket event tidak saling
                      // berlaku, dan membiarkan pilihan lama membuat order event
                      // berisi paket studio tanpa ada yang sadar.
                      setBaris([{ key: Date.now(), katalogId: "", qty: 1 }]);
                      setLokasi("");
                    }}
                  >
                    <ToggleGroupItem value="studio">Sesi Studio</ToggleGroupItem>
                    <ToggleGroupItem value="event">
                      Event (wedding, prewed)
                    </ToggleGroupItem>
                  </ToggleGroup>
                </Field>

                <Field>
                  <FieldLabel htmlFor="customer">Customer</FieldLabel>
                  {/*
                    `?? ""` bukan cast: Base UI mengirim null saat pilihan
                    dikosongkan, dan state di sini memakai string kosong sebagai
                    "belum dipilih" supaya `lengkap` cukup membandingkan dengan
                    "" tanpa harus menangani dua bentuk kosong.
                  */}
                  <Select
                    value={customerId}
                    onValueChange={(v) => setCustomerId(v ?? "")}
                  >
                    <SelectTrigger id="customer">
                      <SelectValue placeholder="Pilih customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {customers
                          .filter((c) => c.id !== "CUS-00")
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nama}
                              {c.hp ? ` · ${c.hp}` : ""}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </Bagian>

            <Bagian judul="Item">
              <div className="flex flex-col gap-3">
                {baris.map((b) => {
                  const k = itemDari(b.katalogId);
                  return (
                    <div key={b.key} className="flex items-end gap-2">
                      <div className="min-w-0 flex-1">
                        <Select
                          value={b.katalogId}
                          onValueChange={(v) =>
                            setBaris((r) =>
                              r.map((x) =>
                                x.key === b.key
                                  ? { ...x, katalogId: v ?? "" }
                                  : x,
                              ),
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih paket dari katalog" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {jasa.map((j) => (
                                <SelectItem key={j.id} value={j.id}>
                                  {j.nama} · {formatRp(j.harga)}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      <Input
                        inputMode="numeric"
                        aria-label="Qty"
                        className="w-16 text-center font-mono"
                        value={String(b.qty)}
                        onChange={(e) =>
                          setBaris((r) =>
                            r.map((x) =>
                              x.key === b.key
                                ? { ...x, qty: Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1) }
                                : x,
                            ),
                          )
                        }
                      />
                      <span className="w-32 shrink-0 text-right font-mono text-sm">
                        {k ? formatRp(k.harga * b.qty) : "—"}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Hapus baris item"
                        disabled={baris.length === 1}
                        onClick={() =>
                          setBaris((r) => r.filter((x) => x.key !== b.key))
                        }
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  );
                })}

                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() =>
                    setBaris((r) => [
                      ...r,
                      { key: Date.now(), katalogId: "", qty: 1 },
                    ])
                  }
                >
                  <Plus data-icon="inline-start" />
                  Tambah item
                </Button>

                {tipe === "event" && (
                  <p className="text-xs text-muted-foreground">
                    Paket event sering dinegosiasi per deal. Harga custom di luar
                    katalog belum bisa diisi di mockup ini — ini salah satu
                    pertanyaan terbuka yang perlu dikonfirmasi ke client.
                  </p>
                )}
              </div>
            </Bagian>

            <Bagian judul="Jadwal & lokasi">
              <FieldGroup>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="tanggal">
                      Tanggal {tipe === "event" ? "acara" : "sesi"}
                    </FieldLabel>
                    {/*
                      <input type="date"> bawaan browser, bukan date picker
                      library: localenya ikut sistem, keyboard entry jalan, dan
                      nol dependency. Untuk satu field tanggal di mockup, picker
                      custom murni biaya tanpa manfaat.
                    */}
                    <Input
                      id="tanggal"
                      type="date"
                      value={tanggal}
                      onChange={(e) => setTanggal(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="jam">
                      Jam <span className="text-muted-foreground">— opsional</span>
                    </FieldLabel>
                    <Input
                      id="jam"
                      type="time"
                      value={jam}
                      onChange={(e) => setJam(e.target.value)}
                    />
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="lokasi">
                    Lokasi{" "}
                    {tipe === "studio" && (
                      <span className="text-muted-foreground">
                        — kosongkan kalau di studio
                      </span>
                    )}
                  </FieldLabel>
                  <Input
                    id="lokasi"
                    placeholder={tipe === "studio" ? "Studio" : "Nama venue"}
                    value={lokasi}
                    onChange={(e) => setLokasi(e.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="catatan">
                    Catatan <span className="text-muted-foreground">— opsional</span>
                  </FieldLabel>
                  <Textarea
                    id="catatan"
                    rows={3}
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                  />
                </Field>
              </FieldGroup>
            </Bagian>
          </div>

          <aside className="flex min-w-0 flex-col gap-4 self-start rounded-lg border p-5">
            <h2 className="font-heading text-base font-semibold">Ringkasan</h2>

            <div className="flex flex-col gap-2 text-sm">
              {baris
                .filter((b) => b.katalogId)
                .map((b) => {
                  const k = itemDari(b.katalogId)!;
                  return (
                    <div key={b.key} className="flex justify-between gap-2">
                      <span className="min-w-0 truncate text-muted-foreground">
                        {k.nama} × {b.qty}
                      </span>
                      <span className="shrink-0 font-mono">
                        {formatRp(k.harga * b.qty)}
                      </span>
                    </div>
                  );
                })}
              {total === 0 && (
                <p className="text-muted-foreground">Belum ada item dipilih.</p>
              )}
            </div>

            <Separator />

            <div className="flex items-baseline justify-between">
              <span className="font-medium">Total</span>
              <span className="font-mono text-2xl font-semibold">
                {formatRp(total)}
              </span>
            </div>

            <Field>
              <FieldLabel htmlFor="dp">
                DP diterima <span className="text-muted-foreground">— opsional</span>
              </FieldLabel>
              {/*
                DP nominal bebas, bukan persentase tetap. Asumsi sementara di
                business-flow bagian 2 pertanyaan 3: nego per deal. Kalau client
                ternyata memakai persentase tetap, field ini yang berubah.
              */}
              <Input
                id="dp"
                inputMode="numeric"
                placeholder="0"
                className="font-mono"
                value={dp}
                onChange={(e) => setDp(e.target.value.replace(/\D/g, ""))}
              />
            </Field>

            {total > 0 && (
              <p className="text-xs text-muted-foreground">
                Status bayar akan jadi{" "}
                <span className="font-medium text-foreground">
                  {nominalDp <= 0
                    ? "Belum Bayar"
                    : nominalDp >= total
                      ? "Lunas"
                      : `DP ${formatPersen(nominalDp / total)}`}
                </span>
                , dan status kerja{" "}
                <span className="font-medium text-foreground">
                  {nominalDp > 0 ? "Dijadwalkan" : "Booking"}
                </span>
                .
              </p>
            )}

            <Alert>
              <Info />
              <AlertTitle>Biaya job dicatat nanti</AlertTitle>
              <AlertDescription>
                Fee crew, transport, dan sewa dicatat setelah acara lewat menu
                Biaya — nilainya baru pasti setelah dikerjakan, dan itu yang
                menentukan job ini benar-benar untung atau tidak.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate("/order")}
              >
                Batal
              </Button>
              <Button className="flex-1" disabled={!lengkap} onClick={simpan}>
                Simpan
              </Button>
            </div>
            {!lengkap && (
              <p className="text-xs text-muted-foreground">
                Customer, tanggal, dan minimal satu item harus diisi.
              </p>
            )}
          </aside>
        </div>
      </KontenHalaman>
    </>
  );
}

/**
 * Paket studio dan paket event dipisah berdasarkan kategori katalog, bukan
 * dengan daftar ID keras: kalau owner menambah paket baru di Katalog, dia ikut
 * muncul di sini tanpa perlu mengubah kode. Add-on tersedia di keduanya.
 */
function kategoriCocok(k: ItemKatalog, tipe: TipeOrder): boolean {
  if (k.kategori === "Add-on") return true;
  return tipe === "studio" ? k.kategori === "Studio" : k.kategori === "Event";
}

function Bagian({
  judul,
  children,
}: {
  judul: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-lg border p-5">
      <h2 className="font-heading text-base font-semibold">{judul}</h2>
      {children}
    </section>
  );
}
