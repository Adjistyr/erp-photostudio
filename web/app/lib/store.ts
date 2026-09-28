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
  biayaOperasional,
  customers,
  katalog,
  orders,
  type BiayaJob,
  type BiayaOperasional,
  type Customer,
  type ItemKatalog,
  type Order,
  type Payment,
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
};

/** ID berurutan untuk entitas baru selama demo. */
export function idBaru(prefiks: string): string {
  return `${prefiks}-${String(Date.now()).slice(-5)}`;
}
