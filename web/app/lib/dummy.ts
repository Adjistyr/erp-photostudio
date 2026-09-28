/**
 * Data contoh — satu dataset untuk SEMUA layar (stitch-prompts.md bagian 3).
 *
 * Aturan yang menentukan bentuk file ini: **hanya Order yang ditulis tangan.**
 * Omzet, piutang, margin per lini, produk terlaris, dan umur piutang semuanya
 * DITURUNKAN dari daftar order di bawah. Di mockup Stitch, tiap layar menyalin
 * angka rekapnya sendiri dari prompt — hasilnya kebetulan konsisten, dan satu
 * pengeditan order akan membuat lima layar saling bertentangan tanpa ada yang
 * tahu. Di sini itu tidak mungkin terjadi.
 *
 * Angkanya sengaja kecil (< 10 transaksi/hari, bisnis baru jalan sebulan).
 * Tabel dengan 50 baris dummy justru menyembunyikan masalah density yang mau
 * diuji (DESIGN.md R4).
 */

// Ekstensi .ts eksplisit: Vite maupun `node --test` dua-duanya resolve bentuk
// ini, sedangkan tanpa ekstensi hanya Vite yang bisa. Satu gaya import, nol
// dependency test tambahan.
import { selisihHari } from "./format.ts";

/** Hari ini di seluruh mockup. Semua angka relatif dihitung dari sini. */
export const HARI_INI = "2026-08-26";

export type Lini = "retail" | "studio" | "event";

export const LABEL_LINI: Record<Lini, string> = {
  retail: "Retail",
  studio: "Studio",
  event: "Event",
};

/**
 * Peran warna chart per lini — TETAP, tidak boleh ditukar antar layar
 * (DESIGN.md R6). Retail selalu biru di setiap chart, di setiap layar. Kalau
 * warnanya berpindah, owner harus baca legenda tiap kali dan chart kehilangan
 * gunanya.
 */
export const WARNA_LINI: Record<Lini, string> = {
  retail: "var(--chart-1)",
  studio: "var(--chart-2)",
  event: "var(--chart-3)",
};

/** Arah uang — hijau masuk/laba, merah keluar/biaya (DESIGN.md R6). */
export const WARNA_LABA = "var(--chart-4)";
export const WARNA_BIAYA = "var(--chart-5)";

/**
 * Status kerja diinput manual, 6 nilai (business-flow bagian 4). Urutan array
 * ini = urutan progres, dipakai untuk menghitung jumlah titik yang menyala.
 */
export const URUTAN_STATUS_KERJA = [
  "Booking",
  "Dijadwalkan",
  "Dikerjakan",
  "Selesai Dikerjakan",
  "Diserahkan",
] as const;

export type StatusKerja = (typeof URUTAN_STATUS_KERJA)[number] | "Batal";

/** Status bayar TIDAK disimpan — selalu diturunkan. Lihat `statusBayar()`. */
export type StatusBayar = "Belum Bayar" | "DP" | "Lunas";

export type MetodeBayar = "Tunai" | "Transfer" | "QRIS";

export interface ItemKatalog {
  id: string;
  nama: string;
  jenis: "produk" | "jasa";
  harga: number;
  /**
   * HPP bahan per unit. `null` untuk Jasa: HPP jasa bukan biaya bahan tapi
   * biaya langsung per job yang berbeda tiap kali, jadi tidak bisa ditaruh di
   * katalog — dicatat lewat BiayaJob (business-flow bagian 7).
   */
  hpp: number | null;
  kategori: string;
  aktif: boolean;
}

export interface Customer {
  id: string;
  nama: string;
  hp: string | null;
  email: string | null;
  sumber: string | null;
  catatan?: string;
}

export interface OrderItem {
  /** `null` untuk item custom event yang tidak diambil dari katalog. */
  katalogId: string | null;
  nama: string;
  qty: number;
  /** Harga satuan SAAT transaksi, bukan harga katalog sekarang. */
  harga: number;
  /** HPP satuan saat transaksi. `null` untuk jasa. */
  hpp: number | null;
}

