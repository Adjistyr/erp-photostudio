<?php

namespace Modules\Customer\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Template pesan ke customer. Baris hanya ada untuk template yang sudah
 * diedit owner. Placeholder per template:
 * - semua: `{nama}` = nama depan customer
 * - thank_you: `{link}` = link hasil foto
 * - billing: `{nomor}` nomor order, `{sisa}` sisa tagihan, `{jatuh_tempo}`
 *   tanggal, `{link}` link invoice bertanda tangan
 * Nama studio & rekening DITANAM ke teks default dari config, bukan placeholder.
 *
 * @property string $key
 * @property string $body
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['key', 'body'])]
class MessageTemplate extends Model
{
    protected $primaryKey = 'key';

    protected $keyType = 'string';

    public $incrementing = false;

    /**
     * Template bawaan (teks dari prototype). Nama studio dari config/studio.php
     * supaya default langsung memakai nama yang benar.
     *
     * @return array<string, array{title: string, when: string, body: string}>
     */
    public static function defaults(): array
    {
        $studio = (string) config('studio.name');
        $bank = (string) config('studio.bank_account');

        return [
            'promo' => [
                'title' => 'Promo / blast',
                'when' => 'Dikirim manual saat ada promo.',
                'body' => "Halo {nama}! {$studio} ada promo cetak foto bulan ini: gratis 1 keychain untuk setiap cetak 10R + bingkai. Berlaku sampai akhir bulan. Kalau berminat balas pesan ini ya, terima kasih 🙏",
            ],
            'thank_you' => [
                'title' => 'Ucapan terima kasih',
                'when' => 'Untuk dikirim manual saat order diserahkan — belum ada pengiriman otomatis.',
                'body' => "Halo {nama}, terima kasih sudah mempercayakan momennya ke {$studio}! Hasil fotonya bisa diunduh di sini: {link}\n\nKalau berkenan, kami sangat terbantu kalau {nama} meninggalkan ulasan singkat. Sampai jumpa di sesi berikutnya!",
            ],
            'reminder' => [
                'title' => 'Reminder H-1',
                'when' => 'Untuk dikirim manual sehari sebelum sesi studio atau acara.',
                'body' => "Halo {nama}, mengingatkan sesi foto besok di {$studio}. Datang 10 menit lebih awal ya supaya persiapannya santai. Kalau ada perubahan jadwal, balas pesan ini.",
            ],
            // K5: satu teks tagihan untuk tombol WA di Pembayaran dan Invoice.
            'billing' => [
                'title' => 'Tagihan',
                'when' => 'Dipakai tombol WA di layar Pembayaran dan "Buka WhatsApp" di Invoice untuk order yang belum lunas.',
                'body' => "Halo {nama}, berikut tagihan {nomor} dari {$studio}. Sisa {sisa}, jatuh tempo {jatuh_tempo}. Pembayaran ke {$bank}. Rincian: {link}",
            ],
        ];
    }

    /**
     * Semua template, isi = editan owner kalau ada, selain itu default.
     *
     * @return list<array{key: string, title: string, when: string, body: string}>
     */
    public static function resolved(): array
    {
        $saved = static::query()->get()->keyBy('key');
        $templates = [];
        foreach (static::defaults() as $key => $d) {
            $templates[] = ['key' => $key, 'title' => $d['title'], 'when' => $d['when'], 'body' => $saved->get($key)->body ?? $d['body']];
        }

        return $templates;
    }

    /** Isi satu template: editan owner kalau ada, selain itu default. */
    public static function bodyFor(string $key): string
    {
        return static::query()->find($key)->body ?? static::defaults()[$key]['body'];
    }

    /**
     * `{key}` → `$values[key]`. Diikat kurung kurawal supaya kata "nama" di
     * prosa ("atas nama") tidak ikut terganti; placeholder yang tidak ada di
     * `$values` dibiarkan — owner melihat salah ketiknya di pratinjau.
     * Setara `personalise()` di resources/js/lib/format.ts.
     *
     * @param  array<string, string>  $values
     */
    public static function fillPlaceholders(string $body, array $values): string
    {
        $search = array_map(fn (string $k) => '{'.$k.'}', array_keys($values));

        return str_replace($search, array_values($values), $body);
    }

    /** Email blast: `{nama}` → nama depan, `{link}`. */
    public static function personalise(string $body, string $name, string $link = ''): string
    {
        return static::fillPlaceholders($body, ['nama' => explode(' ', trim($name))[0], 'link' => $link]);
    }
}
