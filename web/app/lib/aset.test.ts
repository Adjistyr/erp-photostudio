/**
 * Aset & maintenance — business-flow bagian 8.9.
 *
 * File terpisah karena beberapa test memutasi dataset (tambah aset, lepas
 * aset, catat servis) lalu mengembalikannya. `node --test` menjalankan tiap
 * file di proses sendiri, jadi mutasi di sini tidak bocor ke file lain.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  alokasiMaintenanceAset,
  alokasiMaintenanceBulan,
  aset,
  asetPerluRawat,
  investasi,
  labaRugi,
  mutasiPosDana,
  nilaiBuku,
  rawatBerikutnya,
  saldoPosDana,
  servisAset,
  validasiAset,
  validasiServis,
  type Aset,
} from "./dummy.ts";

const cari = (id: string) => aset.find((a) => a.id === id)!;

/** Jalankan `fn` dengan satu aset diubah sementara, lalu kembalikan. */
function denganAset(id: string, patch: Partial<Aset>, fn: () => void) {
  const i = aset.findIndex((a) => a.id === id);
  const asli = aset[i];
  aset[i] = { ...asli, ...patch };
  try {
    fn();
  } finally {
    aset[i] = asli;
  }
}

// ── Alokasi maintenance otomatis ────────────────────────────────────────────

test("alokasi maintenance dihitung dari daftar aset — Rp 790.450", () => {
  assert.equal(alokasiMaintenanceBulan("2026-07"), 790_450);
  assert.equal(alokasiMaintenanceBulan("2026-08"), 790_450);
  assert.equal(labaRugi("2026-08").alokasiMaintenance, 790_450);
});

test("jumlah unit ikut dikali — bug Rp 97.350 di sheet tidak bisa terulang", () => {
  // Sheet client menjumlah harga × 5% tanpa mengalikan unit, hasilnya
  // Rp 693.100. Di sini unit adalah bagian dari rumus, bukan langkah manual.
  const tanpaUnit = aset.reduce(
    (s, a) => s + Math.round((a.hargaSatuan * a.persenMaintenance) / 100),
    0,
  );
  assert.equal(tanpaUnit, 693_100);
  assert.equal(alokasiMaintenanceBulan("2026-08") - tanpaUnit, 97_350);
  // Baterai 2 unit × Rp 120.000 × 5%.
  assert.equal(alokasiMaintenanceAset(cari("AST-02"), "2026-08"), 12_000);
});

test("bulan sebelum aset dibeli — alokasi 0", () => {
  assert.equal(alokasiMaintenanceBulan("2026-06"), 0);
});

test("aset baru tidak mengubah alokasi bulan lalu", () => {
  const panjang = aset.length;
  try {
    aset.push({
      id: "T-1", nama: "Lensa 50mm", kategori: "Lensa", catatan: "",
      unit: 1, hargaSatuan: 2_000_000, tanggalBeli: "2026-09-05",
      persenMaintenance: 5, umurBulan: 48, intervalRawatBulan: 12,
      status: "aktif", lepas: null, investasiId: null,
    });
    assert.equal(alokasiMaintenanceBulan("2026-08"), 790_450);
    assert.equal(alokasiMaintenanceBulan("2026-09"), 790_450 + 100_000);
  } finally {
    aset.length = panjang;
  }
});

test("aset dilepas — berhenti dialokasikan, hasil jual masuk dana maintenance", () => {
  const saldoAwal = saldoPosDana("maintenance");
  denganAset(
    "AST-05",
    { status: "dilepas", lepas: { tanggal: "2026-08-20", alasan: "Dijual", hargaJual: 1_500_000 } },
    () => {
      // Lighting 2 × 1.350.000 × 5% = 135.000 hilang dari alokasi Agustus
      // karena di akhir Agustus sudah tidak dimiliki.
      assert.equal(alokasiMaintenanceBulan("2026-08"), 790_450 - 135_000);
      // Juli masih dimiliki — tidak berubah.
      assert.equal(alokasiMaintenanceBulan("2026-07"), 790_450);
      const jual = mutasiPosDana("maintenance").find((m) => m.jenis === "Hasil jual aset");
      assert.ok(jual);
      assert.equal(jual.tanggal, "2026-08-20");
      assert.equal(jual.masuk, 1_500_000);
      assert.equal(saldoPosDana("maintenance"), saldoAwal + 1_500_000);
    },
  );
});

test("aset rusak tetap dialokasikan — masih dimiliki, justru butuh dana servis", () => {
  denganAset("AST-05", { status: "rusak" }, () => {
    assert.equal(alokasiMaintenanceBulan("2026-08"), 790_450);
  });
});

// ── Nilai buku ──────────────────────────────────────────────────────────────