export interface Payment {
  tanggal: string;
  nominal: number;
  metode: MetodeBayar;
  keterangan: string;
}

export interface BiayaJob {
  tanggal: string;
  kategori: string;
  keterangan: string;
  nominal: number;
}

export interface Order {
  no: string;
  customerId: string;
  tipe: Lini;
  /**
   * Tanggal sesi/acara untuk studio & event, tanggal transaksi untuk retail.
   * Sekaligus jatuh tempo tagihan — di skala bisnis ini tidak ada termin
   * terpisah, jadi field jatuh tempo sendiri cuma jadi data yang bisa basi.
   */
  tanggal: string;
  statusKerja: StatusKerja;
  lokasi?: string;
  catatan?: string;
  linkHasil?: string;
  items: OrderItem[];
  diskon: number;
  payments: Payment[];
  biayaJob: BiayaJob[];
}

export interface BiayaOperasional {
  id: string;
  tanggal: string;
  kategori: string;
  keterangan: string;
  nominal: number;
}

// ── Master data ─────────────────────────────────────────────────────────────

export const katalog: ItemKatalog[] = [
  { id: "PRD-01", nama: "Keychain Foto Akrilik", jenis: "produk", harga: 25_000, hpp: 8_000, kategori: "Merchandise", aktif: true },
  { id: "PRD-02", nama: "Cetak 4R", jenis: "produk", harga: 5_000, hpp: 1_500, kategori: "Cetak", aktif: true },
  { id: "PRD-03", nama: "Photostrip 3 Pose", jenis: "produk", harga: 20_000, hpp: 6_000, kategori: "Cetak", aktif: true },
  { id: "PRD-04", nama: "Cetak 10R + Bingkai", jenis: "produk", harga: 85_000, hpp: 32_000, kategori: "Cetak", aktif: true },
  { id: "PRD-05", nama: "Album Mini 20 Halaman", jenis: "produk", harga: 175_000, hpp: 70_000, kategori: "Album", aktif: true },
  { id: "JSA-01", nama: "Paket Studio 1 Jam", jenis: "jasa", harga: 350_000, hpp: null, kategori: "Studio", aktif: true },
  { id: "JSA-02", nama: "Paket Studio Keluarga 2 Jam", jenis: "jasa", harga: 650_000, hpp: null, kategori: "Studio", aktif: true },
  { id: "JSA-03", nama: "Add-on Editing Lanjutan", jenis: "jasa", harga: 150_000, hpp: null, kategori: "Add-on", aktif: true },
  { id: "JSA-04", nama: "Paket Prewedding Outdoor", jenis: "jasa", harga: 2_500_000, hpp: null, kategori: "Event", aktif: true },
  { id: "JSA-05", nama: "Paket Wedding Full Day", jenis: "jasa", harga: 8_500_000, hpp: null, kategori: "Event", aktif: true },
];

export const customers: Customer[] = [
  { id: "CUS-01", nama: "Sinta Prameswari", hp: "0812-3344-5566", email: "sinta.p@gmail.com", sumber: "Instagram" },
  { id: "CUS-02", nama: "Budi Hartono", hp: "0813-2211-9087", email: "budihartono@gmail.com", sumber: "Teman" },
  { id: "CUS-03", nama: "Rani & Dimas", hp: "0857-8899-1200", email: "ranidimas.wedding@gmail.com", sumber: "Instagram", catatan: "Wedding 18 Okt, venue Hotel Tentrem" },
  { id: "CUS-04", nama: "Nadia Salsabila", hp: "0896-1122-8899", email: "nadia.salsa@gmail.com", sumber: "Instagram" },
  { id: "CUS-05", nama: "Yoga Pratama", hp: "0821-7766-3344", email: null, sumber: "Lewat depan studio" },
  { id: "CUS-06", nama: "Dewi Anggraini", hp: "0878-4455-2211", email: "dewi.angg@gmail.com", sumber: "Teman" },
  { id: "CUS-07", nama: "Fajar Nugroho", hp: "0819-6633-7788", email: null, sumber: "Instagram" },
  /**
   * Customer "Umum" untuk transaksi retail yang customernya tidak dicatat.
   * Mewajibkan pengisian customer di POS adalah cara tercepat membuat owner
   * malas memakai app, dan satu transaksi yang dilewat membuat laporan tidak
   * bisa dipercaya (business-flow 5.1).
   */
  { id: "CUS-00", nama: "Umum", hp: null, email: null, sumber: null },
];

