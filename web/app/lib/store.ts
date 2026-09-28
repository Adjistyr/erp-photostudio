/**
 * Store demo — satu tempat untuk semua perubahan data selama sesi presentasi.
 *
 * Kenapa ada: sebelumnya tiap layar menyimpan perubahannya di `useState`
 * sendiri, jadi mencatat pembayaran di layar Piutang tidak terlihat di
 * Dashboard, dan Order Detail sama sekali tidak bisa menulis. Akibatnya demo
 * terasa seperti kumpulan layar mati, bukan satu aplikasi — padahal yang mau
 * ditunjukkan ke client justru bahwa angka saling terhubung.
 *
 * **Cara kerjanya: array di `dummy.ts` dimutasi DI TEMPAT, bukan disalin.**
 * Seluruh fungsi turunan di sana (`omzetPeriode`, `labaRugi`, `marginPerLini`,
 * `daftarPiutang`, …) membaca array modul itu langsung. Kalau store menyimpan
 * salinan terpisah, fungsi-fungsi itu tidak akan pernah melihat perubahan dan
 * setiap layar harus dialiri data lewat props — refactor besar yang tidak
 * dibutuhkan mockup. Dengan mutasi di tempat, satu `emit()` cukup untuk membuat
 * seluruh app menghitung ulang.
 *
 * Snapshot-nya angka versi, bukan objek: `useSyncExternalStore` membandingkan
 * snapshot dengan `Object.is`, jadi mengembalikan objek baru tiap panggilan
 * akan memicu render tak berujung.
 */

import { useSyncExternalStore } from "react";

import {
  aset,
  biayaOperasional,
  customers,
  investasi,
  servisAset,
  validasiAset,
  validasiServis,
  type Aset,
  type ServisAset,
  katalog,
  orders,
  pemakaianDana,
  pengaturanBagiHasil,
  setoranOwner,
  validasiPemakaian,
  validasiPengaturan,
  type BiayaJob,
  type BiayaOperasional,
  type Customer,
  type Investasi,
  type ItemKatalog,
  type Order,
  type Payment,
  type PemakaianDana,
  type PengaturanBagiHasil,
  type SetoranOwner,
  type StatusKerja,
} from "./dummy";

let versi = 0;
const pendengar = new Set<() => void>();

function emit() {
  versi += 1;
  for (const l of pendengar) l();
}

function subscribe(l: () => void) {
  pendengar.add(l);
  return () => pendengar.delete(l);
}

/**
 * Panggil di komponen yang menampilkan data yang bisa berubah. Nilainya tidak
 * dipakai — fungsinya hanya mendaftarkan komponen supaya ikut render ulang
 * setiap kali ada aksi.
 */
export function useDataDemo(): number {
  return useSyncExternalStore(
    subscribe,
    () => versi,
    () => versi, // getServerSnapshot — build SPA tetap melewati render awal
  );
}

function cariOrder(no: string): Order {
  const o = orders.find((x) => x.no === no);
  if (!o) throw new Error(`Order tidak ada: ${no}`);
  return o;
}

/**
 * Nomor order berikutnya, melanjutkan deret yang ada (ORD-0012 → ORD-0013).
 *
 * Sengaja tidak memakai timestamp seperti entitas lain: nomor order dibacakan
 * ke customer dan muncul di invoice, jadi harus pendek dan berurutan. Diambil
 * dari nomor tertinggi yang ADA, bukan dari panjang array — kalau nanti ada
 * order yang dihapus, panjang array akan menghasilkan nomor yang sudah dipakai.
 */
function noOrderBerikutnya(): string {
  const tertinggi = orders.reduce((maks, o) => {
    const n = Number(o.no.replace("ORD-", ""));
    return Number.isFinite(n) && n > maks ? n : maks;
  }, 0);
  return `ORD-${String(tertinggi + 1).padStart(4, "0")}`;
}

