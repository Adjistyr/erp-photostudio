<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * "/" bukan landing page: app ini dashboard internal, website company
 * profile (Paket A) berjalan di domain/subdomain sendiri.
 */
class HomeTest extends TestCase
{
    use RefreshDatabase;

    public function test_home_redirects_to_dashboard()
    {
        $this->get(route('home'))->assertRedirect(route('dashboard'));
    }

    public function test_guest_ends_up_on_login()
    {
        $this->followingRedirects()
            ->get(route('home'))
            ->assertInertia(fn ($page) => $page->component('auth/login'));
    }

    public function test_authenticated_user_ends_up_on_dashboard()
    {
        $this->actingAs(User::factory()->create())
            ->followingRedirects()
            ->get(route('home'))
            ->assertInertia(fn ($page) => $page->component('dashboard'));
    }
}
