/**
 * Jalankan: npm test   (node --test, tanpa framework tambahan)
 *
 * Cakupannya sengaja sempit: cuma `format.ts`. Ini mockup, jadi layar dan
 * komponen tidak dites — tapi format uang & tanggal dites karena angkanya yang
 * dicocokkan owner ke mutasi rekening, dan karena parsing tanggal punya bug
 * pergeseran-sehari yang tidak kelihatan sampai dibuka di timezone lain.
 */
import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
    formatPersen,
    formatRentangTanggal,
    formatRp,
    formatRpSumbu,
    formatTanggal,
    keNomorWa,
    namaDepan,
    personalise,
    formatJadwal,
    formatTanggalJam,
    formatUmurPiutang,
    formatBulan,
    kelasRp,
    selisihHari,
    tambahBulan,
    hanyaDigit,
} from './format';

test('formatRp — titik ribuan, tanpa desimal', () => {
    assert.equal(formatRp(1250000), 'Rp 1.250.000');
    assert.equal(formatRp(5790000), 'Rp 5.790.000');
    assert.equal(formatRp(8000), 'Rp 8.000');
});

test('formatRp — negatif pakai U+2212 MINUS SIGN, bukan hyphen', () => {
    assert.equal(formatRp(-2104500), '−Rp 2.104.500');
    // Hyphen-minus yang gampang kepakai tanpa sadar harus TIDAK muncul.
    assert.ok(!formatRp(-250000).includes('-'));
});

test("formatRp — nol tetap 'Rp 0', tidak jadi kosong atau '-'", () => {
    assert.equal(formatRp(0), 'Rp 0');
    assert.equal(kelasRp(0), 'text-muted-foreground');
    assert.equal(kelasRp(-1), 'text-destructive');
    assert.equal(kelasRp(1), '');
});

test('formatRpSumbu — hanya untuk sumbu chart', () => {
    assert.equal(formatRpSumbu(1250000), '1,3jt');
    assert.equal(formatRpSumbu(8500000), '8,5jt');
    assert.equal(formatRpSumbu(290000), '290rb');
    assert.equal(formatRpSumbu(0), '0');
});

test('formatPersen — rasio dibulatkan, tanpa desimal', () => {
    // DP ORD-0012: 150.000 / 350.000 = 42,857% → dataset menulis "DP 43%".
    assert.equal(formatPersen(150000 / 350000), '43%');
    assert.equal(formatPersen(2500000 / 8500000), '29%');
    assert.equal(formatPersen(0), '0%');
    assert.equal(formatPersen(1), '100%');
});

test("hanyaDigit — titik ribuan, 'Rp', dan spasi dibuang", () => {
    assert.equal(hanyaDigit('1.500.000'), '1500000');
    assert.equal(hanyaDigit('Rp 250.000'), '250000');
    assert.equal(hanyaDigit(''), '');
    // Minus ikut dibuang — nominal di form tidak pernah negatif.
    assert.equal(hanyaDigit('-5000'), '5000');
});

test('tambahBulan — tanggal sama di bulan berikutnya', () => {
    assert.equal(tambahBulan('2026-07-01', 1), '2026-08-01');
    assert.equal(tambahBulan('2026-08-10', 12), '2027-08-10');
    assert.equal(tambahBulan('2026-12-15', 1), '2027-01-15');
});

test('tambahBulan — tanggal 31 dijepit ke akhir bulan, bukan meluber', () => {
    // `Date#setMonth` membuat 31 Jan + 1 bulan jadi 3 Mar. Jadwal servis
    // yang melompati satu bulan penuh tidak akan kelihatan salah sampai telat.
    assert.equal(tambahBulan('2026-01-31', 1), '2026-02-28');
    assert.equal(tambahBulan('2028-01-31', 1), '2028-02-29');
    assert.equal(tambahBulan('2026-03-31', 1), '2026-04-30');
});

test("formatBulan — 'YYYY-MM' jadi nama bulan Indonesia", () => {
    assert.equal(formatBulan('2026-07'), 'Juli 2026');
    assert.equal(formatBulan('2026-12'), 'Desember 2026');
});

test('formatBulan — tanggal lengkap & string yang cuma MEMUAT pola ditolak', () => {
    assert.equal(formatBulan('2026-07-01'), '—');
    assert.equal(formatBulan('ORD-2026-07'), '—');
    assert.equal(formatBulan('2026-7'), '—');
    assert.equal(formatBulan(''), '—');
});

test("formatTanggal — 'D Mmm YYYY' bahasa Indonesia", () => {
    assert.equal(formatTanggal('2026-08-26'), '26 Agu 2026');
    assert.equal(formatTanggal('2026-10-18'), '18 Okt 2026');
    assert.equal(formatTanggal('2026-05-01'), '1 Mei 2026');
    assert.equal(formatTanggalJam('2026-08-26T14:00'), '26 Agu 2026, 14:00');
});

test('tanggal kalender tidak bergeser sehari di timezone manapun', () => {
    // `new Date("2026-08-26")` diparse sebagai UTC midnight, jadi di UTC-5
    // tanggal lokalnya jadi 25 Agu. Ini yang harus TIDAK terjadi.
    assert.equal(formatTanggal('2026-08-26'), '26 Agu 2026');
    assert.equal(formatTanggal('2026-01-01'), '1 Jan 2026');
});