export const aksi = {
  /** Order baru dari POS (retail) maupun Form Order (studio/event). */
  tambahOrder(o: Omit<Order, "no">): string {
    const no = noOrderBerikutnya();
    orders.unshift({ ...o, no });
    emit();
    return no;
  },

  catatPembayaran(no: string, p: Payment) {
    cariOrder(no).payments.push(p);
    emit();
  },

  /**
   * Status kerja diinput manual — satu-satunya dari dua status yang memang
   * diisi owner. Status bayar tidak punya setter di sini karena dia turunan
   * dari catatan Payment (business-flow bagian 4), dan menyediakan setternya
   * akan membuka kemungkinan "Lunas" padahal pembayarannya kurang.
   */
  ubahStatusKerja(no: string, status: StatusKerja) {
    cariOrder(no).statusKerja = status;
    emit();
  },

  batalkanOrder(no: string, alasan: string) {
    const o = cariOrder(no);
    o.statusKerja = "Batal";
    o.catatan = alasan || o.catatan;
    emit();
  },

  isiLinkHasil(no: string, link: string) {
    cariOrder(no).linkHasil = link;
    emit();
  },

  catatBiayaJob(no: string, b: BiayaJob) {
    cariOrder(no).biayaJob.push(b);
    emit();
  },

  catatBiayaOperasional(b: BiayaOperasional) {
    biayaOperasional.push(b);
    emit();
  },

  tambahKatalog(item: ItemKatalog) {
    katalog.unshift(item);
    emit();
  },

  ubahKatalog(id: string, patch: Partial<ItemKatalog>) {
    const i = katalog.findIndex((k) => k.id === id);
    if (i === -1) return;
    katalog[i] = { ...katalog[i], ...patch };
    emit();
  },

  tambahCustomer(c: Customer) {
    customers.unshift(c);
    emit();
  },

  catatSetoran(s: SetoranOwner) {
    setoranOwner.push(s);
    emit();
  },

  /**
   * Validasi diulang di sini walaupun dialog sudah mengeceknya: saldo bisa
   * berubah di antara dialog dibuka dan Simpan ditekan, dan saldo minus adalah
   * satu-satunya keadaan pos dana yang dilarang (business-flow 8.2).
   */
  catatPemakaianDana(p: PemakaianDana) {
    const salah = validasiPemakaian(p.pos, p.nominal);
    if (salah) throw new Error(salah);
    pemakaianDana.push(p);
    emit();
  },

  /**
   * Investasi yang dibayar owner langsung menghasilkan DUA catatan: setoran
   * modal dan investasinya. Satu aksi, bukan dua form — owner yang membayar
   * renovasi tidak berpikir "saya setor modal lalu usaha membelanjakannya",
   * dan kalau dipisah, setoran modalnya yang paling sering terlupa. Tanpa
   * setoran itu, progres balik modal owner tersebut salah.
   */
  catatInvestasi(
    inv: Omit<Investasi, "setoranId">,
    dibayarOwnerId: string | null,
  ) {
    simpanInvestasi(inv, dibayarOwnerId);
    emit();
  },

  /**
   * Aset baru SELALU lewat investasi (dan setoran modal kalau dibayar owner).
   * Satu aksi: owner yang membeli lighting tidak berpikir "saya catat
   * investasi, lalu aset, lalu setoran" — dan kalau salah satu terlewat,
   * progres balik modal atau alokasi maintenance jadi salah tanpa terlihat.
   */
  tambahAset(a: Omit<Aset, "id" | "investasiId">, dibayarOwnerId: string | null) {
    const investasiId = idBaru("INV");
    const baru: Aset = { ...a, id: idBaru("AST"), investasiId };
    const salah = validasiAset(baru);
    if (salah) throw new Error(salah);
    simpanInvestasi(
      {
        id: investasiId,
        tanggal: a.tanggalBeli,
        keterangan: a.unit > 1 ? `${a.nama} × ${a.unit}` : a.nama,
        nominal: a.hargaSatuan * a.unit,
      },
      dibayarOwnerId,
    );
    aset.push(baru);
    emit();
  },

  /** Biaya servis keluar dari dana maintenance — validasi saldo diulang di sini. */
  catatServis(s: ServisAset) {
    const salah = validasiServis(s.nominal);
    if (salah) throw new Error(salah);
    servisAset.push(s);
    emit();
  },

  ubahStatusAset(id: string, status: "aktif" | "rusak") {
    const a = aset.find((x) => x.id === id);
    if (!a || a.lepas) return;
    a.status = status;
    emit();
  },

  /**
   * Aset dilepas (dijual, rusak total, hilang) — tidak dihapus. Menghapus
   * akan mengubah alokasi maintenance bulan-bulan saat aset itu masih
   * dimiliki, dan riwayat servisnya ikut hilang.
   */
  lepasAset(id: string, lepas: NonNullable<Aset["lepas"]>) {
    const a = aset.find((x) => x.id === id);
    if (!a) return;
    if (lepas.tanggal < a.tanggalBeli) {
      throw new Error("Tanggal lepas tidak boleh sebelum tanggal beli.");
    }
    if (lepas.hargaJual < 0) throw new Error("Harga jual tidak boleh negatif.");
    a.status = "dilepas";
    a.lepas = lepas;
    emit();
  },

  tambahPengaturan(p: PengaturanBagiHasil) {
    const salah = validasiPengaturan(p);
    if (salah) throw new Error(salah);
    pengaturanBagiHasil.push(p);
    emit();
  },
};

/**
 * Investasi + setoran modal (kalau dibayar owner), tanpa emit — dipakai
 * `catatInvestasi` dan `tambahAset` supaya keduanya mencatat dengan cara yang
 * persis sama.
 */
function simpanInvestasi(
  inv: Omit<Investasi, "setoranId">,
  dibayarOwnerId: string | null,
) {
  let setoranId: string | null = null;
  if (dibayarOwnerId) {
    setoranId = idBaru("STR");
    setoranOwner.push({
      id: setoranId,
      tanggal: inv.tanggal,
      ownerId: dibayarOwnerId,
      nominal: inv.nominal,
      jenis: "modal",
      tujuan: "investasi",
      keterangan: inv.keterangan,
    });
  }
  investasi.push({ ...inv, setoranId });
}

/** ID berurutan untuk entitas baru selama demo. */
export function idBaru(prefiks: string): string {
  return `${prefiks}-${String(Date.now()).slice(-5)}`;
}
