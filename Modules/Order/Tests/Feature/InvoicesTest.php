<?php

namespace Modules\Order\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Order\Models\Order;
use Tests\TestCase;

/** Invoice digenerate dari order (business-flow 5.5) — tidak diketik ulang. */
class InvoicesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');
        config(['studio.name' => 'Studio Uji', 'studio.bank_account' => 'BCA 111 a.n. Uji']);
    }

    private function order(string $number): Order
    {
        return Order::where('number', $number)->sole();
    }

    public function test_guest_is_redirected_from_list()
    {
        $this->get(route('invoices.index'))->assertRedirect(route('login'));
    }

    public function test_list_excludes_cancelled_and_carries_signed_link()
    {
        $this->actingAs(User::factory()->create())
            ->get(route('invoices.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('order::invoices')
                // 12 order − ORD-0004 (batal: tidak ditagih lagi).
                ->has('invoices', 11)
                ->where('invoices.0.number', 'INV-0012')
                ->where('invoices.0.balance', 200_000)
                ->has('invoices.0.items', 1)
                ->has('invoices.0.payments', 1)
                ->where('invoices.0.public_url', fn (string $url) => str_contains($url, 'signature='))
                ->where('studio.name', 'Studio Uji')
            );
    }

    public function test_public_invoice_opens_without_login_via_signed_link()
    {
        $url = $this->order('ORD-0011')->invoiceUrl();

        $this->get($url)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('order::invoice-public')
                ->where('invoice.number', 'INV-0011')
                ->where('invoice.customer_name', 'Rani & Dimas')
                ->where('invoice.total', 8_500_000)
                ->where('invoice.balance', 6_000_000)
                ->where('studio.bank_account', 'BCA 111 a.n. Uji')
            );
    }

    public function test_unsigned_or_tampered_link_is_forbidden()
    {
        $order = $this->order('ORD-0011');

        $this->get(route('invoices.public', $order))->assertForbidden();
        // Ganti id di link bertanda tangan order lain → tanda tangan tidak cocok.
        $other = $this->order('ORD-0012');
        $tampered = str_replace("/i/{$order->id}", "/i/{$other->id}", $order->invoiceUrl());
        $this->get($tampered)->assertForbidden();
    }

    public function test_cancelled_order_has_no_invoice()
    {
        $cancelled = $this->order('ORD-0004');

        $this->get(URL::signedRoute('invoices.public', $cancelled))->assertNotFound();
        $this->actingAs(User::factory()->create())
            ->get(route('orders.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('orders.0.invoice_url', fn (?string $url) => is_string($url) && str_contains($url, 'signature='))
                // ORD-0004 = indeks 8 (urut nomor terbaru dulu).
                ->where('orders.8.number', 'ORD-0004')
                ->where('orders.8.invoice_url', null)
            );
    }
}
