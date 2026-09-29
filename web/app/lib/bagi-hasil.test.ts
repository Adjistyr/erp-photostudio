/**
 * Modal, pos dana & bagi hasil — business-flow bagian 8.
 *
 * File terpisah dari dummy.test.ts karena beberapa test di sini memutasi
 * dataset (menambah setoran, memakai dana) lalu mengembalikannya. `node --test`
 * menjalankan tiap file di proses sendiri, jadi mutasi di sini tidak bisa
 * bocor ke checklist angka stitch-prompts di dummy.test.ts.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  bagiHasil,
  bagiHasilBulan,
  hitungBagiHasil,
  labaRugi,
  mutasiPosDana,
  pemakaianDana,
  pengaturanBagiHasil,
  progresBalikModal,
  saldoPosDana,
  setoranOwner,
  sisaPinjamanPerSetoran,
  titikImpas,
  validasiPemakaian,
  validasiPengaturan,
  type PengaturanBagiHasil,
} from "./dummy.ts";

const ATURAN = {
  persenCadangan: 10,
  bagian: [
    { ownerId: "OWN-01", persen: 70 },
    { ownerId: "OWN-02", persen: 30 },
  ],
};

const nominalOwner = (h: ReturnType<typeof hitungBagiHasil>, ownerId: string) =>
  h.bagian.find((b) => b.ownerId === ownerId)!.nominal;

// ── Rumus (business-flow 8.5) ───────────────────────────────────────────────

test("laba tanpa rugi & pinjaman — angka contoh sheet client, terkoreksi", () => {
  const h = hitungBagiHasil(1_412_701, 0, [], ATURAN);
  assert.equal(h.potongan, 0);
  assert.equal(h.dibagi, 1_412_701);
  assert.equal(h.cadangan, 141_270);
  assert.equal(nominalOwner(h, "OWN-01"), 890_002);
  assert.equal(nominalOwner(h, "OWN-02"), 381_429);
});

test("bulan rugi — tidak ada bagi hasil, rugi diakumulasi", () => {
  const h = hitungBagiHasil(-2_000_000, 500_000, [], ATURAN);
  assert.equal(h.dibagi, 0);
  assert.equal(h.cadangan, 0);
  assert.ok(h.bagian.every((b) => b.nominal === 0));
  assert.equal(h.akumulasiRugi, 2_500_000);
});

test("rugi yang ditutup pinjaman TIDAK dipotong dua kali", () => {
  // Contoh di business-flow 8.5: rugi 2 jt, Agung setor 2 jt, bulan depan
  // laba 3 jt. Kalau kompensasi rugi dan pengembalian pinjaman dipotong
  // terpisah, 4 jt tertahan dan owner kehilangan 1 jt bagi hasil.
  const h = hitungBagiHasil(3_000_000, 2_000_000, [
    { setoranId: "S1", ownerId: "OWN-01", sisa: 2_000_000 },
  ], ATURAN);
  assert.equal(h.potongan, 2_000_000);
  assert.deepEqual(h.pelunasan, [
    { setoranId: "S1", ownerId: "OWN-01", nominal: 2_000_000 },
  ]);
  assert.equal(h.dibagi, 1_000_000);
  assert.equal(h.cadangan, 100_000);
  assert.equal(nominalOwner(h, "OWN-01"), 630_000);
  assert.equal(nominalOwner(h, "OWN-02"), 270_000);
  assert.equal(h.akumulasiRugi, 0);
  assert.equal(h.pinjaman[0].sisa, 0);
});

test("rugi tanpa pinjaman — potongan tetap di kas, tidak dibayar ke siapa pun", () => {
  const h = hitungBagiHasil(3_000_000, 2_000_000, [], ATURAN);
  assert.equal(h.potongan, 2_000_000);
  assert.deepEqual(h.pelunasan, []);
  assert.equal(h.dibagi, 1_000_000);
});

test("pinjaman tanpa rugi — dilunasi dulu sebelum dibagi", () => {
  const h = hitungBagiHasil(3_000_000, 0, [
    { setoranId: "S1", ownerId: "OWN-02", sisa: 1_000_000 },
  ], ATURAN);
  assert.equal(h.potongan, 1_000_000);
  assert.equal(h.pelunasan[0].nominal, 1_000_000);
  assert.equal(h.dibagi, 2_000_000);
});

test("laba lebih kecil dari potongan — pinjaman dilunasi urut tanggal setor", () => {
  const h = hitungBagiHasil(1_500_000, 2_000_000, [
    { setoranId: "S1", ownerId: "OWN-01", sisa: 1_500_000 },
    { setoranId: "S2", ownerId: "OWN-02", sisa: 1_000_000 },
  ], ATURAN);
  assert.equal(h.potongan, 1_500_000);
  assert.equal(h.dibagi, 0);
  assert.deepEqual(h.pelunasan, [
    { setoranId: "S1", ownerId: "OWN-01", nominal: 1_500_000 },
  ]);
  assert.equal(h.akumulasiRugi, 500_000);
  // S2 belum tersentuh — bulan berikutnya potongannya max(0,5 jt, 1 jt).
  assert.deepEqual(h.pinjaman.map((p) => p.sisa), [0, 1_000_000]);
});

test("pembulatan — semua bagian berjumlah persis sama dengan laba", () => {
  // Owner terakhir menerima sisa pembulatan. Kalau tiap bagian dibulatkan
  // sendiri-sendiri, totalnya bisa selisih Rp 1 dan tidak cocok dengan
  // laba bersih di laporan.
  for (const laba of [1, 7, 333_333, 1_271_431, 9_999_999]) {
    const h = hitungBagiHasil(laba, 0, [], {
      persenCadangan: 10,
      bagian: [
        { ownerId: "A", persen: 33 },
        { ownerId: "B", persen: 33 },
        { ownerId: "C", persen: 34 },
      ],
    });
    const total = h.cadangan + h.bagian.reduce((s, b) => s + b.nominal, 0);
    assert.equal(total, laba, `laba ${laba}`);
  }
});

test("input tidak dimutasi — hitungBagiHasil murni", () => {
  const pinjaman = [{ setoranId: "S1", ownerId: "OWN-01", sisa: 1_000_000 }];
  hitungBagiHasil(3_000_000, 0, pinjaman, ATURAN);
  assert.equal(pinjaman[0].sisa, 1_000_000);
});

// ── Dataset: Juli (saldo awal dari sheet) + Agustus ─────────────────────────

test("Juli dari saldo awal sheet — bagi hasil final", () => {
  const juli = bagiHasilBulan("2026-07")!;
  assert.equal(juli.dariSaldoAwal, true);
  assert.equal(juli.final, true);
  assert.equal(juli.labaBersih, 1_412_701);
  assert.equal(juli.cadangan, 141_270);
  assert.equal(juli.bagian.find((b) => b.ownerId === "OWN-01")!.nominal, 890_002);
  assert.equal(juli.bagian.find((b) => b.ownerId === "OWN-02")!.nominal, 381_429);
});

test("Agustus rugi — dibawa ke September, pinjaman Agung masih terbuka", () => {
  const agt = bagiHasilBulan("2026-08")!;
  assert.equal(agt.final, false);
  assert.equal(agt.labaBersih, labaRugi("2026-08").labaBersih);
  assert.equal(agt.labaBersih, -2_894_950);
  assert.equal(agt.dibagi, 0);
  assert.equal(agt.akumulasiRugi, 2_894_950);
  assert.equal(agt.sisaPinjaman, 2_000_000);
});

test("riwayat bagi hasil mulai dari aturan pertama, urut bulan", () => {
  assert.deepEqual(
    bagiHasil("2026-08").map((b) => b.bulan),
    ["2026-07", "2026-08"],
  );
});

test("laba rugi memotong alokasi maintenance sebelum laba bersih", () => {
  const lr = labaRugi("2026-08");
  assert.equal(lr.alokasiMaintenance, 790_450);
  assert.equal(
    lr.labaBersih,
    lr.labaKotor - lr.totalOperasional - lr.alokasiMaintenance,
  );
});

test("bulan sebelum ada aset — tidak ada alokasi maintenance", () => {
  assert.equal(labaRugi("2026-06").alokasiMaintenance, 0);
});

// ── Pos dana (business-flow 8.2) ────────────────────────────────────────────

test("saldo pos dana hanya dari bulan yang sudah tutup", () => {
  // Juli: alokasi maintenance 790.450, cadangan 10% laba Juli 141.270.
  // Agustus belum tutup, jadi alokasinya belum masuk. Servis lighting
  // 150.000 dipakai dari dana maintenance.
  assert.equal(saldoPosDana("maintenance"), 640_450);
  assert.equal(saldoPosDana("cadangan"), 141_270);
});

test("mutasi pos dana — saldo berjalan cocok dengan saldo akhir", () => {
  const m = mutasiPosDana("maintenance");
  assert.deepEqual(
    m.map((x) => [x.tanggal, x.jenis, x.masuk, x.keluar, x.saldo]),
    [
      ["2026-07-31", "Alokasi", 790_450, 0, 790_450],
      ["2026-08-10", "Pemakaian", 0, 150_000, 640_450],
    ],
  );
});

test("pemakaian melebihi saldo ditolak", () => {
  assert.equal(validasiPemakaian("cadangan", 141_270), null);
  assert.match(validasiPemakaian("cadangan", 141_271) ?? "", /setoran owner/);
  assert.match(validasiPemakaian("cadangan", 0) ?? "", /lebih dari 0/);
});

test("pinjaman ke pos dana dikembalikan dari alokasi berikutnya", () => {
  const panjang = setoranOwner.length;
  const panjangPakai = pemakaianDana.length;
  try {
    // Cadangan kosong di awal Juli, beli mendesak 300 rb ditalangi Raka.
    setoranOwner.push({
      id: "T-1", tanggal: "2026-07-20", ownerId: "OWN-02", nominal: 300_000,
      jenis: "pinjaman", tujuan: "cadangan", keterangan: "Talangan",
    });
    pemakaianDana.push({
      id: "T-2", tanggal: "2026-07-20", pos: "cadangan", nominal: 300_000,
      keterangan: "Ganti baterai kamera",
    });
    const m = mutasiPosDana("cadangan");
    assert.deepEqual(
      m.map((x) => [x.jenis, x.masuk, x.keluar, x.saldo]),
      [
        ["Pinjaman owner", 300_000, 0, 300_000],
        ["Pemakaian", 0, 300_000, 0],
        ["Alokasi", 141_270, 0, 141_270],
        // Alokasi Juli 141.270 < pinjaman 300.000 — seluruhnya untuk Raka.
        ["Pengembalian pinjaman", 0, 141_270, 0],
      ],
    );
    assert.equal(sisaPinjamanPerSetoran().get("T-1"), 158_730);
  } finally {
    setoranOwner.length = panjang;
    pemakaianDana.length = panjangPakai;
  }
});

// ── Setoran, rasio, balik modal ─────────────────────────────────────────────

test("sisa pinjaman per setoran — modal tidak punya sisa", () => {
  const sisa = sisaPinjamanPerSetoran();
  assert.equal(sisa.get("STR-02"), 2_000_000);
  assert.equal(sisa.has("STR-01"), false);
});

test("progres balik modal — hanya owner yang pernah setor modal", () => {
  const p = progresBalikModal();
  assert.equal(p.length, 1);
  assert.equal(p[0].owner.nama, "Agung");
  assert.equal(p[0].modal, 15_809_000);
  // Hak bagi hasil dari bulan yang sudah tutup saja (Juli).
  assert.equal(p[0].hakBagiHasil, 890_002);
});

test("progres balik modal kosong kalau modal awal belum diisi", () => {
  // business-flow 8.7: widget disembunyikan, bukan tampil 0%.
  const simpan = [...setoranOwner];
  try {
    setoranOwner.splice(0, setoranOwner.length, ...simpan.filter((s) => s.jenis !== "modal"));
    assert.deepEqual(progresBalikModal(), []);
  } finally {
    setoranOwner.splice(0, setoranOwner.length, ...simpan);
  }
});

const aturanBaru = (patch: Partial<PengaturanBagiHasil>): PengaturanBagiHasil => ({
  berlakuMulai: "2026-09",
  persenCadangan: 10,
  bagian: [
    { ownerId: "OWN-01", persen: 60 },
    { ownerId: "OWN-02", persen: 40 },
  ],
  ...patch,
});

test("rasio baru valid mulai bulan berjalan atau sesudahnya", () => {
  assert.equal(validasiPengaturan(aturanBaru({})), null);
  assert.equal(validasiPengaturan(aturanBaru({ berlakuMulai: "2026-08" })), null);
});

test("rasio tidak boleh berlaku mundur ke bulan yang sudah tutup", () => {
  assert.match(
    validasiPengaturan(aturanBaru({ berlakuMulai: "2026-07" })) ?? "",
    /sudah tutup/,
  );
});

test("rasio harus berjumlah 100%", () => {
  const salah = aturanBaru({
    bagian: [
      { ownerId: "OWN-01", persen: 70 },
      { ownerId: "OWN-02", persen: 20 },
    ],
  });
  assert.match(validasiPengaturan(salah) ?? "", /100%/);
});

test("persen negatif / cadangan di luar 0–100 ditolak", () => {
  assert.ok(validasiPengaturan(aturanBaru({ persenCadangan: 101 })));
  assert.ok(
    validasiPengaturan(
      aturanBaru({
        bagian: [
          { ownerId: "OWN-01", persen: 110 },
          { ownerId: "OWN-02", persen: -10 },
        ],
      }),
    ),
  );
});

test("rasio lama tidak ikut berubah saat rasio baru ditambahkan", () => {
  const panjang = pengaturanBagiHasil.length;
  try {
    pengaturanBagiHasil.push(aturanBaru({}));
    // Juli tetap 70/30 walaupun sekarang ada aturan 60/40 mulai September.
    const juli = bagiHasilBulan("2026-07")!;
    assert.equal(juli.bagian.find((b) => b.ownerId === "OWN-01")!.persen, 70);
  } finally {
    pengaturanBagiHasil.length = panjang;
  }
});

// ── Titik impas (Dashboard) ─────────────────────────────────────────────────

test("titik impas Agustus — laba kotor baru menutup 48% biaya tetap", () => {
  const t = titikImpas("2026-08");
  assert.equal(t.biayaTetap, 4_800_000 + 790_450);
  assert.equal(t.labaKotor, 2_695_500);
  assert.equal(t.kurang, 2_894_950);
  assert.equal(Math.round(t.rasio * 100), 48);
});
