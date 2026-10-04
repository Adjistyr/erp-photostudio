<?php

namespace Modules\Order\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Kalender booking — "tanggal ini kosong atau tidak". Retail tidak terjadwal. */
class OrderCalendarTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');
        $this->actingAs(User::factory()->create());
    }

    public function test_guest_is_redirected_to_login()
    {
        auth()->logout();

        $this->get(route('orders.calendar'))->assertRedirect(route('login'));
    }

    public function test_defaults_to_current_month_without_retail()
    {
        // Agustus: studio 0001, 0005, 0007, 0009, 0012 + event 0004, 0008.
        // Retail 0002, 0003, 0006, 0010 tidak terjadwal; 0011 di Oktober.
        $this->get(route('orders.calendar'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('order::calendar')
                ->where('month', '2026-08')
                ->where('today', '2026-08-26')
                ->has('orders', 7)
                ->where('orders.0.number', 'ORD-0008') // 12 Agu, paling awal
            );
    }

    public function test_other_month_via_query()
    {
        $this->get(route('orders.calendar', ['month' => '2026-10']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('month', '2026-10')
                ->has('orders', 1)
                ->where('orders.0.number', 'ORD-0011')
            );
    }

    public function test_invalid_month_falls_back_to_current()
    {
        foreach (['abc', '2026-13', '2026-8'] as $bad) {
            $this->get(route('orders.calendar', ['month' => $bad]))
                ->assertInertia(fn (Assert $page) => $page->where('month', '2026-08'));
        }
    }
}
