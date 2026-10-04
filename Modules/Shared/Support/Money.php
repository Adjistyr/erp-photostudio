<?php

namespace Modules\Shared\Support;

/**
 * Format rupiah untuk teks dari server (pesan validasi) — sama dengan
 * formatRp() di frontend (DESIGN.md R5): "Rp 1.250.000", "−Rp 250.000".
 */
final class Money
{
    public static function format(int $amount): string
    {
        $sign = $amount < 0 ? "\u{2212}" : '';

        return $sign.'Rp '.number_format(abs($amount), 0, ',', '.');
    }
}
