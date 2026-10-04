<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * Hanya untuk lokal/staging — password semua akun "password". Akun
     * produksi dibuat lewat `php artisan app:buat-pengguna`.
     */
    public function run(): void
    {
        // Cek dulu, bukan create langsung: seeder aman dijalankan ulang tanpa
        // gagal di constraint email unik. Bukan firstOrCreate: model User
        // hanya mengizinkan name/email/password lewat mass assignment, jadi
        // email_verified_at akan terbuang diam-diam. Factory mengisinya
        // langsung.
        foreach (['Agung', 'Raka'] as $nama) {
            $email = strtolower($nama).'@potraittime.test';
            if (User::where('email', $email)->doesntExist()) {
                User::factory()->create(['name' => $nama, 'email' => $email]);
            }
        }
    }
}
