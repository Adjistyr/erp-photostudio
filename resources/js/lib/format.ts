/**
 * Format angka, uang, dan tanggal — DESIGN.md R5 (blocker).
 *
 * Semua angka di UI wajib lewat sini. Alasannya bukan kerapian: owner
 * mencocokkan nominal di layar dengan mutasi rekening, jadi satu layar yang
 * memformat sendiri dan menghasilkan "Rp 1,250,000" atau "26/08/2026" bikin
 * pencocokan gagal dan kepercayaan ke app hilang (business-flow bagian 1).
 */

/** U+2212 MINUS SIGN, bukan hyphen-minus. R5 minta "−Rp 250.000". */
const MINUS = '−';
/** U+2013 EN DASH untuk rentang tanggal: "12–14 Sep 2026". */
const EN_DASH = '–';

const ribuan = new Intl.NumberFormat('id-ID');

/**
 * Parse "YYYY-MM-DD" dan "YYYY-MM-DDTHH:mm" sebagai waktu LOKAL.
 *
 * `new Date("2026-08-26")` diparse sebagai UTC midnight oleh spec, jadi di
 * timezone negatif tanggalnya bergeser jadi 25 Agu. Untuk app yang seluruh
 * datanya tanggal kalender (bukan instant), pergeseran itu murni bug.
 * Dipecah manual, bukan pakai library: satu fungsi ini menggantikan
 * date-fns/dayjs untuk kebutuhan mockup.
 */
function keDate(nilai: string | Date): Date {
    if (nilai instanceof Date) return nilai;
    // Diikat `^`...`$`, bukan cari substring. Ada tiga bentuk input, dan
    // ketiganya harus diperlakukan beda:
    //
    //   (a) "2026-08-26" / "2026-08-26T14:00"  → tanggal kalender, waktu LOKAL
    //   (b) "2026-08-26T14:00Z" / "...+07:00"  → instant, serahkan ke new Date()
    //   (c) "ORD-2026-08-26" / "26/08/2026"    → Invalid Date
    //
    // (c) TIDAK boleh jatuh ke `new Date()`: parser fallback V8 permisif dan
    // "ORD-2026-08-26" diparse jadi 26 Agu 2026 — tanggal valid yang salah.
    // Di app yang angkanya dicocokkan ke mutasi rekening, tanggal salah tapi
    // masuk akal jauh lebih berbahaya daripada teks rusak yang langsung
    // kelihatan. Jadi yang tidak cocok pola dibiarkan gagal terang-terangan.
    const cocok = nilai.match(
        /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::\d{2})?(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/,
    );
    if (!cocok) return new Date(NaN);
    const [, th, bl, tg, jj, mm, tz] = cocok;
    if (tz) return new Date(nilai);
    return new Date(+th, +bl - 1, +tg, jj ? +jj : 0, mm ? +mm : 0);
}

/** "Rp 1.250.000" · "−Rp 250.000" · "Rp 0" */
export function formatRp(nominal: number): string {
    const bulat = Math.round(nominal);
    const tanda = bulat < 0 ? MINUS : '';
    return `${tanda}Rp ${ribuan.format(Math.abs(bulat))}`;
}

/**
 * Kelas warna untuk nominal — R5 mewajibkan negatif `--destructive` dan nol
 * `--muted-foreground`. Ditaruh sebelahan dengan formatternya supaya angka
 * dan warnanya tidak bisa lepas satu sama lain di layar yang berbeda.
 */
export function kelasRp(nominal: number): string {
    if (nominal < 0) return 'text-destructive';
    if (nominal === 0) return 'text-muted-foreground';
    return '';
}

/**
 * Nominal disingkat — HANYA untuk label sumbu chart (R5). Jangan dipakai di
 * tabel atau detail: di sana owner butuh angka persis.
 */
