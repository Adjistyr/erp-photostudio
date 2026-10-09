<?php

namespace Modules\Order\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Customer\Models\MessageTemplate;
use Modules\Order\Models\Order;
use Modules\Order\Models\Refund;
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
                ->has('invoices.data', 11)
                ->where('invoices.data.0.number', 'INV-0012')
                ->where('invoices.data.0.balance', 200_000)
                ->has('invoices.data.0.items', 1)
                ->has('invoices.data.0.payments', 1)
                ->where('invoices.data.0.public_url', fn (string $url) => str_contains($url, 'signature='))
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

    public function test_list_carries_billing_template()
    {
        MessageTemplate::create(['key' => 'billing', 'body' => 'Tagih {nomor}']);

        $this->actingAs(User::factory()->create())
            ->get(route('invoices.index'))
            ->assertInertia(fn (Assert $page) => $page->where('billing_template', 'Tagih {nomor}'));
    }

    public function test_print_url_is_a_separately_signed_variant()
    {
        $order = $this->order('ORD-0012');

        $this->assertStringNotContainsString('print=', $order->invoiceUrl());
        $this->assertStringContainsString('print=1', $order->invoiceUrl(print: true));

        $this->get($order->invoiceUrl(print: true))
            ->assertInertia(fn (Assert $page) => $page->where('auto_print', true));
        $this->get($order->invoiceUrl())
            ->assertInertia(fn (Assert $page) => $page->where('auto_print', false));
    }

    public function test_tampering_print_query_onto_plain_signed_url_is_forbidden()
    {
        // Signature mencakup seluruh query — klien tidak boleh menempel print=1.
        $this->get($this->order('ORD-0012')->invoiceUrl().'&print=1')->assertForbidden();
    }

    public function test_public_page_carries_business_line_and_print_url()
    {
        $retail = Order::where('business_line', 'retail')->orderBy('id')->firstOrFail();

        $this->get($retail->invoiceUrl())
            ->assertInertia(fn (Assert $page) => $page
                ->component('order::invoice-public')
                // Judul "Struk" untuk retail ditentukan klien dari field ini.
                ->where('invoice.business_line', 'retail')
                ->where('invoice.print_url', $retail->invoiceUrl(print: true))
            );
    }

    public function test_cancelled_order_has_no_invoice()
    {
        $cancelled = $this->order('ORD-0004');

        $this->get(URL::signedRoute('invoices.public', $cancelled))->assertNotFound();
        $this->actingAs(User::factory()->create())
            ->get(route('orders.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('orders.data.0.invoice_url', fn (?string $url) => is_string($url) && str_contains($url, 'signature='))
                // ORD-0004 = indeks 8 (urut terbaru dulu).
                ->where('orders.data.8.number', 'ORD-0004')
                ->where('orders.data.8.invoice_url', null)
            );
    }

    public function test_invoice_items_carry_is_custom_flag()
    {
        $order = $this->order('ORD-0011');
        $order->items()->create(['catalog_item_id' => null, 'name' => 'Drone', 'quantity' => 1, 'unit_price' => 500_000]);

        $this->get($order->invoiceUrl())->assertInertia(fn (Assert $page) => $page
            ->where('invoice.items.0.is_custom', false)
            ->where('invoice.items.1.is_custom', true));
    }

    public function test_invoice_list_is_searchable_and_filterable()
    {
        $props = $this->actingAs(User::factory()->create())
            ->get(route('invoices.index', ['q' => 'budi', 'pay' => 'paid']))->inertiaPage()['props'];

        $this->assertSame(['INV-0009', 'INV-0001'], array_column($props['invoices']['data'], 'number'));
        $this->assertSame(['q' => 'budi', 'pay' => 'paid'], $props['filters']);
        $this->assertSame(1, $props['invoices']['last_page']);
    }

    public function test_public_invoice_carries_refunds()
    {
        $order = $this->order('ORD-0003');
        Refund::create(['order_id' => $order->id, 'refunded_on' => '2026-08-26', 'amount' => 30_000, 'method' => 'cash', 'reason' => 'Cetak salah']);

        $this->get($order->invoiceUrl())->assertInertia(fn (Assert $page) => $page
            ->where('invoice.total_refunded', 30_000)
            ->where('invoice.refunds.0.reason', 'Cetak salah')
            // Sisa tagihan tetap bruto: lunas.
            ->where('invoice.balance', 0));
    }
}