const item = (katalogId: string, qty: number): OrderItem => {
  const k = katalog.find((x) => x.id === katalogId);
  if (!k) throw new Error(`Item katalog tidak ada: ${katalogId}`);
  return { katalogId: k.id, nama: k.nama, qty, harga: k.harga, hpp: k.hpp };
};

export const orders: Order[] = [
  {
    no: "ORD-0012", customerId: "CUS-01", tipe: "studio", tanggal: "2026-08-26T14:00",
    statusKerja: "Dikerjakan", lokasi: "Studio", items: [item("JSA-01", 1)], diskon: 0,
    payments: [{ tanggal: "2026-08-26", nominal: 150_000, metode: "Transfer", keterangan: "DP" }],
    biayaJob: [],
  },
  {
    no: "ORD-0011", customerId: "CUS-03", tipe: "event", tanggal: "2026-10-18",
    statusKerja: "Dijadwalkan", lokasi: "Hotel Tentrem", items: [item("JSA-05", 1)], diskon: 0,
    payments: [{ tanggal: "2026-08-14", nominal: 2_500_000, metode: "Transfer", keterangan: "DP" }],
    biayaJob: [
      { tanggal: "2026-08-20", kategori: "Crew", keterangan: "DP fee fotografer utama", nominal: 1_000_000 },
      { tanggal: "2026-08-22", kategori: "Sewa alat", keterangan: "DP sewa lighting + drone", nominal: 600_000 },
    ],
  },
  {
    no: "ORD-0010", customerId: "CUS-00", tipe: "retail", tanggal: "2026-08-26",
    statusKerja: "Diserahkan", items: [item("PRD-01", 2), item("PRD-02", 6)], diskon: 0,
    payments: [{ tanggal: "2026-08-26", nominal: 80_000, metode: "Tunai", keterangan: "Pelunasan" }],
    biayaJob: [],
  },
  {
    no: "ORD-0009", customerId: "CUS-02", tipe: "studio", tanggal: "2026-08-24",
    statusKerja: "Diserahkan", lokasi: "Studio", linkHasil: "https://drive.google.com/drive/folders/ord-0009",
    items: [item("JSA-02", 1)], diskon: 0,
    payments: [{ tanggal: "2026-08-24", nominal: 650_000, metode: "Transfer", keterangan: "Pelunasan" }],
    biayaJob: [{ tanggal: "2026-08-24", kategori: "Crew", keterangan: "Fee MUA", nominal: 200_000 }],
  },
  {
    no: "ORD-0008", customerId: "CUS-04", tipe: "event", tanggal: "2026-08-12",
    statusKerja: "Selesai Dikerjakan", lokasi: "Pantai Parangtritis", items: [item("JSA-04", 1)], diskon: 0,
    payments: [{ tanggal: "2026-08-05", nominal: 1_000_000, metode: "Transfer", keterangan: "DP" }],
    biayaJob: [
      { tanggal: "2026-08-12", kategori: "Crew", keterangan: "Fee fotografer", nominal: 600_000 },
      { tanggal: "2026-08-12", kategori: "Crew", keterangan: "Fee MUA", nominal: 400_000 },
      { tanggal: "2026-08-12", kategori: "Transport", keterangan: "Sewa mobil + BBM", nominal: 200_000 },
    ],
  },
  {
    no: "ORD-0007", customerId: "CUS-05", tipe: "studio", tanggal: "2026-08-21",
    statusKerja: "Diserahkan", lokasi: "Studio", linkHasil: "https://drive.google.com/drive/folders/ord-0007",
    items: [item("JSA-01", 1)], diskon: 0,
    payments: [{ tanggal: "2026-08-21", nominal: 350_000, metode: "Transfer", keterangan: "Pelunasan" }],
    biayaJob: [],
  },
  {
    no: "ORD-0006", customerId: "CUS-00", tipe: "retail", tanggal: "2026-08-20",
    statusKerja: "Diserahkan", items: [item("PRD-04", 1)], diskon: 0,
    payments: [{ tanggal: "2026-08-20", nominal: 85_000, metode: "Tunai", keterangan: "Pelunasan" }],
    biayaJob: [],
  },
  {
    no: "ORD-0005", customerId: "CUS-06", tipe: "studio", tanggal: "2026-08-29T10:00",
    statusKerja: "Booking", lokasi: "Studio", items: [item("JSA-01", 1)], diskon: 0,
    payments: [],
    biayaJob: [],
  },
  {
    /**
     * Satu order Batal yang sudah ber-DP. Ada di dataset untuk menguji
     * perlakuan DP hangus: kebijakan refund belum ada (business-flow bagian 2
     * pertanyaan 6), jadi DP tetap tercatat sebagai omzet diterima tapi
     * ordernya tidak masuk piutang maupun jasa terlaris.
     */
    no: "ORD-0004", customerId: "CUS-07", tipe: "event", tanggal: "2026-08-15",
    statusKerja: "Batal", lokasi: "Kebun Raya", catatan: "Dibatalkan customer H-7, DP hangus",
    items: [item("JSA-04", 1)], diskon: 0,
    payments: [{ tanggal: "2026-08-08", nominal: 500_000, metode: "Transfer", keterangan: "DP" }],
    biayaJob: [],
  },
  {
    no: "ORD-0003", customerId: "CUS-00", tipe: "retail", tanggal: "2026-08-19",
    statusKerja: "Diserahkan", items: [item("PRD-03", 4)], diskon: 0,
    payments: [{ tanggal: "2026-08-19", nominal: 80_000, metode: "Tunai", keterangan: "Pelunasan" }],
    biayaJob: [],
  },
  {
    no: "ORD-0002", customerId: "CUS-01", tipe: "retail", tanggal: "2026-08-18",
    statusKerja: "Diserahkan", items: [item("PRD-02", 9)], diskon: 0,
    payments: [{ tanggal: "2026-08-18", nominal: 45_000, metode: "QRIS", keterangan: "Pelunasan" }],
    biayaJob: [],
  },
  {
    no: "ORD-0001", customerId: "CUS-02", tipe: "studio", tanggal: "2026-08-15",
    statusKerja: "Diserahkan", lokasi: "Studio", linkHasil: "https://drive.google.com/drive/folders/ord-0001",
    items: [item("JSA-01", 1)], diskon: 0,
    payments: [{ tanggal: "2026-08-15", nominal: 350_000, metode: "Tunai", keterangan: "Pelunasan" }],
    biayaJob: [],
  },
];

