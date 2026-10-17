<?php

namespace Tests\Feature\Settings;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Settings → Pengguna (spek 5.1) — hanya owner. */
class UsersTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'Rahasia-Studio-2026';

    public function test_owner_sees_users_and_role_options(): void
    {
        $owner = User::factory()->create(['name' => 'Agung']);
        User::factory()->admin()->create(['name' => 'Dimas']);

        $this->actingAs($owner)->get(route('users.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('settings/users')
                ->where('users.0.name', 'Agung')
                ->where('users.0.role', 'owner')
                ->where('users.1.role', 'admin')
                ->where('roles', [['value' => 'owner', 'label' => 'Owner'], ['value' => 'admin', 'label' => 'Admin']]));
    }

    public function test_owner_can_create_admin_user(): void
    {
        $owner = User::factory()->create();

        $this->actingAs($owner)->post(route('users.store'), [
            'name' => 'Dimas', 'email' => 'dimas@example.com', 'role' => 'admin',
            'password' => self::PASSWORD, 'password_confirmation' => self::PASSWORD,
        ])->assertRedirect(route('users.index'))->assertSessionHasNoErrors();

        $user = User::where('email', 'dimas@example.com')->sole();
        $this->assertSame(UserRole::Admin, $user->role);
        $this->assertNotNull($user->email_verified_at);
        $this->assertTrue(password_verify(self::PASSWORD, $user->password));
    }

    public function test_store_validates_role_email_and_password(): void
    {
        $owner = User::factory()->create(['email' => 'agung@example.com']);

        $this->actingAs($owner)->post(route('users.store'), [
            'name' => '', 'email' => 'agung@example.com', 'role' => 'kasir',
            'password' => self::PASSWORD, 'password_confirmation' => 'beda',
        ])->assertSessionHasErrors(['name', 'email', 'role', 'password']);

        $this->assertSame(1, User::count());
    }

    public function test_admin_cannot_open_users_page(): void
    {
        $admin = User::factory()->admin()->create();
        $other = User::factory()->create();

        $this->actingAs($admin)->get(route('users.index'))->assertForbidden();
        $this->post(route('users.store'), ['name' => 'X'])->assertForbidden();
        $this->patch(route('users.update', $other), ['name' => 'X', 'role' => 'admin'])->assertForbidden();

        $this->assertSame(UserRole::Owner, $other->fresh()?->role);
    }

    public function test_last_owner_cannot_be_demoted(): void
    {
        $owner = User::factory()->create();

        $this->actingAs($owner)
            ->patch(route('users.update', $owner), ['name' => $owner->name, 'role' => 'admin'])
            ->assertSessionHasErrors(['role' => 'Harus ada minimal satu owner.']);

        $this->assertSame(UserRole::Owner, $owner->fresh()?->role);
    }

    public function test_owner_cannot_change_own_role(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($owner)
            ->patch(route('users.update', $owner), ['name' => $owner->name, 'role' => 'admin'])
            ->assertSessionHasErrors('role');
        $this->assertSame(UserRole::Owner, $owner->fresh()?->role);

        $this->patch(route('users.update', $other), ['name' => 'Raka', 'role' => 'admin'])
            ->assertRedirect(route('users.index'))
            ->assertSessionHasNoErrors();
        $this->assertSame(UserRole::Admin, $other->fresh()?->role);
    }

    public function test_owner_renames_self_and_resets_password_of_others(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->admin()->create();

        // Nama sendiri boleh, peran tetap.
        $this->actingAs($owner)
            ->patch(route('users.update', $owner), ['name' => 'Agung W.', 'role' => 'owner'])
            ->assertSessionHasNoErrors();
        $this->assertSame('Agung W.', $owner->fresh()?->name);

        // Sandi kosong = tidak diganti; diisi = diganti (akun staf yang keluar).
        $hash = $admin->password;
        $this->patch(route('users.update', $admin), ['name' => $admin->name, 'role' => 'admin', 'password' => ''])
            ->assertSessionHasNoErrors();
        $this->assertSame($hash, $admin->fresh()?->password);

        $this->patch(route('users.update', $admin), [
            'name' => $admin->name, 'role' => 'admin', 'password' => self::PASSWORD, 'password_confirmation' => self::PASSWORD,
        ])->assertSessionHasNoErrors();
        $this->assertTrue(password_verify(self::PASSWORD, (string) $admin->fresh()?->password));
    }

    public function test_promoting_admin_keeps_other_owners_able_to_demote(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->admin()->create();

        $this->actingAs($owner)->patch(route('users.update', $admin), ['name' => $admin->name, 'role' => 'owner'])
            ->assertSessionHasNoErrors();

        // Sekarang dua owner: owner baru boleh menurunkan owner lama.
        $this->actingAs($admin->fresh() ?? $admin)
            ->patch(route('users.update', $owner), ['name' => $owner->name, 'role' => 'admin'])
            ->assertSessionHasNoErrors();
        $this->assertSame(UserRole::Admin, $owner->fresh()?->role);
    }
}
