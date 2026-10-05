<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Pesan yang dibaca owner berbahasa Indonesia (locale `id`, lang/id). */
class TranslationTest extends TestCase
{
    use RefreshDatabase;

    public function test_validation_messages_are_indonesian()
    {
        $this->actingAs(User::factory()->create())
            ->post(route('customers.store'), ['name' => '', 'email' => 'bukan-email'])
            ->assertSessionHasErrors([
                'name' => 'Nama wajib diisi.',
                'email' => 'Email harus berupa alamat email yang valid.',
            ]);
    }

    public function test_size_rules_pick_the_right_variant()
    {
        $this->actingAs(User::factory()->create())
            ->post(route('customers.store'), ['name' => str_repeat('a', 300)])
            ->assertSessionHasErrors(['name' => 'Nama maksimal 255 karakter.']);
    }

    public function test_failed_login_message_is_indonesian()
    {
        $user = User::factory()->create();

        $this->post(route('login.store'), ['email' => $user->email, 'password' => 'salah'])
            ->assertSessionHasErrors(['email' => 'Email atau kata sandi salah.']);
    }

    public function test_json_strings_for_settings_toasts()
    {
        $this->assertSame('Profil diperbarui.', __('Profile updated.'));
        $this->assertSame('Kata sandi diperbarui.', __('Password updated.'));
        // String dari paket Fortify (bukan kode app) — ikut lewat lang/id.json.
        $this->assertSame('Kata sandi salah.', __('The provided password was incorrect.'));
    }
}