export function formatRpSumbu(nominal: number): string {
    const abs = Math.abs(nominal);
    const tanda = nominal < 0 ? MINUS : '';
    if (abs >= 1_000_000) {
        const jt = abs / 1_000_000;
        return `${tanda}${ribuan.format(Math.round(jt * 10) / 10)}jt`;
    }
    if (abs >= 1_000) return `${tanda}${Math.round(abs / 1_000)}rb`;
    return `${tanda}${abs}`;
}

/**
 * Nomor HP → format E.164 tanpa `+`, seperti yang dibutuhkan tautan `wa.me`.
 *
 * Ditaruh di sini, bukan di layar yang memakainya: dipakai layar Komunikasi
 * dan Customer, dan kalau dua tempat mengubah nomor dengan cara sedikit
 * berbeda, salah satunya akan membuka chat WhatsApp ke nomor yang salah —
 * gagal yang tidak kelihatan sampai ada customer mengeluh.
 *
 * `^0` diikat ke awal string: nol di awal adalah prefiks trunk nasional dan
 * harus jadi kode negara. Tanpa anchor, "08120812" akan rusak karena nol di
 * tengahnya ikut diganti.
 */
export function keNomorWa(hp: string): string {
    const digit = hp.replace(/\D/g, '');
    if (digit.startsWith('62')) return digit;
    return digit.replace(/^0/, '62');
}

/**
 * Isian nominal → hanya digit. Rupiah di app ini selalu integer (R5), jadi
 * "1.500.000" yang di-paste dari mutasi rekening harus jadi "1500000", bukan
 * ditolak atau dibaca 1,5.
 */
export function hanyaDigit(v: string): string {
    return v.replace(/\D/g, '');
}

/** Rasio 0..1 → "43%". Bulat, tanpa desimal (R5). */
export function formatPersen(rasio: number): string {
    return `${Math.round(rasio * 100)}%`;
}

/**
 * Placeholder untuk tanggal yang tidak bisa diparse.
 *
 * Sengaja tidak throw: `Intl.DateTimeFormat.format(Invalid Date)` melempar
 * RangeError, dan satu tanggal rusak di satu sel akan menjatuhkan seluruh
 * halaman lewat error boundary React. Untuk layar presentasi itu lebih buruk
 * daripada bug datanya sendiri. Em dash sudah dipakai di tabel untuk sel yang
 * tidak berlaku, jadi tidak memperkenalkan notasi baru.
 */
const TAK_VALID = '—';

/** "26 Agu 2026" · "—" kalau input bukan tanggal */
export function formatTanggal(nilai: string | Date): string {
    const d = keDate(nilai);
    if (Number.isNaN(d.getTime())) return TAK_VALID;
    return `${d.getDate()} ${bulanPendek(d)} ${d.getFullYear()}`;
}

/**
 * "2026-07" → "Juli 2026" · "—" kalau bukan bentuk "YYYY-MM".
 *
 * Diikat `^`...`$` dengan alasan yang sama seperti `keDate`: "2026-07-01"
 * (tanggal, bukan bulan) dan "ORD-2026-07" tidak boleh lolos jadi nama bulan.
 */
export function formatBulan(bulan: string): string {
    const cocok = bulan.match(/^(\d{4})-(\d{2})$/);
    if (!cocok) return TAK_VALID;
    const d = new Date(+cocok[1], +cocok[2] - 1, 1);
    return new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
    }).format(d);
}

