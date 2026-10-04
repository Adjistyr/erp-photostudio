<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
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
    }

    public function test_seeding_twice_does_not_duplicate()
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(2, User::count());
    }
}