test('string yang cuma MEMUAT pola tanggal tidak diparse sebagai tanggal', () => {
    // ID order kebetulan memuat "2026-08-26" sebagai substring. Parser fallback
    // V8 menerima "ORD-2026-08-26" dan mengembalikan 26 Agu 2026 — tanggal
    // valid yang salah. Harus jadi placeholder, bukan tanggal.
    assert.equal(formatTanggal('ORD-2026-08-26'), '—');
    assert.equal(formatTanggal('Invoice 2026-08-26'), '—');
    assert.equal(formatTanggal('26/08/2026'), '—');
    // Dan tidak boleh throw — satu sel rusak tidak menjatuhkan halaman.
    assert.doesNotThrow(() => formatTanggalJam('bukan tanggal'));
});

test('suffix timezone diperlakukan sebagai instant, bukan waktu lokal', () => {
    // "Z" dan "+07:00" menandai instant UTC. Harus jatuh ke `new Date()`,
    // bukan jalur manual — kalau tidak, jamnya salah sebesar offset lokal.
    assert.equal(
        formatTanggalJam('2026-08-26T14:00Z'),
        formatTanggalJam(new Date('2026-08-26T14:00Z')),
    );
    assert.equal(
        formatTanggalJam('2026-08-26T14:00+07:00'),
        formatTanggalJam(new Date('2026-08-26T14:00+07:00')),
    );
});

test('formatJadwal — jam hanya muncul kalau sumbernya punya jam', () => {
    assert.equal(formatJadwal('2026-08-26T14:00'), '26 Agu 2026, 14:00');
    // Order retail tidak terjadwal — tidak boleh mengarang "00:00".
    assert.equal(formatJadwal('2026-08-26'), '26 Agu 2026');
    assert.ok(!formatJadwal('2026-08-26').includes('00:00'));
    // String ber-jam yang bukan tanggal tidak boleh dianggap punya jadwal.
    assert.equal(formatJadwal('ORD-0012 14:00'), '—');
    assert.equal(formatJadwal('catatan 2026-08-26T14:00'), '—');
});

test('keNomorWa — 0 di awal jadi 62, nol di tengah tidak tersentuh', () => {
    assert.equal(keNomorWa('0812-3344-5566'), '6281233445566');
    assert.equal(keNomorWa('0896 1122 8899'), '6289611228899');
    // Nol di tengah HARUS selamat — ini yang jebol kalau anchor `^` dilepas.
    assert.equal(keNomorWa('0812-0812-0812'), '6281208120812');
    // Sudah E.164, jangan diprefiks dobel.
    assert.equal(keNomorWa('6281233445566'), '6281233445566');
    assert.equal(keNomorWa('+62 812 3344 5566'), '6281233445566');
    // Nomor rumah dengan kurung juga bersih.
    assert.equal(keNomorWa('(0274) 123456'), '62274123456');
});

test('formatRentangTanggal — bagian yang sama tidak diulang', () => {
    assert.equal(
        formatRentangTanggal('2026-09-12', '2026-09-14'),
        '12–14 Sep 2026',
    );
    assert.equal(
        formatRentangTanggal('2026-08-28', '2026-09-02'),
        '28 Agu–2 Sep 2026',
    );
    assert.equal(
        formatRentangTanggal('2026-12-28', '2027-01-02'),
        '28 Des 2026–2 Jan 2027',
    );
});

test('formatUmurPiutang — jatuh tempo hari ini belum terhitung lewat', () => {
    // Angka dari stitch-prompts.md bagian 3: kalau hari-ini dihitung "lewat",
    // kartu "Lewat Jatuh Tempo" di layar Piutang tidak lagi sama dengan
    // kelompok umur "1–30 hari".
    assert.equal(formatUmurPiutang(0), 'jatuh tempo hari ini');
    assert.equal(formatUmurPiutang(53), '53 hari lagi');
    assert.equal(formatUmurPiutang(-14), 'lewat 14 hari');
});

test('selisihHari — abaikan jam, hitung hari kalender', () => {
    // ORD-0011 jatuh tempo 18 Okt 2026, hari ini 26 Agu 2026 → 53 hari.
    assert.equal(selisihHari('2026-08-26', '2026-10-18'), 53);
    assert.equal(selisihHari('2026-08-26', '2026-08-12'), -14);
    assert.equal(selisihHari('2026-08-26T23:59', '2026-08-26T00:01'), 0);
});

test('personalise — ganti semua placeholder, biarkan yang tak dikenal', () => {
    assert.equal(
        personalise('Halo {nama}, {sisa} ({sisa}) {asing}', {
            nama: 'Budi',
            sisa: 'Rp 1',
        }),
        'Halo Budi, Rp 1 (Rp 1) {asing}',
    );
    // Kata tanpa kurung tidak tersentuh; spasi di dalam kurung bukan placeholder.
    assert.equal(
        personalise('atas nama { nama }', { nama: 'X' }),
        'atas nama { nama }',
    );
    // Properti prototype objek bukan nilai placeholder.
    assert.equal(personalise('{constructor}', {}), '{constructor}');
});

test('namaDepan — kata pertama; kosong/null jadi "Kak"', () => {
    assert.equal(namaDepan('Budi Santoso'), 'Budi');
    assert.equal(namaDepan('  Sari  '), 'Sari');
    assert.equal(namaDepan(''), 'Kak');
    assert.equal(namaDepan(null), 'Kak');
});
