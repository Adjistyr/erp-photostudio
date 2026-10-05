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
];
