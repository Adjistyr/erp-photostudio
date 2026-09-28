/**
 * Laporan — Penjualan (prompt 4.21).
 *
 * Tiga tabel yang menjawab tiga pertanyaan berbeda dan sengaja tidak digabung:
 * produk mana yang laku (dan marginnya), paket jasa mana yang laku, dan
 * customer mana yang paling bernilai.
 *
 * Produk dan Jasa dipisah karena basis angkanya berbeda dan menggabungkannya
 * akan menghasilkan tabel yang menyesatkan: produk dihitung dari uang yang
 * DITERIMA (basis kas, punya HPP per unit), jasa dari NILAI ORDER yang
 * disepakati (HPP-nya per job, tidak ada di katalog). Satu tabel gabungan akan
 * menjumlahkan dua hal yang bukan sejenis.
 */

import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

import { HeaderHalaman, KontenHalaman } from "~/components/app-shell";
import { KepalaUang, KosongTabel, TabelData } from "~/components/data-table";
import { TandaLini } from "~/components/status-order";
import { Button } from "~/components/ui/button";
import {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  HARI_INI,
  jasaTerlaris,
  produkTerlaris,
  ringkasanCustomer,
} from "~/lib/dummy";
import { useDataDemo } from "~/lib/store";
import { formatPersen, formatRp, formatTanggal, kelasRp } from "~/lib/format";

const BULAN = HARI_INI.slice(0, 7);