export const biayaOperasional: BiayaOperasional[] = [
  { id: "OPS-01", tanggal: "2026-08-01", kategori: "Sewa tempat", keterangan: "Sewa ruko Agustus", nominal: 3_500_000 },
  { id: "OPS-02", tanggal: "2026-08-05", kategori: "Utilitas", keterangan: "Listrik + internet", nominal: 800_000 },
  { id: "OPS-03", tanggal: "2026-08-10", kategori: "Marketing", keterangan: "Iklan Instagram", nominal: 500_000 },
];

// ── Turunan per order ───────────────────────────────────────────────────────

export function totalOrder(o: Order): number {
  return o.items.reduce((s, i) => s + i.qty * i.harga, 0) - o.diskon;
}

export function totalDibayar(o: Order): number {
  return o.payments.reduce((s, p) => s + p.nominal, 0);
}

export function sisaTagihan(o: Order): number {
  return totalOrder(o) - totalDibayar(o);
}

/**
 * Status bayar TIDAK diinput manual — dihitung dari total Payment dibanding
 * total Order (business-flow bagian 4). Dibuat turunan supaya tidak mungkin
 * ada order berstatus "Lunas" padahal pembayarannya kurang. Satu sumber
 * kebenaran: catatan Payment.
 */
export function statusBayar(o: Order): StatusBayar {
  const dibayar = totalDibayar(o);
  if (dibayar <= 0) return "Belum Bayar";
  if (dibayar < totalOrder(o)) return "DP";
  return "Lunas";
}

