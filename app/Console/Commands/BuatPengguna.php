<?php

namespace App\Console\Commands;

use App\Actions\Fortify\CreateNewUser;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;

use function Laravel\Prompts\password;
use function Laravel\Prompts\text;

/**
 * Pengganti registrasi publik yang dimatikan (config/fortify.php).
 *
 * Memakai action CreateNewUser milik Fortify, bukan validasi sendiri: aturan
 * email unik dan kebijakan password jadi satu sumber dengan form profil dan
 * reset password.
 */
class BuatPengguna extends Command
{
    protected $signature = 'app:buat-pengguna';

    protected $description = 'Buat akun pengguna dashboard (registrasi publik dimatikan)';

    public function handle(CreateNewUser $creator): int
    {
        $name = text('Nama', required: true);
        $email = text('Email', required: true);
        $password = password('Password', required: true);

        try {
            $user = $creator->create([
                'name' => $name,
                'email' => $email,
                'password' => $password,
                'password_confirmation' => $password,
            ]);
        } catch (ValidationException $e) {
            foreach ($e->validator->errors()->all() as $pesan) {
                $this->error($pesan);
            }

            return self::FAILURE;
        }

        // Akun dibuat owner sendiri, jadi alamatnya dianggap sah. Dashboard
        // mensyaratkan email terverifikasi, dan server belum tentu punya
        // konfigurasi email untuk mengirim tautan verifikasi.
        $user->forceFill(['email_verified_at' => now()])->save();

        $this->info("Akun {$user->email} dibuat.");

        return self::SUCCESS;
    }
}