/** "26 Agu 2026, 14:00" · "—" kalau input bukan tanggal */
export function formatTanggalJam(nilai: string | Date): string {
    const d = keDate(nilai);
    if (Number.isNaN(d.getTime())) return TAK_VALID;
    const jj = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${formatTanggal(d)}, ${jj}:${mm}`;
}

/**
 * Tampilkan jam HANYA kalau sumbernya memang punya jam.
 *
 * Order retail tanggalnya tanpa jam (walk-in, tidak terjadwal), sedangkan sesi
 * studio punya jam. `formatTanggalJam` pada tanggal tanpa jam menghasilkan
 * "26 Agu 2026, 00:00" — jam palsu yang terlihat seperti data, dan di kolom
 * jadwal itu menyesatkan. Satu kolom bisa memuat kedua bentuk.
 */
export function formatJadwal(nilai: string | Date): string {
    // Dipatok `^` ke bentuk yang sama dengan yang diterima keDate, supaya kedua
    // fungsi tidak bisa berbeda pendapat soal "ada jamnya". Tanpa `^`, string
    // seperti "ORD-0012 14:00" atau "catatan 2026-08-26T14:00" ikut cocok —
    // padahal keduanya bukan tanggal dan akan berakhir sebagai "—".
    const adaJam =
        typeof nilai === 'string' &&
        /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(nilai);
    return adaJam ? formatTanggalJam(nilai) : formatTanggal(nilai);
}

/**
 * "12–14 Sep 2026" · "28 Agu–2 Sep 2026" · "28 Des 2026–2 Jan 2027"
 * Bagian yang sama di kedua ujung tidak diulang.
 */
export function formatRentangTanggal(
    dari: string | Date,
    sampai: string | Date,
): string {
    const a = keDate(dari);
    const b = keDate(sampai);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()))
        return TAK_VALID;
    if (a.getFullYear() !== b.getFullYear()) {
        return `${formatTanggal(a)}${EN_DASH}${formatTanggal(b)}`;
    }
    if (a.getMonth() !== b.getMonth()) {
        return `${a.getDate()} ${bulanPendek(a)}${EN_DASH}${formatTanggal(b)}`;
    }
    return `${a.getDate()}${EN_DASH}${formatTanggal(b)}`;
}

/**
 * Umur piutang relatif terhadap hari ini (R5).
 * `selisihHari` > 0 = belum jatuh tempo, 0 = hari ini, < 0 = sudah lewat.
 *
 * Jatuh tempo tepat hari ini dihitung BELUM lewat — supaya angka "Lewat Jatuh
 * Tempo" di layar Piutang sama persis dengan kelompok umur "1–30 hari"
 * (stitch-prompts.md bagian 3).
 */
export function formatUmurPiutang(selisihHari: number): string {
    if (selisihHari === 0) return 'jatuh tempo hari ini';
    if (selisihHari > 0) return `${selisihHari} hari lagi`;
    return `lewat ${Math.abs(selisihHari)} hari`;
}

/**
 * "2026-07-01" + 1 bulan → "2026-08-01". Tanggal yang tidak ada di bulan
 * tujuan dijepit ke hari terakhirnya: 31 Jan + 1 → 28/29 Feb.
 *
 * Tidak memakai `Date#setMonth` langsung: 31 Jan + 1 bulan di sana jadi
 * 3 Mar — jadwal servis melompati Februari tanpa ada yang sadar.
 */
export function tambahBulan(tanggal: string, n: number): string {
    const d = keDate(tanggal);
    const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
    const hariTerakhir = new Date(
        target.getFullYear(),
        target.getMonth() + 1,
        0,
    ).getDate();
    const hari = Math.min(d.getDate(), hariTerakhir);
    const bl = String(target.getMonth() + 1).padStart(2, '0');
    return `${target.getFullYear()}-${bl}-${String(hari).padStart(2, '0')}`;
}

/** Selisih hari kalender, mengabaikan jam. Positif = `sampai` di masa depan. */
export function selisihHari(
    dari: string | Date,
    sampai: string | Date,
): number {
    const a = keDate(dari);
    const b = keDate(sampai);
    const hariA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const hariB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((hariB - hariA) / 86_400_000);
}

function bulanPendek(d: Date): string {
    // Intl id-ID sudah menghasilkan Jan Feb Mar Apr Mei Jun Jul Agu Sep Okt Nov
    // Des — persis yang dipakai dataset. Tidak perlu tabel manual.
    return new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(d);
}