/** Rasio 0..1. Badge DP wajib menampilkan persentasenya (DESIGN.md R3). */
export function rasioDibayar(o: Order): number {
  const total = totalOrder(o);
  return total === 0 ? 0 : totalDibayar(o) / total;
}

/** HPP bahan yang terpakai di order ini. Jasa tidak punya HPP katalog. */
export function hppBahan(o: Order): number {
  return o.items.reduce((s, i) => s + i.qty * (i.hpp ?? 0), 0);
}

/** Biaya langsung = HPP bahan + seluruh BiayaJob (business-flow bagian 7). */
export function biayaLangsung(o: Order): number {
  return hppBahan(o) + o.biayaJob.reduce((s, b) => s + b.nominal, 0);
}

export function customerDari(o: Order): Customer {
  const c = customers.find((x) => x.id === o.customerId);
  if (!c) throw new Error(`Customer tidak ada: ${o.customerId}`);
  return c;
}

/** Ringkasan item untuk kolom tabel: "Keychain ×2, Cetak 4R ×6". */
export function ringkasanItem(o: Order): string {
  return o.items.map((i) => (i.qty > 1 ? `${i.nama} ×${i.qty}` : i.nama)).join(", ");
}

/**
 * Jumlah titik yang menyala pada indikator progres (DESIGN.md R3).
 * Batal mengembalikan 0 — layar menampilkannya sebagai ✕, bukan titik.
 */
export function langkahProgres(status: StatusKerja): number {
  if (status === "Batal") return 0;
  return URUTAN_STATUS_KERJA.indexOf(status) + 1;
}

export function orderDenganNo(no: string): Order | undefined {
  return orders.find((o) => o.no === no);
}

// ── Turunan agregat ─────────────────────────────────────────────────────────

/** Order yang uangnya masih menggantung. Batal tidak ditagih lagi. */
export function daftarPiutang(): Order[] {
  return orders
    .filter((o) => o.statusKerja !== "Batal" && sisaTagihan(o) > 0)
    .sort((a, b) => sisaTagihan(b) - sisaTagihan(a));
}

export function totalPiutang(): number {
  return daftarPiutang().reduce((s, o) => s + sisaTagihan(o), 0);
}

/**
 * Umur tagihan relatif hari ini. Positif = belum jatuh tempo.
 * Jatuh tempo tepat hari ini dihitung BELUM lewat, supaya kartu "Lewat Jatuh
 * Tempo" di layar Piutang sama persis dengan kelompok umur "1–30 hari".
 */
export function umurTagihan(o: Order): number {
  return selisihHari(HARI_INI, o.tanggal);
}

export function piutangLewatJatuhTempo(): Order[] {
  return daftarPiutang().filter((o) => umurTagihan(o) < 0);
}

/**
 * Omzet basis KAS — uang yang benar-benar diterima pada periode, bukan nilai
 * order yang selesai dikerjakan. Keputusan ini ada di business-flow bagian 7
 * dan mengubahnya akan mengubah seluruh angka historis; layar Laporan wajib
 * memasang Alert basis kas supaya client sadar ini pilihan, bukan fakta.
 *
 * Konsekuensi yang harus kelihatan di mockup: DP ORD-0011 masuk omzet Agustus
 * walaupun acaranya Oktober, dan DP order Batal tetap dihitung.
 */
