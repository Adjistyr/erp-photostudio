<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeds_both_owners_verified()
    {
        $this->seed(DatabaseSeeder::class);

        $owners = User::orderBy('name')->get();
        $this->assertSame(['Agung', 'Raka'], $owners->pluck('name')->all());
        $this->assertTrue($owners->every(fn (User $u) => $u->email_verified_at !== null));
        // Keduanya pemegang saham (bagi hasil 70/30) — owner, bukan admin (spek 5.1).
        $this->assertTrue($owners->every(fn (User $u) => $u->role === UserRole::Owner));
    }

    public function test_demo_seeder_adds_one_admin_account()
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DemoSeeder::class);

        $admin = User::where('role', UserRole::Admin)->sole();
        $this->assertSame('admin@potraittime.test', $admin->email);
        $this->assertNotNull($admin->email_verified_at);
    }

    public function test_seeding_twice_does_not_duplicate()
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(2, User::count());
    }
}
