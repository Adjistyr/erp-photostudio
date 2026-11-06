<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Modules\Shared\Enums\BusinessLine;
use Tests\TestCase;

/**
 * Halaman error berbahasa Indonesia (audit UI/UX Nov 2026): admin yang membuka
 * URL khusus owner, link invoice yang rusak, dan halaman tidak ada tidak lagi
 * melihat halaman Laravel bawaan berbahasa Inggris.
 */
class ErrorPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_on_owner_page_gets_error_page_with_403()
    {
        $this->actingAs(User::factory()->admin()->create())
            ->get(route('reports.profit-loss'))
            ->assertForbidden()
            ->assertInertia(fn (Assert $page) => $page->component('error')->where('status', 403));
    }

    public function test_missing_page_gets_error_page_with_404()
    {
        $this->actingAs(User::factory()->create())
            ->get('/halaman-yang-tidak-ada')
            ->assertNotFound()
            ->assertInertia(fn (Assert $page) => $page->component('error')->where('status', 404));
    }

    public function test_guest_with_tampered_invoice_link_gets_error_page()
    {
        $order = Order::create(['number' => 'ORD-0001', 'business_line' => BusinessLine::Retail,
            'service_date' => '2026-08-20', 'work_status' => WorkStatus::Delivered]);

        $this->get("/i/{$order->id}?signature=palsu")
            ->assertForbidden()
            ->assertInertia(fn (Assert $page) => $page->component('error')->where('status', 403));
    }

    public function test_json_requests_keep_json_errors()
    {
        $this->actingAs(User::factory()->admin()->create())
            ->getJson(route('reports.profit-loss'))
            ->assertForbidden()
            ->assertJsonStructure(['message']);
    }
}