export function omzetPeriode(bulan: string, lini?: Lini): number {
  return orders
    .filter((o) => (lini ? o.tipe === lini : true))
    .flatMap((o) => o.payments)
    .filter((p) => p.tanggal.startsWith(bulan))
    .reduce((s, p) => s + p.nominal, 0);
}

export function biayaJobPeriode(bulan: string, lini?: Lini): number {
  return orders
    .filter((o) => (lini ? o.tipe === lini : true))
    .flatMap((o) => o.biayaJob)
    .filter((b) => b.tanggal.startsWith(bulan))
    .reduce((s, b) => s + b.nominal, 0);
}

/**
 * HPP bahan diakui saat uang diterima, mengikuti basis kas — kalau tidak,
 * laba kotor retail bisa negatif di bulan barang terjual tapi belum dibayar.
 */
export function hppPeriode(bulan: string, lini?: Lini): number {
  return orders
    .filter((o) => (lini ? o.tipe === lini : true))
    .filter((o) => o.payments.some((p) => p.tanggal.startsWith(bulan)))
    .reduce((s, o) => s + hppBahan(o), 0);
}

export function biayaOperasionalPeriode(bulan: string): number {
  return biayaOperasional
    .filter((b) => b.tanggal.startsWith(bulan))
    .reduce((s, b) => s + b.nominal, 0);
}

export interface BarisMargin {
  lini: Lini;
  omzet: number;
  biayaLangsung: number;
  margin: number;
  rasioMargin: number;
  share: number;
}

/**
 * Margin per lini — output paling berharga menurut business-flow bagian 7.
 * Yang harus langsung kelihatan di layar: Event menyumbang omzet terbesar tapi
 * marginnya paling tipis, Retail sebaliknya. Kalau kontras itu tidak langsung
 * terbaca, desain layarnya gagal sekalipun rapi.
 */
export function marginPerLini(bulan: string): BarisMargin[] {
  const totalOmzet = omzetPeriode(bulan);
  return (["retail", "studio", "event"] as Lini[]).map((lini) => {
    const omzet = omzetPeriode(bulan, lini);
    const biaya = hppPeriode(bulan, lini) + biayaJobPeriode(bulan, lini);
    const margin = omzet - biaya;
    return {
      lini,
      omzet,
      biayaLangsung: biaya,
      margin,
      rasioMargin: omzet === 0 ? 0 : margin / omzet,
      share: totalOmzet === 0 ? 0 : omzet / totalOmzet,
    };
  });
}

export interface LabaRugi {
  omzetPerLini: { lini: Lini; nilai: number }[];
  totalOmzet: number;
  hppBahan: number;
  biayaJob: number;
  totalBiayaLangsung: number;
  labaKotor: number;
  rasioLabaKotor: number;
  operasional: BiayaOperasional[];
  totalOperasional: number;
  labaBersih: number;
}

export function labaRugi(bulan: string): LabaRugi {
  const omzetPerLini = (["retail", "studio", "event"] as Lini[]).map((lini) => ({
    lini,
    nilai: omzetPeriode(bulan, lini),
  }));
  const totalOmzet = omzetPeriode(bulan);
  const hpp = hppPeriode(bulan);
  const job = biayaJobPeriode(bulan);
  const totalBiayaLangsung = hpp + job;
  const labaKotor = totalOmzet - totalBiayaLangsung;
  const operasional = biayaOperasional.filter((b) => b.tanggal.startsWith(bulan));
  const totalOperasional = biayaOperasionalPeriode(bulan);
  return {
    omzetPerLini,
    totalOmzet,
    hppBahan: hpp,
    biayaJob: job,
    totalBiayaLangsung,
    labaKotor,
    rasioLabaKotor: totalOmzet === 0 ? 0 : labaKotor / totalOmzet,
    operasional,
    totalOperasional,
    labaBersih: labaKotor - totalOperasional,
  };
}

