/**
 * Mengunci checklist angka di stitch-prompts.md bagian 6.
 *
 * Checklist itu ada karena di Stitch tiap layar menyalin rekapnya sendiri, dan
 * "kalau ada yang beda, salah satu layar mengarang" hanya bisa dicek manual
 * dengan mata. Di sini rekapnya diturunkan dari satu daftar order, jadi
 * checklist yang sama bisa dijalankan sebagai test — dan kalau nanti ada order
 * yang diedit untuk keperluan demo, yang jebol ketahuan langsung.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  HARI_INI,
  bookingHariIni,
  customers,
  daftarPiutang,
  jasaTerlaris,
  labaRugi,
  marginPerLini,
  omzetPeriode,
  orderDenganNo,
  orders,
  piutangLewatJatuhTempo,
  piutangPerLini,
  produkTerlaris,
  rasioDibayar,
  ringkasanCustomer,
  sisaTagihan,
  statusBayar,
  totalOrder,
  totalPiutang,
  umurPiutang,
  umurTagihan,
} from "./dummy.ts";
import { formatPersen } from "./format.ts";

const AGT = "2026-08";

test("omzet Agustus sama di semua layar yang memakainya", () => {
  assert.equal(omzetPeriode(AGT), 5_790_000);
  assert.equal(omzetPeriode(AGT, "retail"), 290_000);
  assert.equal(omzetPeriode(AGT, "studio"), 1_500_000);
  assert.equal(omzetPeriode(AGT, "event"), 4_000_000);
});

test("total per lini berjumlah persis sama dengan total omzet", () => {
  const perLini =
    omzetPeriode(AGT, "retail") +
    omzetPeriode(AGT, "studio") +
    omzetPeriode(AGT, "event");
  assert.equal(perLini, omzetPeriode(AGT));
});

test("piutang Rp 8.050.000 dari 4 order", () => {
  assert.equal(totalPiutang(), 8_050_000);
  assert.equal(daftarPiutang().length, 4);
});

test("order Batal tidak masuk piutang meski DP-nya belum menutup total", () => {
  const batal = orderDenganNo("ORD-0004");
  assert.ok(batal);
  assert.ok(sisaTagihan(batal) > 0);
  assert.ok(!daftarPiutang().some((o) => o.no === "ORD-0004"));
  // Tapi DP-nya tetap masuk omzet: kebijakan refund belum ada, DP hangus.
  assert.ok(omzetPeriode(AGT, "event") > 3_500_000);
});

test("laba rugi Agustus — rugi Rp 2.104.500", () => {
  const lr = labaRugi(AGT);
  assert.equal(lr.totalOmzet, 5_790_000);
  assert.equal(lr.hppBahan, 94_500);
  assert.equal(lr.biayaJob, 3_000_000);
  assert.equal(lr.totalBiayaLangsung, 3_094_500);
  assert.equal(lr.labaKotor, 2_695_500);
  assert.equal(formatPersen(lr.rasioLabaKotor), "47%");
  assert.equal(lr.totalOperasional, 4_800_000);
  assert.equal(lr.labaBersih, -2_104_500);
});

test("laba bersih konsisten dengan komponennya", () => {
  const lr = labaRugi(AGT);
  assert.equal(
    lr.labaBersih,
    lr.totalOmzet - lr.totalBiayaLangsung - lr.totalOperasional,
  );
});

test("margin per lini — Event omzet terbesar, margin tertipis", () => {
  const [retail, studio, event] = marginPerLini(AGT);

  assert.equal(retail.omzet, 290_000);
  assert.equal(retail.biayaLangsung, 94_500);
  assert.equal(retail.margin, 195_500);
  assert.equal(formatPersen(retail.rasioMargin), "67%");
  assert.equal(formatPersen(retail.share), "5%");

  assert.equal(studio.omzet, 1_500_000);
  assert.equal(studio.biayaLangsung, 200_000);
  assert.equal(studio.margin, 1_300_000);
  assert.equal(formatPersen(studio.rasioMargin), "87%");

  assert.equal(event.omzet, 4_000_000);
  assert.equal(event.biayaLangsung, 2_800_000);
  assert.equal(event.margin, 1_200_000);
  assert.equal(formatPersen(event.rasioMargin), "30%");
  assert.equal(formatPersen(event.share), "69%");

  // Ini temuan yang jadi alasan layar Margin per Lini ada: lini dengan omzet
  // terbesar justru marginnya paling tipis. Kalau dataset diedit sampai
  // kontras ini hilang, layarnya kehilangan maksudnya.
  assert.ok(event.share > retail.share);
  assert.ok(event.rasioMargin < retail.rasioMargin);
});

test("margin per lini berjumlah sama dengan laba kotor", () => {
  const lr = labaRugi(AGT);
  const total = marginPerLini(AGT).reduce((s, b) => s + b.margin, 0);
  assert.equal(total, lr.labaKotor);
});

test("status bayar diturunkan, tidak mungkin Lunas padahal kurang", () => {
  for (const o of orders) {
    const total = totalOrder(o);
    const status = statusBayar(o);
    if (status === "Lunas") assert.ok(sisaTagihan(o) <= 0, `${o.no} Lunas tapi kurang`);
    if (status === "Belum Bayar") assert.equal(o.payments.length, 0);
    if (status === "DP") assert.ok(sisaTagihan(o) > 0 && sisaTagihan(o) < total);
  }
});

test("badge DP membawa persentase yang benar", () => {
  const o = orderDenganNo("ORD-0012");
  assert.ok(o);
  assert.equal(statusBayar(o), "DP");
  assert.equal(formatPersen(rasioDibayar(o)), "43%");
});

test("jatuh tempo hari ini belum terhitung lewat", () => {
  const lewat = piutangLewatJatuhTempo();
  assert.equal(lewat.length, 1);
  assert.equal(lewat[0].no, "ORD-0008");
  assert.equal(lewat.reduce((s, o) => s + sisaTagihan(o), 0), 1_500_000);

  // ORD-0012 jatuh tempo tepat HARI_INI — harus 0, bukan negatif.
  const hariIni = orderDenganNo("ORD-0012");
  assert.ok(hariIni);
  assert.equal(umurTagihan(hariIni), 0);
});

test("kelompok umur piutang berjumlah sama dengan total piutang", () => {
  const belumJatuhTempo = daftarPiutang()
    .filter((o) => umurTagihan(o) >= 0)
    .reduce((s, o) => s + sisaTagihan(o), 0);
  const sudahLewat = piutangLewatJatuhTempo().reduce(
    (s, o) => s + sisaTagihan(o),
    0,
  );
  assert.equal(belumJatuhTempo, 6_550_000);
  assert.equal(sudahLewat, 1_500_000);
  assert.equal(belumJatuhTempo + sudahLewat, totalPiutang());
});

test("booking hari ini tidak mencampur walk-in retail yang sudah tuntas", () => {
  const b = bookingHariIni();
  assert.equal(b.length, 1);
  assert.equal(b[0].no, "ORD-0012");
  // ORD-0010 retail tanggal sama, sudah Diserahkan — tidak boleh ikut.
  assert.ok(orders.some((o) => o.no === "ORD-0010" && o.tanggal.startsWith(HARI_INI)));
});

test("produk terlaris — total cocok dengan omzet retail dan HPP bahan", () => {
  const p = produkTerlaris(AGT);
  const ambil = (nama: string) => p.find((x) => x.item.nama === nama)!;

  // Angka dari stitch-prompts.md bagian 3.
  assert.equal(ambil("Cetak 4R").qty, 15);
  assert.equal(ambil("Cetak 4R").omzet, 75_000);
  assert.equal(ambil("Cetak 4R").hpp, 22_500);
  assert.equal(ambil("Photostrip 3 Pose").qty, 4);
  assert.equal(ambil("Keychain Foto Akrilik").qty, 2);
  assert.equal(ambil("Cetak 10R + Bingkai").qty, 1);
  // Produk yang tidak laku tetap tampil — itu kandidat pertama dihentikan.
  assert.equal(ambil("Album Mini 20 Halaman").qty, 0);

  const totalQty = p.reduce((s, x) => s + x.qty, 0);
  const totalOmzet = p.reduce((s, x) => s + x.omzet, 0);
  const totalHpp = p.reduce((s, x) => s + x.hpp, 0);
  assert.equal(totalQty, 22);
  assert.equal(totalOmzet, 290_000);
  assert.equal(totalHpp, 94_500);

  // Harus cocok persis dengan omzet lini retail dan HPP di Laba Rugi.
  assert.equal(totalOmzet, omzetPeriode(AGT, "retail"));
  assert.equal(totalHpp, labaRugi(AGT).hppBahan);
});

test("jasa terlaris — order Batal tidak dihitung", () => {
  const j = jasaTerlaris();
  const ambil = (nama: string) => j.find((x) => x.item.nama === nama);

  assert.equal(ambil("Paket Wedding Full Day")!.nilai, 8_500_000);
  assert.equal(ambil("Paket Studio 1 Jam")!.order, 4);
  assert.equal(ambil("Paket Studio 1 Jam")!.nilai, 1_400_000);
  assert.equal(ambil("Paket Studio Keluarga 2 Jam")!.nilai, 650_000);
  // ORD-0004 (Prewedding) Batal, jadi Prewedding tinggal 1 order dari ORD-0008.
  assert.equal(ambil("Paket Prewedding Outdoor")!.order, 1);
  assert.equal(ambil("Paket Prewedding Outdoor")!.nilai, 2_500_000);
});

test("umur piutang — kelompok berjumlah sama dengan total piutang", () => {
  const u = umurPiutang();
  const ambil = (label: string) => u.find((x) => x.label === label)!;

  assert.equal(ambil("Belum jatuh tempo").nilai, 6_550_000);
  assert.equal(ambil("Belum jatuh tempo").order.length, 3);
  assert.equal(ambil("1–30 hari").nilai, 1_500_000);
  assert.equal(ambil("1–30 hari").order.length, 1);
  assert.equal(ambil("31–60 hari").nilai, 0);
  assert.equal(ambil("> 60 hari").nilai, 0);

  assert.equal(
    u.reduce((s, x) => s + x.nilai, 0),
    totalPiutang(),
  );
  // Setiap order piutang masuk tepat satu kelompok — tidak dobel, tidak hilang.
  assert.equal(
    u.reduce((s, x) => s + x.order.length, 0),
    daftarPiutang().length,
  );
});

test("piutang per lini — 93% menumpuk di Event", () => {
  const p = piutangPerLini();
  const event = p.find((x) => x.lini === "event")!;
  const studio = p.find((x) => x.lini === "studio")!;
  const retail = p.find((x) => x.lini === "retail")!;

  assert.equal(event.nilai, 7_500_000);
  assert.equal(studio.nilai, 550_000);
  assert.equal(retail.nilai, 0);
  assert.equal(formatPersen(event.share), "93%");
  assert.equal(formatPersen(studio.share), "7%");
  assert.equal(
    p.reduce((s, x) => s + x.nilai, 0),
    totalPiutang(),
  );
});

test("ringkasan customer — urut nilai order, cocok tabel 'customer teratas'", () => {
  const r = ringkasanCustomer();
  const ambil = (nama: string) => r.find((x) => x.customer.nama === nama)!;

  // Angka dari stitch-prompts.md bagian 3.
  assert.equal(ambil("Rani & Dimas").nilaiOrder, 8_500_000);
  assert.equal(ambil("Rani & Dimas").sudahDibayar, 2_500_000);
  assert.equal(ambil("Nadia Salsabila").nilaiOrder, 2_500_000);
  assert.equal(ambil("Budi Hartono").jumlahOrder, 2);
  assert.equal(ambil("Budi Hartono").nilaiOrder, 1_000_000);
  assert.equal(ambil("Sinta Prameswari").jumlahOrder, 2);
  assert.equal(ambil("Sinta Prameswari").nilaiOrder, 395_000);
  assert.equal(ambil("Dewi Anggraini").sudahDibayar, 0);

  // Urutan menurun berdasarkan nilai order.
  assert.equal(r[0].customer.nama, "Rani & Dimas");
});

test("order Batal tidak menaikkan nilai customer, tapi DP-nya tetap omzet", () => {
  const fajar = ringkasanCustomer().find(
    (x) => x.customer.nama === "Fajar Nugroho",
  )!;
  // ORD-0004 Batal — nilainya tidak dihitung.
  assert.equal(fajar.jumlahOrder, 0);
  assert.equal(fajar.nilaiOrder, 0);
  // Tapi ordernya tetap muncul di riwayat supaya tidak hilang dari jejak.
  assert.equal(fajar.order.length, 1);
  assert.equal(fajar.order[0].statusKerja, "Batal");
});

test("customer tanpa transaksi tetap muncul sebagai lead", () => {
  // Customer yang ditambahkan manual belum punya order. Kalau disaring di
  // `ringkasanCustomer`, dia langsung lenyap setelah disimpan dan tombol
  // Tambah Customer tampak tidak bekerja.
  const nama = ringkasanCustomer().map((r) => r.customer.nama);
  assert.ok(nama.includes("Umum"));
  assert.equal(new Set(nama).size, nama.length);
  // Seluruh customer di dataset ikut, termasuk yang ordernya cuma Batal.
  assert.equal(ringkasanCustomer().length, customers.length);
});

test("basis kas: DP diakui di bulan uang masuk, bukan bulan acara", () => {
  // ORD-0011 acaranya 18 Okt tapi DP-nya diterima 14 Agu. Di basis kas DP itu
  // omzet Agustus. Kalau nanti client memilih akrual, test ini yang jebol
  // pertama dan menandai layar mana yang harus diubah.
  const o = orderDenganNo("ORD-0011");
  assert.ok(o);
  assert.ok(o.tanggal.startsWith("2026-10"));
  assert.equal(o.payments[0].tanggal.startsWith(AGT), true);
  assert.equal(omzetPeriode("2026-10"), 0);
});
