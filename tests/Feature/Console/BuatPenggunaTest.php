<?php

namespace Tests\Feature\Console;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BuatPenggunaTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'Rahasia-Studio-2026';

    public function test_creates_verified_user()
    {
        $this->artisan('app:buat-pengguna')
            ->expectsQuestion('Nama', 'Agung')
            ->expectsQuestion('Email', 'agung@example.com')
            ->expectsQuestion('Password', self::PASSWORD)
            ->assertSuccessful();

        $user = User::where('email', 'agung@example.com')->firstOrFail();
        $this->assertSame('Agung', $user->name);
        // Dashboard mensyaratkan email terverifikasi, dan server belum tentu
        // punya konfigurasi email — akun buatan owner langsung terverifikasi.
        $this->assertNotNull($user->email_verified_at);
        $this->assertTrue(password_verify(self::PASSWORD, $user->password));
    }

    public function test_rejects_duplicate_email()
    {
        User::factory()->create(['email' => 'agung@example.com']);

        $this->artisan('app:buat-pengguna')
            ->expectsQuestion('Nama', 'Agung Lagi')
            ->expectsQuestion('Email', 'agung@example.com')
            ->expectsQuestion('Password', self::PASSWORD)
            ->assertFailed();

        $this->assertSame(1, User::where('email', 'agung@example.com')->count());
    }

    public function test_rejects_invalid_email()
    {
        $this->artisan('app:buat-pengguna')
            ->expectsQuestion('Nama', 'Raka')
            ->expectsQuestion('Email', 'bukan-email')
            ->expectsQuestion('Password', self::PASSWORD)
            ->assertFailed();

        $this->assertSame(0, User::count());
    }

    public function test_rejects_password_that_fails_policy()
    {
        $this->artisan('app:buat-pengguna')
            ->expectsQuestion('Nama', 'Raka')
            ->expectsQuestion('Email', 'raka@example.com')
            ->expectsQuestion('Password', 'x')
            ->assertFailed();

        $this->assertSame(0, User::count());
    }
}