/**
 * Booking hari ini untuk KPI Dashboard.
 *
 * Retail dikecualikan: walk-in tidak punya jadwal, ordernya lahir langsung
 * berstatus Diserahkan (business-flow 5.1). Kalau retail ikut dihitung, angka
 * "Booking hari ini" jadi mencampur pekerjaan yang harus dikerjakan dengan
 * transaksi yang sudah tuntas — dan KPI itu ada supaya owner tahu apa yang
 * menunggu dia, bukan apa yang sudah beres.
 */
export interface BarisProduk {
  item: ItemKatalog;
  qty: number;
  omzet: number;
  hpp: number;
  margin: number;
  rasioMargin: number;
}

/**
 * Produk terlaris — hanya produk fisik, karena hanya mereka yang punya HPP
 * katalog sehingga marginnya bisa dihitung per unit.
 *
 * Item dengan qty 0 TETAP ditampilkan. Produk yang tidak laku sama sekali
 * adalah informasi: itu kandidat pertama untuk dihentikan, dan kalau
 * disembunyikan owner tidak akan pernah menyadarinya.
 */
export function produkTerlaris(bulan: string): BarisProduk[] {
  const terjual = new Map<string, number>();
  for (const o of orders) {
    if (!o.payments.some((p) => p.tanggal.startsWith(bulan))) continue;
    for (const i of o.items) {
      if (!i.katalogId) continue;
      terjual.set(i.katalogId, (terjual.get(i.katalogId) ?? 0) + i.qty);
    }
  }

  return katalog
    .filter((k) => k.jenis === "produk")
    .map((k) => {
      const qty = terjual.get(k.id) ?? 0;
      const omzet = qty * k.harga;
      const hpp = qty * (k.hpp ?? 0);
      const margin = omzet - hpp;
      return {
        item: k,
        qty,
        omzet,
        hpp,
        margin,
        rasioMargin: omzet === 0 ? 0 : margin / omzet,
      };
    })
    .sort((a, b) => b.omzet - a.omzet);
}

export interface BarisJasa {
  item: ItemKatalog;
  order: number;
  nilai: number;
}

/**
 * Jasa terlaris berdasarkan NILAI ORDER, bukan uang diterima — order wedding
 * yang baru DP tetap dihitung penuh di sini. Bedanya dengan Laba Rugi
 * disengaja: layar ini menjawab "paket mana yang laku", bukan "berapa uang yang
 * masuk". Order Batal tidak dihitung.
 */
export function jasaTerlaris(): BarisJasa[] {
  const rekap = new Map<string, { order: number; nilai: number }>();
  for (const o of orders) {
    if (o.statusKerja === "Batal") continue;
    for (const i of o.items) {
      if (!i.katalogId) continue;
      const k = katalog.find((x) => x.id === i.katalogId);
      if (!k || k.jenis !== "jasa") continue;
      const kini = rekap.get(k.id) ?? { order: 0, nilai: 0 };
      rekap.set(k.id, {
        order: kini.order + i.qty,
        nilai: kini.nilai + i.qty * i.harga,
      });
    }
  }

  return [...rekap.entries()]
    .map(([id, v]) => ({
      item: katalog.find((k) => k.id === id)!,
      order: v.order,
      nilai: v.nilai,
    }))
    .sort((a, b) => b.nilai - a.nilai);
}

export interface KelompokUmur {
  label: string;
  order: Order[];
  nilai: number;
  share: number;
}

/**
 * Umur piutang. Batas kelompok mengikuti stitch-prompts.md bagian 3.
 *
 * Jatuh tempo tepat hari ini masuk "Belum jatuh tempo", bukan "1–30 hari" —
 * konsisten dengan kartu "Lewat Jatuh Tempo" di layar Pembayaran. Kalau dua
 * layar berbeda pendapat soal batas ini, angkanya tidak akan pernah cocok dan
 * owner berhenti percaya pada keduanya.
 */
