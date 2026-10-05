<?php

namespace Modules\Customer\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Template pesan ke customer. `{nama}` = nama depan customer, `{link}` = link
 * hasil foto. Baris hanya ada untuk template yang sudah diedit owner.
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

    /**
     * `{nama}` → nama depan. Diikat kurung kurawal supaya kata "nama" di prosa
     * ("atas nama") tidak ikut terganti.
     */
    public static function personalise(string $body, string $name, string $link = ''): string
    {
        return str_replace(['{nama}', '{link}'], [explode(' ', trim($name))[0], $link], $body);
    }
}