export default function LaporanPenjualan() {
  // Daftar ke store demo supaya perubahan dari layar lain (pembayaran,
  // biaya, status order, katalog) langsung terlihat di sini.
  useDataDemo();
  const produk = produkTerlaris(BULAN);
  const jasa = jasaTerlaris();
  /**
   * "Umum" dikeluarkan dari ranking ini, meski tetap ada di layar Customer.
   *
   * Tabel ini ada untuk menentukan siapa yang layak di-follow up, dan "Umum"
   * bukan customer — dia penanda transaksi yang customernya tidak dicatat.
   * Merangkingnya di antara customer sungguhan membuat baris teratas jadi
   * sesuatu yang tidak bisa dihubungi siapa pun. Omzetnya tetap terhitung di
   * Laba Rugi dan Produk Terlaris.
   */
  const customer = ringkasanCustomer().filter(
    (c) => c.jumlahOrder > 0 && c.customer.id !== "CUS-00",
  );

  const omzetUmum = ringkasanCustomer().find((c) => c.customer.id === "CUS-00");

  const totProdukQty = produk.reduce((s, p) => s + p.qty, 0);
  const totProdukOmzet = produk.reduce((s, p) => s + p.omzet, 0);
  const totProdukHpp = produk.reduce((s, p) => s + p.hpp, 0);
  const totProdukMargin = totProdukOmzet - totProdukHpp;

  const takLaku = produk.filter((p) => p.qty === 0);

  return (
    <>
      <HeaderHalaman
        judul="Penjualan"
        induk="Laporan"
        aksi={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/laporan" />}
          >
            Laba Rugi
            <ArrowRight data-icon="inline-end" />
          </Button>
        }
      />
      <KontenHalaman>
        <Seksi
          judul="Produk terlaris"
          catatan="dihitung dari uang yang diterima bulan ini (basis kas)"
        >
          {produk.length === 0 ? (
            <KosongTabel kalimat="Belum ada produk terjual bulan ini." />
          ) : (
            <TabelData>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <KepalaUang>Omzet</KepalaUang>
                  <KepalaUang>HPP</KepalaUang>
                  <KepalaUang>Margin</KepalaUang>
                  <KepalaUang>Margin %</KepalaUang>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produk.map((p) => (
                  <TableRow
                    key={p.item.id}
                    className={p.qty === 0 ? "opacity-60" : ""}
                  >
                    <TableCell className="font-medium">{p.item.nama}</TableCell>
                    <TableCell className="text-right font-mono">
                      {p.qty}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${kelasRp(p.omzet)}`}>
                      {formatRp(p.omzet)}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${kelasRp(p.hpp)}`}>
                      {formatRp(p.hpp)}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${kelasRp(p.margin)}`}>
                      {formatRp(p.margin)}
                    </TableCell>
                    {/*
                      Produk tak laku: "—" bukan "0%". Nol persen berarti
                      "dijual tanpa untung", sedangkan yang benar adalah "belum
                      pernah terjual" — dua kesimpulan yang sangat berbeda.
                    */}
                    <TableCell className="text-right font-mono">
                      {p.qty === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        formatPersen(p.rasioMargin)
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {totProdukQty}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatRp(totProdukOmzet)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatRp(totProdukHpp)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatRp(totProdukMargin)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatPersen(totProdukMargin / totProdukOmzet)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </TabelData>
          )}

          {takLaku.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {takLaku.length === 1 ? "Satu produk" : `${takLaku.length} produk`}{" "}
              belum terjual sama sekali bulan ini:{" "}
              {takLaku.map((p) => p.item.nama).join(", ")}. Modal yang menganggur
              — kandidat pertama untuk dihentikan atau didiskon.
            </p>
          )}
        </Seksi>

        <Seksi
          judul="Jasa terlaris"
          catatan="dihitung dari nilai order yang disepakati, order batal tidak dihitung"
        >
          {jasa.length === 0 ? (
            <KosongTabel kalimat="Belum ada jasa terjual." />
          ) : (
            <TabelData>
              <TableHeader>
                <TableRow>
                  <TableHead>Paket</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Order</TableHead>
                  <KepalaUang>Nilai</KepalaUang>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jasa.map((j) => (
                  <TableRow key={j.item.id}>
                    <TableCell className="font-medium">{j.item.nama}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {j.item.kategori}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {j.order}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatRp(j.nilai)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </TabelData>
          )}
          <p className="text-xs text-muted-foreground">
            Kolom margin sengaja tidak ada di sini: HPP jasa berbeda tiap job dan
            tidak bisa dihitung per paket. Marginnya ada di Margin per Lini.
          </p>
        </Seksi>

        <Seksi
          judul="Customer teratas"
          catatan="nilai order vs uang yang benar-benar sudah disetor · transaksi tanpa nama customer tidak dirangking"
        >
          {customer.length === 0 ? (
            <KosongTabel kalimat="Customer akan terkumpul otomatis dari setiap transaksi." />
          ) : (
            <TabelData>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Pernah beli</TableHead>
                  <TableHead className="text-right">Order</TableHead>
                  <KepalaUang>Nilai order</KepalaUang>
                  <KepalaUang>Sudah dibayar</KepalaUang>
                  <KepalaUang>Terbayar</KepalaUang>
                  <TableHead>Terakhir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.map((c) => (
                  <TableRow key={c.customer.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {c.customer.nama}
                    </TableCell>
                    <TableCell>
                      <span className="flex gap-3">
                        {c.lini.map((l) => (
                          <TandaLini key={l} lini={l} />
                        ))}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {c.jumlahOrder}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatRp(c.nilaiOrder)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatRp(c.sudahDibayar)}
                    </TableCell>
                    {/*
                      Persentase terbayar ditaruh di sebelah dua nominalnya:
                      di basis kas, customer dengan nilai order terbesar belum
                      tentu yang paling banyak menyetor uang.
                    */}
                    <TableCell className="text-right font-mono">
                      {c.nilaiOrder === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        formatPersen(c.sudahDibayar / c.nilaiOrder)
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {c.terakhirTransaksi
                        ? formatTanggal(c.terakhirTransaksi)
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </TabelData>
          )}
          {omzetUmum && omzetUmum.nilaiOrder > 0 && (
            <p className="text-xs text-muted-foreground">
              Di luar tabel ini, {formatRp(omzetUmum.nilaiOrder)} dari{" "}
              {omzetUmum.jumlahOrder} transaksi walk-in tanpa nama customer.
              Mencatat nama di POS bersifat opsional supaya transaksinya tidak
              dilewat — ini harga yang dibayar untuk itu.
            </p>
          )}
        </Seksi>
      </KontenHalaman>
    </>
  );
}

function Seksi({
  judul,
  catatan,
  children,
}: {
  judul: string;
  catatan: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-heading text-base font-semibold">{judul}</h2>
        <p className="text-xs text-muted-foreground">{catatan}</p>
      </div>
      {children}
    </section>
  );
}
