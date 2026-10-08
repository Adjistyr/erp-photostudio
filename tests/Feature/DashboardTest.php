<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Customer\Models\Customer;
use Modules\Customer\Models\MessageTemplate;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Modules\Shared\Enums\BusinessLine;
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

    /** Order terjadwal pada tanggal tertentu (data uji reminder). */
    private function booking(string $number, string $date, ?string $time, BusinessLine $line = BusinessLine::Studio, WorkStatus $status = WorkStatus::Scheduled): Order
    {
        $customer = Customer::create(['name' => "Customer {$number}", 'phone' => '0812 0000 '.substr($number, -4)]);

        return Order::create(['number' => $number, 'customer_id' => $customer->id, 'business_line' => $line,
            'service_date' => $date, 'service_time' => $time, 'work_status' => $status, 'location' => 'Studio']);
    }

    /** @return array<string, mixed> */
    private function dashboardProps(): array
    {
        $this->actingAs(User::factory()->create());

        return $this->get(route('dashboard'))->inertiaPage()['props'];
    }

    public function test_lists_tomorrow_bookings_only()
    {
        $this->travelTo('2026-10-09 09:00:00');
        $this->booking('ORD-0901', '2026-10-10', '10:00');
        $this->booking('ORD-0902', '2026-10-11', '10:00'); // lusa
        $this->booking('ORD-0903', '2026-10-09', '10:00'); // hari ini

        $props = $this->dashboardProps();

        $this->assertSame(['ORD-0901'], array_column($props['bookings_tomorrow'], 'number'));
        $this->assertSame(['ORD-0903'], array_column($props['bookings_today'], 'number'));
        $this->assertSame('0812 0000 0901', $props['bookings_tomorrow'][0]['customer_phone']);
        $this->assertSame(['2026-10-10', 'Studio'], [$props['bookings_tomorrow'][0]['service_date'], $props['bookings_tomorrow'][0]['location']]);
    }

    public function test_tomorrow_excludes_cancelled_and_retail()
    {
        $this->travelTo('2026-10-09 09:00:00');
        $this->booking('ORD-0911', '2026-10-10', null, status: WorkStatus::Cancelled);
        $this->booking('ORD-0912', '2026-10-10', null, BusinessLine::Retail, WorkStatus::Delivered);
        $this->booking('ORD-0913', '2026-10-10', null, BusinessLine::Event);

        $this->assertSame(['ORD-0913'], array_column($this->dashboardProps()['bookings_tomorrow'], 'number'));
    }

    public function test_tomorrow_sorted_by_time_with_null_last()
    {
        $this->travelTo('2026-10-09 09:00:00');
        $this->booking('ORD-0921', '2026-10-10', null);
        $this->booking('ORD-0922', '2026-10-10', '15:00');
        $this->booking('ORD-0923', '2026-10-10', '08:30');

        $this->assertSame(['ORD-0923', 'ORD-0922', 'ORD-0921'], array_column($this->dashboardProps()['bookings_tomorrow'], 'number'));
    }

    public function test_reminder_template_uses_override_when_set()
    {
        $default = $this->dashboardProps()['reminder_template'];
        foreach (['{nama}', '{tanggal}', '{jam}', '{lokasi}'] as $placeholder) {
            $this->assertStringContainsString($placeholder, $default);
        }

        $this->put(route('communication.templates.update', 'reminder'), ['body' => 'Besok {jam} ya {nama}']);

        $this->assertSame('Besok {jam} ya {nama}', $this->dashboardProps()['reminder_template']);
        $this->assertSame('Besok {jam} ya {nama}', MessageTemplate::bodyFor('reminder'));
    }
}
