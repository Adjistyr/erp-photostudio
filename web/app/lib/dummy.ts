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
import { formatBulan, formatRp, selisihHari, tambahBulan } from "./format.ts";

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

// ── Modal, pos dana & bagi hasil (business-flow bagian 8) ───────────────────

export interface Owner {
  id: string;
  nama: string;
}

/**
 * Aturan bagi hasil yang berlaku MULAI bulan tertentu (business-flow 8.6).
 *
 * Mengubah rasio = menambah baris baru, bukan mengedit baris lama. Kalau satu
 * pengaturan diedit di tempat, mengubah 70/30 jadi 60/40 akan diam-diam
 * mengubah bagi hasil semua bulan lama.
 *
 * Alokasi maintenance TIDAK di sini — dihitung dari daftar aset (8.9). Aset
 * punya tanggal beli dan tanggal lepas, jadi aset baru otomatis tidak
 * mengubah bulan lalu tanpa perlu disimpan per periode.
 *
 * Persen disimpan sebagai bilangan bulat 0..100, bukan pecahan 0..1: pecahan
 * float tidak selalu berjumlah persis 1 (0.7 + 0.2 + 0.1 = 0.9999999999999999)
 * dan validasi "total harus 100%" jadi gagal untuk isian yang benar.
 */
export interface PengaturanBagiHasil {
  /** "YYYY-MM" */
  berlakuMulai: string;
  persenCadangan: number;
  bagian: { ownerId: string; persen: number }[];
}

// ── Aset & maintenance (business-flow 8.9) ──────────────────────────────────

export type StatusAset = "aktif" | "rusak" | "dilepas";

/**
 * Satu baris = satu jenis alat dengan jumlah unit, seperti sheet client
 * (baterai × 2, lighting × 2). Status berlaku untuk semua unit di baris itu;
 * kalau satu dari dua lighting rusak, pecah jadi dua baris.
 */
export interface Aset {
  id: string;
  nama: string;
  kategori: string;
  /** Merek/model, mis. "Canon EOS M50". */
  catatan: string;
  unit: number;
  hargaSatuan: number;
  tanggalBeli: string;
  /** Persen harga beli yang disisihkan per bulan untuk dana maintenance. */
  persenMaintenance: number;
  /** Umur ekonomis — hanya untuk nilai buku, tidak masuk laba rugi. */
  umurBulan: number;
  /** `null` = tidak punya jadwal perawatan berkala (mis. baterai). */
  intervalRawatBulan: number | null;
  status: StatusAset;
  lepas: { tanggal: string; alasan: string; hargaJual: number } | null;
  /** Investasi yang membelinya. `null` untuk aset yang dicatat tanpa investasi. */
  investasiId: string | null;
}

/**
 * Riwayat perawatan & perbaikan per aset. Biayanya diambil dari dana
 * maintenance — satu-satunya jalur keluar dana itu selain pemakaian umum.
 * Nominal boleh 0: head cleaning printer yang dikerjakan sendiri tetap
 * perawatan dan tetap mereset jadwal, walaupun tidak ada uang keluar.
 */
export interface ServisAset {
  id: string;
  asetId: string;
  tanggal: string;
  jenis: "rutin" | "perbaikan";
  keterangan: string;
  nominal: number;
}

/**
 * Default per kategori — praktik umum studio foto UMKM, BUKAN data client
 * (docs/demo-client.md). Dipakai mengisi form Tambah Aset; tiap aset tetap
 * bisa diubah sendiri.
 */
export const KATEGORI_ASET: {
  nama: string;
  umurBulan: number;
  intervalRawatBulan: number | null;
}[] = [
  { nama: "Kamera", umurBulan: 48, intervalRawatBulan: 6 },
  { nama: "Lensa", umurBulan: 48, intervalRawatBulan: 12 },
  { nama: "Lighting", umurBulan: 48, intervalRawatBulan: 12 },
  { nama: "Printer", umurBulan: 36, intervalRawatBulan: 1 },
  { nama: "Aksesori", umurBulan: 24, intervalRawatBulan: null },
  { nama: "Komputer", umurBulan: 36, intervalRawatBulan: 12 },
  { nama: "Properti & furnitur", umurBulan: 36, intervalRawatBulan: null },
];

export type PosDana = "maintenance" | "cadangan";

export const LABEL_POS_DANA: Record<PosDana, string> = {
  maintenance: "Dana maintenance",
  cadangan: "Dana cadangan",
};

