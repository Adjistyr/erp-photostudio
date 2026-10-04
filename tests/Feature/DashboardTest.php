<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_the_dashboard()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertOk();
    }

    public function test_empty_catalog_flags_getting_started()
    {
        // Tanpa katalog semua angka nol — layar mengarahkan ke Katalog (R7).
        $this->actingAs(User::factory()->create())
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('dashboard')
                ->where('has_catalog', false)
            );
    }

    public function test_figures_match_finance_services()
    {
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');

        $this->actingAs(User::factory()->create())
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('has_catalog', true)
                ->where('today', '2026-08-26')
                ->where('month', '2026-08')
                // Hari ini: ORD-0012 (studio 14:00). ORD-0010 retail → tidak terjadwal.
                ->has('bookings_today', 1)
                ->where('bookings_today.0.number', 'ORD-0012')
                ->where('bookings_today.0.service_time', '14:00')
                // Basis kas — sama dengan Laba Rugi.
                ->where('revenue', 5_790_000)
                ->where('receivables.total', 8_050_000)
                ->where('receivables.count', 4)
                ->where('receivables.overdue', 1_500_000)
                ->where('receivables.overdue_count', 1)
                ->has('receivables.orders', 4)
                ->where('receivables.orders.0.number', 'ORD-0011')
                ->where('break_even.fixed_costs', 4_800_000 + 790_450)
                ->where('break_even.gross_profit', 2_695_500)
                ->where('break_even.shortfall', 2_894_950)
                ->has('due_maintenance', 1)
                ->where('due_maintenance.0.asset_name', 'Printer foto')
                ->where('due_maintenance.0.days_until', -25)
            );
    }
}
