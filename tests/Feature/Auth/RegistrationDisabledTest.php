<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Registrasi publik dimatikan: penggunanya dua owner, akunnya dibuat lewat
 * `php artisan app:buat-pengguna`. Kalau fitur Fortify ini tidak sengaja
 * dinyalakan lagi, siapa pun yang menemukan URL bisa membuat akun dan
 * melihat seluruh data keuangan.
 */
class RegistrationDisabledTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_route_does_not_exist()
    {
        $this->assertFalse(Route::has('register'));
        $this->assertFalse(Route::has('register.store'));
    }

    public function test_register_screen_is_not_found()
    {
        $this->get('/register')->assertNotFound();
    }

    public function test_cannot_register_by_posting_directly()
    {
        $this->post('/register', [
            'name' => 'Penyusup',
            'email' => 'penyusup@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertGuest();
        $this->assertDatabaseMissing(User::class, ['email' => 'penyusup@example.com']);
    }
}
