<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CustomerTest extends TestCase
{
    use RefreshDatabase;

    private function user(): User
    {
        return User::factory()->create();
    }

    public function test_guest_is_redirected_to_login()
    {
        $this->get(route('customers.index'))->assertRedirect(route('login'));
    }

    public function test_index_summaries_sorted_by_order_value_with_history()
    {
        $this->seed(DemoSeeder::class);

        $this->actingAs($this->user())
            ->get(route('customers.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('customers/index')
                ->has('customers', Customer::count())
                ->where('customers.0.name', 'Rani & Dimas')
                ->where('customers.0.order_value', 8_500_000)
                ->where('customers.0.paid', 2_500_000)
                ->where('customers.0.lines', ['event'])
                ->where('customers.0.orders.0.number', 'ORD-0011')
                // Status bayar dihitung server — satu sumber kebenaran.
                ->where('customers.0.orders.0.payment_status', 'partial')
                ->where('customers.0.orders.0.paid_percent', 29)
                ->where('customers.0.orders.0.balance', 6_000_000)
            );
    }

    public function test_cancelled_order_stays_in_history_without_raising_value()
    {
        $this->seed(DemoSeeder::class);

        $this->actingAs($this->user())
            ->get(route('customers.index'))
            ->assertInertia(function (Assert $page) {
                $fajar = collect($page->toArray()['props']['customers'])->firstWhere('name', 'Fajar Nugroho');
                $this->assertSame(0, $fajar['order_count']);
                $this->assertSame(0, $fajar['order_value']);
                $this->assertCount(1, $fajar['orders']);
                $this->assertSame('cancelled', $fajar['orders'][0]['work_status']);
                // Sisa tagihan order Batal tidak ditagih lagi.
                $this->assertSame(0, $fajar['outstanding']);
            });
    }

    public function test_store_lead_with_only_name()
    {
        // Hanya nama yang wajib — field wajib membuat pencatatan dilewat
        // (business-flow 5.1).
        $this->actingAs($this->user())
            ->post(route('customers.store'), ['name' => 'Lead Instagram'])
            ->assertRedirect(route('customers.index'))
            ->assertSessionHasNoErrors();

        $customer = Customer::sole();
        $this->assertSame('Lead Instagram', $customer->name);
        $this->assertNull($customer->phone);
    }

    public function test_store_full_contact()
    {
        $this->actingAs($this->user())->post(route('customers.store'), [
            'name' => 'Maya', 'phone' => '0812-0000-1111', 'email' => 'maya@gmail.com',
            'source' => 'Instagram', 'notes' => 'Rencana prewed Desember',
        ]);

        $this->assertSame(['0812-0000-1111', 'maya@gmail.com', 'Instagram'], [
            Customer::sole()->phone, Customer::sole()->email, Customer::sole()->source,
        ]);
    }

    public function test_validation_rejects_bad_input()
    {
        $this->actingAs($this->user())
            ->post(route('customers.store'), ['name' => ' ', 'email' => 'bukan-email', 'source' => 'Spanduk liar'])
            ->assertSessionHasErrors(['name', 'email', 'source']);

        $this->assertSame(0, Customer::count());
    }

    public function test_update_contact()
    {
        $customer = Customer::create(['name' => 'Budi', 'phone' => '0813-salah']);

        $this->actingAs($this->user())
            ->put(route('customers.update', $customer), ['name' => 'Budi Hartono', 'phone' => '0813-2211-9087'])
            ->assertRedirect(route('customers.index'));

        $this->assertSame(['Budi Hartono', '0813-2211-9087'], [$customer->refresh()->name, $customer->phone]);
    }

    public function test_customers_cannot_be_deleted()
    {
        // Customer dirujuk order — menghapus memutus riwayat transaksi.
        $this->assertFalse(Route::has('customers.destroy'));
    }

    public function test_order_items_summary()
    {
        $this->seed(DemoSeeder::class);

        $this->assertSame(
            'Keychain Foto Akrilik ×2, Cetak 4R ×6',
            Order::with('items')->where('number', 'ORD-0010')->sole()->itemsSummary(),
        );
        $this->assertSame('Paket Studio 1 Jam', Order::with('items')->where('number', 'ORD-0012')->sole()->itemsSummary());
    }
}