test("nilai buku garis lurus — dihitung per bulan kepemilikan", () => {
  // Dibeli Juli, sekarang Agustus = 2 bulan terpakai.
  assert.equal(nilaiBuku(cari("AST-01")), 6_708_333); // 7.000.000 × 46/48
  assert.equal(nilaiBuku(cari("AST-06")), 4_108_333); // 4.350.000 × 34/36
});

test("nilai buku tidak pernah negatif, dan 0 untuk aset yang dilepas", () => {
  denganAset("AST-01", { umurBulan: 1 }, () => {
    assert.equal(nilaiBuku(cari("AST-01")), 0);
  });
  denganAset(
    "AST-01",
    { status: "dilepas", lepas: { tanggal: "2026-08-01", alasan: "Hilang", hargaJual: 0 } },
    () => {
      assert.equal(nilaiBuku(cari("AST-01")), 0);
    },
  );
});

// ── Jadwal perawatan ────────────────────────────────────────────────────────

test("perawatan berikutnya = servis terakhir (atau tanggal beli) + interval", () => {
  // Printer: interval 1 bulan, belum pernah dirawat → dari tanggal beli.
  assert.equal(rawatBerikutnya(cari("AST-06")), "2026-08-01");
  // Lighting: interval 12 bulan, terakhir diservis 10 Agu.
  assert.equal(rawatBerikutnya(cari("AST-05")), "2027-08-10");
  // Baterai tidak punya jadwal.
  assert.equal(rawatBerikutnya(cari("AST-02")), null);
});

test("aset perlu dirawat — hanya yang lewat atau ≤ 14 hari lagi", () => {
  const p = asetPerluRawat();
  assert.deepEqual(p.map((x) => x.aset.id), ["AST-06"]);
  assert.equal(p[0].selisihHari, -25);
});

test("perawatan rutin mereset jadwal, walaupun gratis", () => {
  const panjang = servisAset.length;
  const barisDana = mutasiPosDana("maintenance").length;
  try {
    servisAset.push({
      id: "T-S", asetId: "AST-06", tanggal: "2026-08-26", jenis: "rutin",
      keterangan: "Head cleaning", nominal: 0,
    });
    assert.equal(rawatBerikutnya(cari("AST-06")), "2026-09-26");
    assert.deepEqual(asetPerluRawat(), []);
    // Rp 0 tidak menggerakkan dana — tidak ada baris baru di mutasi.
    assert.equal(mutasiPosDana("maintenance").length, barisDana);
  } finally {
    servisAset.length = panjang;
  }
});

test("aset dilepas tidak ikut daftar perlu dirawat", () => {
  denganAset(
    "AST-06",
    { status: "dilepas", lepas: { tanggal: "2026-08-20", alasan: "Dijual", hargaJual: 0 } },
    () => {
      assert.deepEqual(asetPerluRawat(), []);
    },
  );
});

// ── Validasi & konsistensi ──────────────────────────────────────────────────

test("biaya servis dibayar dari dana maintenance — tidak boleh melebihi saldo", () => {
  assert.equal(validasiServis(0), null);
  assert.equal(validasiServis(640_450), null);
  assert.match(validasiServis(640_451) ?? "", /setoran owner/);
  assert.match(validasiServis(-1) ?? "", /negatif/);
});

const asetBaru = (patch: Partial<Aset>): Aset => ({
  id: "X", nama: "Lensa 50mm", kategori: "Lensa", catatan: "",
  unit: 1, hargaSatuan: 2_000_000, tanggalBeli: "2026-08-26",
  persenMaintenance: 5, umurBulan: 48, intervalRawatBulan: 12,
  status: "aktif", lepas: null, investasiId: null,
  ...patch,
});

test("validasi aset — isian wajib dan batas angka", () => {
  assert.equal(validasiAset(asetBaru({})), null);
  assert.equal(validasiAset(asetBaru({ intervalRawatBulan: null })), null);
  assert.match(validasiAset(asetBaru({ nama: "  " })) ?? "", /Nama/);
  assert.ok(validasiAset(asetBaru({ unit: 0 })));
  assert.ok(validasiAset(asetBaru({ hargaSatuan: 0 })));
  assert.ok(validasiAset(asetBaru({ persenMaintenance: 101 })));
  assert.ok(validasiAset(asetBaru({ umurBulan: 0 })));
  assert.ok(validasiAset(asetBaru({ intervalRawatBulan: 0 })));
});

test("investasi modal awal = total harga aset yang dibelinya", () => {
  const inv = investasi.find((i) => i.id === "INV-01")!;
  const total = aset
    .filter((a) => a.investasiId === "INV-01")
    .reduce((s, a) => s + a.hargaSatuan * a.unit, 0);
  assert.equal(total, inv.nominal);
});
