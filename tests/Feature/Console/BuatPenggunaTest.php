<?php

namespace Tests\Feature\Console;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BuatPenggunaTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'Rahasia-Studio-2026';

    private const ROLES = ['owner' => 'Owner', 'admin' => 'Admin'];

    public function test_creates_verified_user()
    {
        $this->artisan('app:buat-pengguna')
            ->expectsQuestion('Nama', 'Agung')
            ->expectsQuestion('Email', 'agung@example.com')
            ->expectsChoice('Peran', 'owner', self::ROLES)
            ->expectsQuestion('Password', self::PASSWORD)
            ->assertSuccessful();

        $user = User::where('email', 'agung@example.com')->firstOrFail();
        $this->assertSame('Agung', $user->name);
        $this->assertSame(UserRole::Owner, $user->role);
        // Dashboard mensyaratkan email terverifikasi, dan server belum tentu
        // punya konfigurasi email — akun buatan owner langsung terverifikasi.
        $this->assertNotNull($user->email_verified_at);
        $this->assertTrue(password_verify(self::PASSWORD, $user->password));
    }

    public function test_creates_admin_when_admin_role_is_chosen()
    {
        $this->artisan('app:buat-pengguna')
            ->expectsQuestion('Nama', 'Dimas')
            ->expectsQuestion('Email', 'dimas@example.com')
            ->expectsChoice('Peran', 'admin', self::ROLES)
            ->expectsQuestion('Password', self::PASSWORD)
            ->expectsOutputToContain('(Admin)')
            ->assertSuccessful();

        $this->assertSame(UserRole::Admin, User::where('email', 'dimas@example.com')->firstOrFail()->role);
    }

    public function test_rejects_duplicate_email()
    {
        User::factory()->create(['email' => 'agung@example.com']);

        $this->artisan('app:buat-pengguna')
            ->expectsQuestion('Nama', 'Agung Lagi')
            ->expectsQuestion('Email', 'agung@example.com')
            ->expectsChoice('Peran', 'owner', self::ROLES)
            ->expectsQuestion('Password', self::PASSWORD)
            ->assertFailed();

        $this->assertSame(1, User::where('email', 'agung@example.com')->count());
    }

    public function test_rejects_invalid_email()
    {
        $this->artisan('app:buat-pengguna')
            ->expectsQuestion('Nama', 'Raka')
            ->expectsQuestion('Email', 'bukan-email')
            ->expectsChoice('Peran', 'owner', self::ROLES)
            ->expectsQuestion('Password', self::PASSWORD)
            ->assertFailed();

        $this->assertSame(0, User::count());
    }

    public function test_rejects_password_that_fails_policy()
    {
        $this->artisan('app:buat-pengguna')
            ->expectsQuestion('Nama', 'Raka')
            ->expectsQuestion('Email', 'raka@example.com')
            ->expectsChoice('Peran', 'owner', self::ROLES)
            ->expectsQuestion('Password', 'x')
            ->assertFailed();

        $this->assertSame(0, User::count());
    }
}