export function umurPiutang(): KelompokUmur[] {
  const semua = daftarPiutang();
  const total = semua.reduce((s, o) => s + sisaTagihan(o), 0);

  const kelompok: { label: string; cocok: (hari: number) => boolean }[] = [
    { label: "Belum jatuh tempo", cocok: (h) => h >= 0 },
    { label: "1–30 hari", cocok: (h) => h < 0 && h >= -30 },
    { label: "31–60 hari", cocok: (h) => h < -30 && h >= -60 },
    { label: "> 60 hari", cocok: (h) => h < -60 },
  ];

  return kelompok.map((k) => {
    const order = semua.filter((o) => k.cocok(umurTagihan(o)));
    const nilai = order.reduce((s, o) => s + sisaTagihan(o), 0);
    return {
      label: k.label,
      order,
      nilai,
      share: total === 0 ? 0 : nilai / total,
    };
  });
}

/** Piutang per lini — menjawab "risiko kita menumpuk di lini mana". */
export function piutangPerLini(): { lini: Lini; nilai: number; share: number }[] {
  const semua = daftarPiutang();
  const total = semua.reduce((s, o) => s + sisaTagihan(o), 0);
  return (["retail", "studio", "event"] as Lini[]).map((lini) => {
    const nilai = semua
      .filter((o) => o.tipe === lini)
      .reduce((s, o) => s + sisaTagihan(o), 0);
    return { lini, nilai, share: total === 0 ? 0 : nilai / total };
  });
}

export interface RingkasanCustomer {
  customer: Customer;
  /** Order non-Batal. Batal tidak dihitung sebagai nilai maupun jumlah order. */
  order: Order[];
  jumlahOrder: number;
  nilaiOrder: number;
  sudahDibayar: number;
  lini: Lini[];
  terakhirTransaksi: string | null;
}

/**
 * Ringkasan per customer — dipakai layar Customer dan "customer teratas" di
 * Laporan Penjualan.
 *
 * Order Batal dikeluarkan dari nilai dan jumlah order, tapi DP-nya tetap
 * terhitung di omzet (kebijakan refund belum ada, DP hangus). Jadi angka di
 * sini sengaja tidak dipaksa sama dengan omzet — yang satu "nilai pekerjaan
 * yang disepakati", yang lain "uang yang masuk".
 */
export function ringkasanCustomer(): RingkasanCustomer[] {
  return customers
    .map((c) => {
      const semua = orders.filter((o) => o.customerId === c.id);
      const hidup = semua.filter((o) => o.statusKerja !== "Batal");
      return {
        customer: c,
        order: semua.sort((a, b) => b.no.localeCompare(a.no)),
        jumlahOrder: hidup.length,
        nilaiOrder: hidup.reduce((s, o) => s + totalOrder(o), 0),
        sudahDibayar: hidup.reduce((s, o) => s + totalDibayar(o), 0),
        lini: [...new Set(hidup.map((o) => o.tipe))],
        terakhirTransaksi:
          semua
            .map((o) => o.tanggal.slice(0, 10))
            .sort()
            .at(-1) ?? null,
      };
    })
    /**
     * Customer TANPA order tetap ditampilkan — dia lead yang kontaknya sudah
     * masuk sebelum ada transaksi (DM Instagram, teman yang minta dihubungi).
     * Sebelumnya mereka disaring di sini, dan akibatnya customer yang baru
     * ditambah manual langsung lenyap dari layar seolah tombolnya tidak
     * bekerja. Laporan Penjualan yang menyaring `jumlahOrder > 0`, karena di
     * sana yang dirangking memang nilai transaksi.
     */
    .sort((a, b) => b.nilaiOrder - a.nilaiOrder);
}

export function bookingHariIni(): Order[] {
  return orders.filter(
    (o) =>
      o.tipe !== "retail" &&
      o.statusKerja !== "Batal" &&
      o.tanggal.startsWith(HARI_INI),
  );
}
