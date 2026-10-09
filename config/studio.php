<?php

/*
 * Profil studio di invoice dan pesan WhatsApp ke customer. Default di bawah
 * adalah data CONTOH dari prototype — isi yang asli lewat .env sebelum
 * invoice dikirim ke customer sungguhan.
 */
return [
    'name' => env('STUDIO_NAME', 'Studio Foto Agung'),
    'address' => env('STUDIO_ADDRESS', 'Jl. Kaliurang KM 5 No. 12, Yogyakarta'),
    'phone' => env('STUDIO_PHONE', '0812-0000-1111'),
    'bank_account' => env('STUDIO_BANK_ACCOUNT', 'BCA 1234567890 a.n. Agung Prasetyo'),
    // Penanda produk bermargin tipis di Katalog (spek 3.6) — satu ambang untuk
    // seluruh katalog, bukan aturan validasi.
    'low_margin_ratio' => (float) env('STUDIO_LOW_MARGIN_RATIO', 0.2),
    // Batas baris ekspor CSV order (spek 4.5) — melindungi DB dari query tanpa filter.
    'export_limit' => (int) env('STUDIO_EXPORT_LIMIT', 10000),
];
