<?php

namespace Modules\Shared\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Asset\Models\Asset;
use Modules\Asset\Models\AssetMaintenance;
use Modules\Finance\Models\Owner;
use Modules\Finance\Models\OwnerContribution;
use Modules\Order\Models\Order;
use Modules\Order\Models\Payment;
use Tests\TestCase;

/**
 * `created_by` diisi otomatis oleh trait RecordsCreator (docs/specs/0.1).
 * Diuji lewat jalur nyata (route) supaya ketahuan kalau trait lupa dipasang
 * di salah satu model.
 */
class RecordsCreatorTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');
        $this->user = User::factory()->create(['name' => 'Agung']);
        $this->actingAs($this->user);
    }

    private function order(string $number): Order
    {
        return Order::where('number', $number)->sole();
    }

    public function test_payment_stored_by_logged_in_user_records_creator()
    {
        $this->post(route('orders.payments.store', $this->order('ORD-0005')), [
            'amount' => 100_000, 'method' => 'transfer', 'paid_on' => '2026-08-26',
        ])->assertSessionHasNoErrors();

        $this->assertSame($this->user->id, Payment::latest('id')->firstOrFail()->created_by);
    }

    public function test_rows_created_without_session_have_null_creator()
    {
        Auth::logout();

        $payment = Payment::create([
            'order_id' => $this->order('ORD-0005')->id, 'paid_on' => '2026-08-26',
            'amount' => 50_000, 'method' => 'cash', 'note' => 'DP',
        ]);

        $this->assertNull($payment->created_by);
        // Data demo dibuat seeder — semuanya tanpa pencatat.
        $this->assertSame(0, Payment::whereNotNull('created_by')->where('id', '<', $payment->id)->count());
    }

    public function test_deleting_user_keeps_rows_and_nulls_creator()
    {
        $this->post(route('orders.payments.store', $this->order('ORD-0005')), [
            'amount' => 100_000, 'method' => 'cash', 'paid_on' => '2026-08-26',
        ]);
        $payment = Payment::latest('id')->firstOrFail();

        $this->user->delete();

        $this->assertNull($payment->fresh()?->created_by);
        $this->assertSame(100_000, $payment->fresh()?->amount);
    }

    public function test_explicit_creator_is_not_overwritten()
    {
        $other = User::factory()->create();

        $payment = Payment::create([
            'order_id' => $this->order('ORD-0005')->id, 'paid_on' => '2026-08-26',
            'amount' => 50_000, 'method' => 'cash', 'note' => 'DP', 'created_by' => $other->id,
        ]);

        $this->assertSame($other->id, $payment->created_by);
    }

    public function test_order_detail_props_include_creator_name()
    {
        $order = $this->order('ORD-0005');
        $this->post(route('orders.payments.store', $order), [
            'amount' => 100_000, 'method' => 'cash', 'paid_on' => '2026-08-26',
        ]);

        $orders = collect($this->get(route('orders.index'))->inertiaPage()['props']['orders']);

        // Order demo dibuat seeder — tanpa pencatat; pembayaran baru punya.
        $this->assertNull($orders->first()['created_by_name']);
        $this->assertSame('Agung', $orders->firstWhere('id', $order->id)['payments'][0]['created_by_name']);
    }

    public function test_contribution_and_maintenance_record_creator()
    {
        $this->post(route('capital.contributions.store'), [
            'owner_id' => Owner::where('name', 'Raka')->sole()->id, 'kind' => 'equity',
            'destination' => 'reserve_fund', 'amount' => 1_000_000, 'contributed_on' => '2026-08-26',
        ])->assertSessionHasNoErrors();

        $asset = Asset::whereNull('disposed_on')->orderBy('id')->firstOrFail();
        $this->post(route('assets.maintenances.store', $asset), [
            'type' => 'routine', 'description' => 'Head cleaning', 'performed_on' => '2026-08-26', 'cost' => 0,
        ])->assertSessionHasNoErrors();

        $this->assertSame($this->user->id, OwnerContribution::latest('id')->firstOrFail()->created_by);
        $this->assertSame($this->user->id, AssetMaintenance::latest('id')->firstOrFail()->created_by);

        $this->get(route('capital.index'))->assertInertia(fn (Assert $page) => $page
            ->where('contributions.0.created_by_name', 'Agung'));
        $names = collect($this->get(route('assets.index'))->inertiaPage()['props']['assets'])
            ->firstWhere('id', $asset->id)['maintenances'];
        $this->assertContains('Agung', array_column($names, 'created_by_name'));
    }
}
