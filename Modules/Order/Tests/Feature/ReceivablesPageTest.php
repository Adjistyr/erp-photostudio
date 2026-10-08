<?php

namespace Modules\Order\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Customer\Models\MessageTemplate;
use Modules\Order\Models\Order;
use Tests\TestCase;

/** Layar Pembayaran — piutang, layar yang paling sering dibuka owner. */
class ReceivablesPageTest extends TestCase
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

        $this->get(route('receivables.index'))->assertRedirect(route('login'));
    }

    public function test_lists_open_receivables_largest_balance_first()
    {
        // ORD-0011 6 jt, 0008 1,5 jt, 0005 350 rb, 0012 200 rb. Batal (0004) tidak ditagih.
        $this->get(route('receivables.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('order::receivables')
                ->has('orders', 4)
                ->where('orders.0.number', 'ORD-0011')
                ->where('orders.0.balance', 6_000_000)
                ->where('orders.0.days_until_due', 53)
                ->where('orders.1.number', 'ORD-0008')
                ->where('orders.1.days_until_due', -14)
                ->where('orders.1.payment_status', 'partial')
                ->where('orders.3.number', 'ORD-0012')
                // Jatuh tempo hari ini = belum lewat.
                ->where('orders.3.days_until_due', 0)
                ->where('totals.total', 8_050_000)
                ->where('totals.overdue', 1_500_000)
                ->where('totals.overdue_count', 1)
            );
    }

    public function test_rows_carry_phone_signed_invoice_url_and_studio()
    {
        $order = Order::where('number', 'ORD-0011')->sole();
        $order->customer?->update(['phone' => null]);

        $page = $this->get(route('receivables.index'))->inertiaPage()['props'];
        $row = collect($page['orders'])->firstWhere('number', 'ORD-0011');

        // Customer tanpa HP → null (tombol WA dinonaktifkan di layar).
        $this->assertArrayHasKey('customer_phone', $row);
        $this->assertNull($row['customer_phone']);
        $this->assertSame($order->invoiceUrl(), $row['invoice_url']);
        $this->assertArrayHasKey('bank_account', $page['studio']);

        auth()->logout();
        $this->get($row['invoice_url'])->assertOk();
    }

    public function test_page_carries_default_billing_template_with_studio_name()
    {
        config(['studio.name' => 'Studio Uji', 'studio.bank_account' => 'BCA 111']);

        $template = $this->get(route('receivables.index'))->inertiaPage()['props']['billing_template'];

        $this->assertStringContainsString('Studio Uji', $template);
        $this->assertStringContainsString('BCA 111', $template);
        foreach (['{nama}', '{nomor}', '{sisa}', '{jatuh_tempo}', '{link}'] as $placeholder) {
            $this->assertStringContainsString($placeholder, $template);
        }
    }

    public function test_edited_billing_template_is_used()
    {
        MessageTemplate::create(['key' => 'billing', 'body' => 'Tagih {nomor} ya']);

        $this->get(route('receivables.index'))
            ->assertInertia(fn (Assert $page) => $page->where('billing_template', 'Tagih {nomor} ya'));
    }

    public function test_paid_off_order_leaves_the_list()
    {
        $order = Order::where('number', 'ORD-0012')->sole();
        $this->from(route('receivables.index'))
            ->post(route('orders.payments.store', $order), ['amount' => 200_000, 'method' => 'cash', 'paid_on' => '2026-08-26'])
            // Kembali ke layar asal, bukan dilempar ke daftar order.
            ->assertRedirect(route('receivables.index'));

        $this->get(route('receivables.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('orders', 3)
                ->where('totals.total', 7_850_000)
            );
    }

    public function test_empty_when_nothing_outstanding()
    {
        foreach (Order::with(['items', 'payments'])->get() as $o) {
            if ($o->balance() > 0) {
                $o->payments()->create(['paid_on' => '2026-08-26', 'amount' => $o->balance(), 'method' => 'cash', 'note' => 'Pelunasan']);
            }
        }

        $this->get(route('receivables.index'))
            ->assertInertia(fn (Assert $page) => $page->has('orders', 0)->where('totals.total', 0));
    }
}