/**
 * Uang dari owner ke usaha — bukan omzet, tidak memengaruhi laba (8.3).
 * `tujuan` menentukan dari mana pinjaman dikembalikan: pinjaman ke kas dari
 * laba sebelum dibagi, pinjaman ke pos dana dari alokasi pos itu sendiri.
 */
export interface SetoranOwner {
  id: string;
  tanggal: string;
  ownerId: string;
  nominal: number;
  jenis: "pinjaman" | "modal";
  tujuan: "kas" | PosDana | "investasi";
  keterangan: string;
}

/** Pemakaian pos dana. Alokasi masuk TIDAK dicatat — dihitung dari laporan. */
export interface PemakaianDana {
  id: string;
  tanggal: string;
  pos: PosDana;
  nominal: number;
  keterangan: string;
}

/** Renovasi, beli alat — di luar laba rugi (8.4). */
export interface Investasi {
  id: string;
  tanggal: string;
  keterangan: string;
  nominal: number;
  /** Setoran modal owner yang membiayai. `null` = dibayar dari kas usaha. */
  setoranId: string | null;
}

/**
 * Ringkasan bulan SEBELUM app dipakai, dibawa dari sheet client (8.8).
 * Bulan ini tidak punya order di app, jadi labanya tidak bisa diturunkan —
 * satu-satunya angka laba yang ditulis tangan di dataset.
 */
export interface SaldoAwalBulan {
  bulan: string;
  omzet: number;
  labaBersih: number;
  sumber: string;
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

export const owners: Owner[] = [
  { id: "OWN-01", nama: "Agung" },
  { id: "OWN-02", nama: "Raka" },
];

export const pengaturanBagiHasil: PengaturanBagiHasil[] = [
  {
    berlakuMulai: "2026-07",
    persenCadangan: 10,
    bagian: [
      { ownerId: "OWN-01", persen: 70 },
      { ownerId: "OWN-02", persen: 30 },
    ],
  },
];

/**
 * Juli = contoh omzet Rp 10.000.000 di sheet client, dengan maintenance yang
 * sudah dikoreksi: 10.000.000 − 7.796.849 − 790.450 = 1.412.701.
 */
export const saldoAwal: SaldoAwalBulan[] = [
  { bulan: "2026-07", omzet: 10_000_000, labaBersih: 1_412_701, sumber: "Sheet HPP & pembagian hasil" },
];

/**
 * Modal awal di bawah adalah CONTOH — data aslinya belum ada (business-flow
 * 8.7). Nominalnya total alat di sheet maintenance: kamera 7.000.000, baterai
 * 2 × 120.000, trigger 565.000, memory 2 × 477.000, lighting 2 × 1.350.000,
 * printer 4.350.000.
 */
export const setoranOwner: SetoranOwner[] = [
  { id: "STR-01", tanggal: "2026-07-01", ownerId: "OWN-01", nominal: 15_809_000, jenis: "modal", tujuan: "investasi", keterangan: "Modal awal — alat studio" },
  { id: "STR-02", tanggal: "2026-08-25", ownerId: "OWN-01", nominal: 2_000_000, jenis: "pinjaman", tujuan: "kas", keterangan: "Menutup kekurangan kas Agustus" },
];

export const investasi: Investasi[] = [
  { id: "INV-01", tanggal: "2026-07-01", keterangan: "Kamera, printer, lighting & aksesori", nominal: 15_809_000, setoranId: "STR-01" },
];

/** Pemakaian dana di luar servis aset — servis dicatat di `servisAset`. */
export const pemakaianDana: PemakaianDana[] = [];

/**
 * Alat dari sheet maintenance client, 5% per bulan. Total alokasinya
 * Rp 790.450 — bukan Rp 693.100 seperti di sheet, yang lupa mengalikan
 * jumlah unit baterai, memory card, dan lighting (business-flow 8.1).
 * Umur ekonomis dan interval perawatan adalah default umum (KATEGORI_ASET).
 */
export const aset: Aset[] = [
  { id: "AST-01", nama: "Kamera mirrorless", kategori: "Kamera", catatan: "Canon EOS M50", unit: 1, hargaSatuan: 7_000_000, tanggalBeli: "2026-07-01", persenMaintenance: 5, umurBulan: 48, intervalRawatBulan: 6, status: "aktif", lepas: null, investasiId: "INV-01" },
  { id: "AST-02", nama: "Baterai kamera", kategori: "Aksesori", catatan: "Kingma LP-E12", unit: 2, hargaSatuan: 120_000, tanggalBeli: "2026-07-01", persenMaintenance: 5, umurBulan: 24, intervalRawatBulan: null, status: "aktif", lepas: null, investasiId: "INV-01" },
  { id: "AST-03", nama: "Trigger flash", kategori: "Aksesori", catatan: "Godox X2T", unit: 1, hargaSatuan: 565_000, tanggalBeli: "2026-07-01", persenMaintenance: 5, umurBulan: 24, intervalRawatBulan: null, status: "aktif", lepas: null, investasiId: "INV-01" },
  { id: "AST-04", nama: "Memory card", kategori: "Aksesori", catatan: "SanDisk 32GB", unit: 2, hargaSatuan: 477_000, tanggalBeli: "2026-07-01", persenMaintenance: 5, umurBulan: 24, intervalRawatBulan: null, status: "aktif", lepas: null, investasiId: "INV-01" },
  { id: "AST-05", nama: "Lighting studio", kategori: "Lighting", catatan: "Godox SK400 II", unit: 2, hargaSatuan: 1_350_000, tanggalBeli: "2026-07-01", persenMaintenance: 5, umurBulan: 48, intervalRawatBulan: 12, status: "aktif", lepas: null, investasiId: "INV-01" },
  { id: "AST-06", nama: "Printer foto", kategori: "Printer", catatan: "Epson L8050", unit: 1, hargaSatuan: 4_350_000, tanggalBeli: "2026-07-01", persenMaintenance: 5, umurBulan: 36, intervalRawatBulan: 1, status: "aktif", lepas: null, investasiId: "INV-01" },
];

export const servisAset: ServisAset[] = [
  { id: "SRV-01", asetId: "AST-05", tanggal: "2026-08-10", jenis: "perbaikan", keterangan: "Ganti kipas pendingin", nominal: 150_000 },
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
  /** Dana servis alat, disisihkan sebelum laba bersih (business-flow 8.2). */
  alokasiMaintenance: number;
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
  // Tetap diambil saat rugi — alat tetap aus walaupun omzet sepi.
  const alokasiMaintenance = alokasiMaintenanceBulan(bulan);
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
    alokasiMaintenance,
    labaBersih: labaKotor - totalOperasional - alokasiMaintenance,
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

// ── Modal, pos dana & bagi hasil — turunan (business-flow bagian 8) ─────────
//
// Semua angka di bawah DIHITUNG ULANG dari riwayat setiap kali dipanggil,
// tidak disimpan. Pada volume ini tidak ada masalah performa, dan tidak ada
// angka tersimpan yang bisa basi saat biaya bulan lalu diinput telat.

export const BULAN_BERJALAN = HARI_INI.slice(0, 7);

/** "2026-07" → "2026-08" */
export function bulanBerikut(bulan: string): string {
  const [th, bl] = bulan.split("-").map(Number);
  return bl === 12 ? `${th + 1}-01` : `${th}-${String(bl + 1).padStart(2, "0")}`;
}

/** "2026-07" → "2026-07-31". Hari ke-0 bulan berikutnya = hari terakhir bulan ini. */
function akhirBulan(bulan: string): string {
  const [th, bl] = bulan.split("-").map(Number);
  return `${bulan}-${String(new Date(th, bl, 0).getDate()).padStart(2, "0")}`;
}

function jumlah(xs: { sisa: number }[]): number {
  return xs.reduce((s, x) => s + x.sisa, 0);
}

export function namaOwner(id: string): string {
  return owners.find((o) => o.id === id)?.nama ?? id;
}

function pengaturanUrut(): PengaturanBagiHasil[] {
  return [...pengaturanBagiHasil].sort((a, b) =>
    a.berlakuMulai.localeCompare(b.berlakuMulai),
  );
}

/** Aturan yang berlaku di bulan itu = aturan terakhir yang mulai ≤ bulan. */
export function pengaturanUntuk(bulan: string): PengaturanBagiHasil | undefined {
  return pengaturanUrut()
    .filter((p) => p.berlakuMulai <= bulan)
    .at(-1);
}

export interface PinjamanTerbuka {
  setoranId: string;
  ownerId: string;
  sisa: number;
}

export interface HasilBagiHasil {
  potongan: number;
  pelunasan: { setoranId: string; ownerId: string; nominal: number }[];
  dibagi: number;
  cadangan: number;
  bagian: { ownerId: string; persen: number; nominal: number }[];
  akumulasiRugi: number;
  pinjaman: PinjamanTerbuka[];
}

/**
 * Owner terakhir menerima sisa pembulatan, supaya semua bagian berjumlah
 * persis sama dengan yang dibagi. Kalau tiap bagian dibulatkan sendiri,
 * totalnya bisa selisih Rp 1 dari laba bersih di laporan.
 */
function bagiPersen(
  total: number,
  bagian: { ownerId: string; persen: number }[],
): HasilBagiHasil["bagian"] {
  let terpakai = 0;
  return bagian.map((b, i) => {
    const nominal =
      i === bagian.length - 1 ? total - terpakai : Math.round((total * b.persen) / 100);
    terpakai += nominal;
    return { ...b, nominal };
  });
}

/**
 * Bagi hasil satu bulan — business-flow 8.5. Murni: input tidak dimutasi.
 *
 * Rugi yang dibawa dan pinjaman owner ke kas sering UANG YANG SAMA (owner
 * meminjamkan justru karena rugi). Kalau keduanya dipotong terpisah, laba
 * terpotong dua kali. Karena itu potongannya satu:
 *
 *   potongan = min(laba, max(akumulasi rugi, sisa pinjaman))
 *
 * Potongan melunasi pinjaman urut tanggal setor; sisanya tetap di kas.
 * `pinjaman` wajib sudah urut tanggal setor.
 */
export function hitungBagiHasil(
  labaBersih: number,
  akumulasiRugi: number,
  pinjaman: PinjamanTerbuka[],
  aturan: Pick<PengaturanBagiHasil, "persenCadangan" | "bagian">,
): HasilBagiHasil {
  const sisa = pinjaman.map((p) => ({ ...p }));

  if (labaBersih <= 0) {
    return {
      potongan: 0,
      pelunasan: [],
      dibagi: 0,
      cadangan: 0,
      bagian: aturan.bagian.map((b) => ({ ...b, nominal: 0 })),
      akumulasiRugi: akumulasiRugi - labaBersih,
      pinjaman: sisa,
    };
  }

  const potongan = Math.min(labaBersih, Math.max(akumulasiRugi, jumlah(sisa)));
  const pelunasan: HasilBagiHasil["pelunasan"] = [];
  let bayar = potongan;
  for (const p of sisa) {
    const n = Math.min(p.sisa, bayar);
    if (n <= 0) continue;
    p.sisa -= n;
    bayar -= n;
    pelunasan.push({ setoranId: p.setoranId, ownerId: p.ownerId, nominal: n });
  }

  const dibagi = labaBersih - potongan;
  const cadangan = Math.round((dibagi * aturan.persenCadangan) / 100);
  return {
    potongan,
    pelunasan,
    dibagi,
    cadangan,
    bagian: bagiPersen(dibagi - cadangan, aturan.bagian),
    akumulasiRugi: Math.max(0, akumulasiRugi - potongan),
    pinjaman: sisa,
  };
}

export interface BagiHasilBulan extends HasilBagiHasil {
  bulan: string;
  labaBersih: number;
  /** Bulan sebelum app dipakai — labanya dari sheet, bukan dari order. */
  dariSaldoAwal: boolean;
  /** Bulan sudah lewat. Bulan berjalan masih bisa berubah tiap ada transaksi. */
  final: boolean;
  akumulasiRugiAwal: number;
  sisaPinjamanAwal: number;
  sisaPinjaman: number;
}

/** Riwayat bagi hasil dari aturan pertama sampai `sampaiBulan`, urut bulan. */
export function bagiHasil(sampaiBulan: string): BagiHasilBulan[] {
  const awal = pengaturanUrut()[0]?.berlakuMulai;
  if (!awal) return [];

  const pinjamanKas = setoranOwner
    .filter((s) => s.jenis === "pinjaman" && s.tujuan === "kas")
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  const hasil: BagiHasilBulan[] = [];
  let akumulasiRugi = 0;
  let pinjaman: PinjamanTerbuka[] = [];
  let i = 0;

  for (let bulan = awal; bulan <= sampaiBulan; bulan = bulanBerikut(bulan)) {
    // Pinjaman yang disetor sampai akhir bulan ini ikut dihitung di bulan ini.
    while (i < pinjamanKas.length && pinjamanKas[i].tanggal.slice(0, 7) <= bulan) {
      const s = pinjamanKas[i++];
      pinjaman = [...pinjaman, { setoranId: s.id, ownerId: s.ownerId, sisa: s.nominal }];
    }
    const aturan = pengaturanUntuk(bulan);
    if (!aturan) continue; // tidak mungkin: bulan ≥ aturan pertama
    const sa = saldoAwal.find((x) => x.bulan === bulan);
    const labaBersih = sa ? sa.labaBersih : labaRugi(bulan).labaBersih;
    const akumulasiRugiAwal = akumulasiRugi;
    const sisaPinjamanAwal = jumlah(pinjaman);

    const h = hitungBagiHasil(labaBersih, akumulasiRugi, pinjaman, aturan);
    akumulasiRugi = h.akumulasiRugi;
    pinjaman = h.pinjaman;

    hasil.push({
      ...h,
      bulan,
      labaBersih,
      dariSaldoAwal: Boolean(sa),
      final: bulan < BULAN_BERJALAN,
      akumulasiRugiAwal,
      sisaPinjamanAwal,
      sisaPinjaman: jumlah(pinjaman),
    });
  }
  return hasil;
}

export function bagiHasilBulan(bulan: string): BagiHasilBulan | undefined {
  return bagiHasil(bulan).find((b) => b.bulan === bulan);
}

// ── Pos dana (business-flow 8.2) ────────────────────────────────────────────

export type JenisMutasiDana =
  | "Alokasi"
  | "Pemakaian"
  | "Hasil jual aset"
  | "Pinjaman owner"
  | "Pengembalian pinjaman";

export interface BarisMutasiDana {
  tanggal: string;
  jenis: JenisMutasiDana;
  keterangan: string;
  masuk: number;
  keluar: number;
  saldo: number;
}

type KejadianDana =
  | { tanggal: string; urutan: 0; setoran: SetoranOwner }
  | {
      tanggal: string;
      urutan: 1;
      jenis: "Pemakaian" | "Hasil jual aset";
      keterangan: string;
      masuk: number;
      keluar: number;
    }
  | { tanggal: string; urutan: 2; bulan: string; nominal: number };

/**
 * Uang masuk-keluar dana maintenance dari aset: biaya servis keluar, hasil
 * jual aset masuk. Hasil jual ke dana maintenance, bukan omzet — uangnya
 * untuk membeli pengganti, dan memasukkannya ke omzet membuat laba bulan itu
 * naik oleh sesuatu yang bukan penjualan (asumsi umum, docs/demo-client.md).
 */
function kejadianAset(): Extract<KejadianDana, { urutan: 1 }>[] {
  const jual = aset.flatMap((a) =>
    a.lepas && a.lepas.hargaJual > 0
      ? [{
          tanggal: a.lepas.tanggal,
          urutan: 1 as const,
          jenis: "Hasil jual aset" as const,
          keterangan: `${a.nama} — ${a.lepas.alasan}`,
          masuk: a.lepas.hargaJual,
          keluar: 0,
        }]
      : [],
  );
  // Servis Rp 0 (dikerjakan sendiri) tidak menggerakkan dana — tidak dicatat.
  const servis = servisAset
    .filter((s) => s.nominal > 0)
    .map((s) => ({
      tanggal: s.tanggal,
      urutan: 1 as const,
      jenis: "Pemakaian" as const,
      keterangan: `${aset.find((a) => a.id === s.asetId)?.nama ?? s.asetId} — ${s.keterangan}`,
      masuk: 0,
      keluar: s.nominal,
    }));
  return [...jual, ...servis];
}

/**
 * Alokasi masuk di akhir bulan dan hanya untuk bulan yang sudah TUTUP: laba
 * bulan berjalan masih berubah tiap ada transaksi, jadi cadangannya belum
 * pasti. Pinjaman ke pos dana dikembalikan dari alokasi pos itu sendiri,
 * bukan dari laba — kalau dari laba, rumus potongan di 8.5 jadi menampung dua
 * jenis utang dan bisa memotong dua kali.
 */
function jalankanPosDana(pos: PosDana): {
  baris: BarisMutasiDana[];
  hutang: PinjamanTerbuka[];
} {
  const tutup = bagiHasil(BULAN_BERJALAN).filter((b) => b.final);
  const kejadian: KejadianDana[] = [
    ...setoranOwner
      .filter((s) => s.jenis === "pinjaman" && s.tujuan === pos)
      .map((s) => ({ tanggal: s.tanggal, urutan: 0 as const, setoran: s })),
    ...(pos === "maintenance" ? kejadianAset() : []),
    ...pemakaianDana
      .filter((p) => p.pos === pos)
      .map((p) => ({
        tanggal: p.tanggal,
        urutan: 1 as const,
        jenis: "Pemakaian" as const,
        keterangan: p.keterangan,
        masuk: 0,
        keluar: p.nominal,
      })),
    ...tutup.map((b) => ({
      tanggal: akhirBulan(b.bulan),
      urutan: 2 as const,
      bulan: b.bulan,
      nominal: pos === "maintenance" ? alokasiMaintenanceBulan(b.bulan) : b.cadangan,
    })),
  ].sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.urutan - b.urutan);

  const baris: BarisMutasiDana[] = [];
  const hutang: PinjamanTerbuka[] = [];
  let saldo = 0;
  const catat = (
    tanggal: string,
    jenis: JenisMutasiDana,
    keterangan: string,
    masuk: number,
    keluar: number,
  ) => {
    saldo += masuk - keluar;
    baris.push({ tanggal, jenis, keterangan, masuk, keluar, saldo });
  };

  for (const k of kejadian) {
    if (k.urutan === 0) {
      hutang.push({ setoranId: k.setoran.id, ownerId: k.setoran.ownerId, sisa: k.setoran.nominal });
      catat(k.tanggal, "Pinjaman owner", `${namaOwner(k.setoran.ownerId)} — ${k.setoran.keterangan}`, k.setoran.nominal, 0);
    } else if (k.urutan === 1) {
      catat(k.tanggal, k.jenis, k.keterangan, k.masuk, k.keluar);
    } else {
      // Bulan rugi tidak punya alokasi cadangan — baris Rp 0 cuma noise.
      if (k.nominal <= 0) continue;
      catat(k.tanggal, "Alokasi", `Alokasi ${formatBulan(k.bulan)}`, k.nominal, 0);
      let tersedia = k.nominal;
      for (const h of hutang) {
        const n = Math.min(h.sisa, tersedia);
        if (n <= 0) continue;
        h.sisa -= n;
        tersedia -= n;
        catat(k.tanggal, "Pengembalian pinjaman", `Ke ${namaOwner(h.ownerId)}`, 0, n);
      }
    }
  }
  return { baris, hutang };
}

export function mutasiPosDana(pos: PosDana): BarisMutasiDana[] {
  return jalankanPosDana(pos).baris;
}

export function saldoPosDana(pos: PosDana): number {
  return mutasiPosDana(pos).at(-1)?.saldo ?? 0;
}

/**
 * Saldo pos dana tidak boleh minus (business-flow 8.2). Kekurangannya
 * ditutup setoran owner lebih dulu — kalau dibiarkan minus, dananya diam-diam
 * meminjam dari kas dan tidak ada yang mencatat siapa yang harus mengganti.
 */
export function validasiPemakaian(pos: PosDana, nominal: number): string | null {
  if (nominal <= 0) return "Nominal harus lebih dari 0.";
  const saldo = saldoPosDana(pos);
  if (nominal > saldo) {
    return `Saldo ${LABEL_POS_DANA[pos].toLowerCase()} tinggal ${formatRp(saldo)}. Catat setoran owner ke pos ini dulu untuk menutup kekurangannya.`;
  }
  return null;
}

// ── Setoran, balik modal, aturan ────────────────────────────────────────────

/**
 * Sisa pinjaman per setoran, per hari ini. Setoran modal tidak punya sisa —
 * modal tidak dikembalikan langsung, kembalinya lewat bagi hasil.
 */
export function sisaPinjamanPerSetoran(): Map<string, number> {
  const sisa = new Map<string, number>();
  const kas = bagiHasil(BULAN_BERJALAN).at(-1)?.pinjaman ?? [];
  const pos = (["maintenance", "cadangan"] as PosDana[]).flatMap(
    (p) => jalankanPosDana(p).hutang,
  );
  for (const p of [...kas, ...pos]) sisa.set(p.setoranId, p.sisa);
  return sisa;
}

export interface ProgresModal {
  owner: Owner;
  modal: number;
  hakBagiHasil: number;
  rasio: number;
}

/**
 * Hak bagi hasil dibanding modal yang disetor (business-flow 8.7). Yang
 * dihitung HAK dari bulan yang sudah tutup, bukan uang yang dicairkan —
 * pencairan tidak dicatat app. Owner tanpa setoran modal tidak ikut: rasio
 * terhadap modal 0 tidak bermakna. Kosong = modal awal belum diisi, dan
 * layarnya menyembunyikan widget, bukan menampilkan 0%.
 */
export function progresBalikModal(): ProgresModal[] {
  const tutup = bagiHasil(BULAN_BERJALAN).filter((b) => b.final);
  return owners
    .map((owner) => {
      const modal = setoranOwner
        .filter((s) => s.ownerId === owner.id && s.jenis === "modal")
        .reduce((s, x) => s + x.nominal, 0);
      const hakBagiHasil = tutup
        .flatMap((b) => b.bagian)
        .filter((b) => b.ownerId === owner.id)
        .reduce((s, b) => s + b.nominal, 0);
      return { owner, modal, hakBagiHasil, rasio: modal === 0 ? 0 : hakBagiHasil / modal };
    })
    .filter((p) => p.modal > 0);
}

/**
 * Aturan baru hanya boleh berlaku mulai bulan berjalan atau sesudahnya, dan
 * sesudah aturan terakhir. Berlaku mundur berarti mengubah bagi hasil bulan
 * yang sudah dihitung — tepat yang mau dicegah dengan menyimpan aturan per
 * periode (business-flow 8.6).
 */
export function validasiPengaturan(p: PengaturanBagiHasil): string | null {
  if (!/^\d{4}-\d{2}$/.test(p.berlakuMulai)) return "Pilih bulan mulai berlaku.";
  if (p.berlakuMulai < BULAN_BERJALAN) {
    return `${formatBulan(p.berlakuMulai)} sudah tutup — aturan tidak boleh berlaku mundur ke bulan yang bagi hasilnya sudah dihitung.`;
  }
  const terakhir = pengaturanUrut().at(-1);
  if (terakhir && p.berlakuMulai <= terakhir.berlakuMulai) {
    return `Sudah ada aturan yang berlaku mulai ${formatBulan(terakhir.berlakuMulai)}. Pilih bulan sesudahnya.`;
  }
  const bulat = (n: number) => Number.isInteger(n) && n >= 0 && n <= 100;
  if (!p.bagian.every((b) => bulat(b.persen))) {
    return "Persen tiap owner harus bilangan bulat 0–100.";
  }
  const total = p.bagian.reduce((s, b) => s + b.persen, 0);
  if (total !== 100) return `Total bagian owner ${total}%, harus 100%.`;
  if (!bulat(p.persenCadangan)) return "Persen dana cadangan harus bilangan bulat 0–100.";
  return null;
}

// ── Titik impas (Dashboard) ─────────────────────────────────────────────────

export interface TitikImpas {
  biayaTetap: number;
  labaKotor: number;
  kurang: number;
  rasio: number;
}

/**
 * Dibandingkan dengan LABA KOTOR, bukan omzet seperti "HPP per hari" di sheet
 * client. Omzet event yang besar tapi habis untuk fee crew akan terlihat
 * menutup biaya tetap padahal tidak — laba kotor sudah memotong biaya
 * langsungnya.
 */
export function titikImpas(bulan: string): TitikImpas {
  const lr = labaRugi(bulan);
  const biayaTetap = lr.totalOperasional + lr.alokasiMaintenance;
  return {
    biayaTetap,
    labaKotor: lr.labaKotor,
    kurang: Math.max(0, biayaTetap - lr.labaKotor),
    rasio: biayaTetap === 0 ? 1 : lr.labaKotor / biayaTetap,
  };
}

// ── Aset & maintenance — turunan (business-flow 8.9) ────────────────────────

/** "2026-07" → "2026-08" = 1. */
function selisihBulan(dari: string, sampai: string): number {
  const [th1, bl1] = dari.split("-").map(Number);
  const [th2, bl2] = sampai.split("-").map(Number);
  return th2 * 12 + bl2 - (th1 * 12 + bl1);
}

/**
 * Dimiliki di AKHIR bulan: sudah dibeli dan belum dilepas per akhir bulan.
 * Akhir bulan, bukan "pernah dimiliki di bulan itu": alokasi dihitung saat
 * tutup buku, dan aset yang dijual tanggal 20 tidak perlu dana servis lagi.
 */
function dimilikiAkhirBulan(a: Aset, bulan: string): boolean {
  const akhir = akhirBulan(bulan);
  if (a.tanggalBeli > akhir) return false;
  return !a.lepas || a.lepas.tanggal > akhir;
}

/**
 * Pembulatan per aset, bukan di total: nominal per aset yang tampil di tabel
 * harus berjumlah persis sama dengan alokasi di Laba Rugi.
 */
export function alokasiMaintenanceAset(a: Aset, bulan: string): number {
  if (!dimilikiAkhirBulan(a, bulan)) return 0;
  return Math.round((a.hargaSatuan * a.unit * a.persenMaintenance) / 100);
}

/**
 * Alokasi dana maintenance satu bulan = Σ harga × unit × % aset yang
 * dimiliki di akhir bulan. Menggantikan nominal manual: di sheet client
 * nominal manual itulah yang salah Rp 97.350 karena unit lupa dikali. Aset
 * baru tidak mengubah bulan lalu karena tanggal belinya sesudah bulan itu.
 */
export function alokasiMaintenanceBulan(bulan: string): number {
  return aset.reduce((s, a) => s + alokasiMaintenanceAset(a, bulan), 0);
}

/**
 * Nilai buku garis lurus — INFORMASI saja, tidak masuk Laba Rugi. Biaya aus
 * alat sudah diwakili alokasi maintenance; memasukkan penyusutan juga
 * berarti membebankan keausan yang sama dua kali. Bulan beli dihitung penuh.
 */
export function nilaiBuku(a: Aset, bulan: string = BULAN_BERJALAN): number {
  if (!dimilikiAkhirBulan(a, bulan)) return 0;
  const terpakai = selisihBulan(a.tanggalBeli.slice(0, 7), bulan) + 1;
  const sisa = Math.max(0, 1 - terpakai / a.umurBulan);
  return Math.round(a.hargaSatuan * a.unit * sisa);
}

export function riwayatServis(asetId: string): ServisAset[] {
  return servisAset
    .filter((s) => s.asetId === asetId)
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
}

/**
 * Perawatan berikutnya = servis terakhir (jenis apa pun) + interval, atau
 * tanggal beli + interval kalau belum pernah. Perbaikan ikut mereset: alat
 * yang baru dibongkar teknisi tidak perlu dirawat lagi bulan depannya.
 */
export function rawatBerikutnya(a: Aset): string | null {
  if (a.intervalRawatBulan === null) return null;
  const terakhir = riwayatServis(a.id)[0]?.tanggal ?? a.tanggalBeli;
  return tambahBulan(terakhir, a.intervalRawatBulan);
}

/** Batas "segera" — cukup waktu untuk menjadwalkan teknisi. */
const HARI_PERINGATAN_RAWAT = 14;

export interface PerluRawat {
  aset: Aset;
  tanggal: string;
  /** Negatif = sudah lewat. */
  selisihHari: number;
}

/** Aset yang jadwal perawatannya lewat atau ≤ 14 hari lagi, paling mendesak dulu. */
export function asetPerluRawat(): PerluRawat[] {
  return aset
    .filter((a) => !a.lepas)
    .flatMap((a) => {
      const tanggal = rawatBerikutnya(a);
      if (!tanggal) return [];
      const selisih = selisihHari(HARI_INI, tanggal);
      return selisih <= HARI_PERINGATAN_RAWAT ? [{ aset: a, tanggal, selisihHari: selisih }] : [];
    })
    .sort((a, b) => a.selisihHari - b.selisihHari);
}

/** Alokasi maintenance per aset yang sudah masuk dana (bulan yang sudah tutup). */
export function akumulasiMaintenanceAset(a: Aset): number {
  return bagiHasil(BULAN_BERJALAN)
    .filter((b) => b.final)
    .reduce((s, b) => s + alokasiMaintenanceAset(a, b.bulan), 0);
}

/**
 * Nominal 0 sah — perawatan yang dikerjakan sendiri. Di atas 0, biayanya
 * keluar dari dana maintenance dan tunduk pada aturan saldo tidak boleh minus.
 */
export function validasiServis(nominal: number): string | null {
  if (nominal < 0) return "Biaya servis tidak boleh negatif.";
  if (nominal === 0) return null;
  return validasiPemakaian("maintenance", nominal);
}

export function validasiAset(a: Aset): string | null {
  if (a.nama.trim() === "") return "Nama aset wajib diisi.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.tanggalBeli)) return "Tanggal beli wajib diisi.";
  if (!Number.isInteger(a.unit) || a.unit < 1) return "Jumlah unit minimal 1.";
  if (!(a.hargaSatuan > 0)) return "Harga beli harus lebih dari 0.";
  if (!(a.persenMaintenance >= 0 && a.persenMaintenance <= 100)) {
    return "Persen maintenance harus 0–100.";
  }
  if (!Number.isInteger(a.umurBulan) || a.umurBulan < 1) {
    return "Umur ekonomis minimal 1 bulan.";
  }
  if (
    a.intervalRawatBulan !== null &&
    (!Number.isInteger(a.intervalRawatBulan) || a.intervalRawatBulan < 1)
  ) {
    return "Interval perawatan minimal 1 bulan, atau kosongkan kalau tidak ada jadwal.";
  }
  return null;
}
