<?php

namespace Modules\Order\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Catalog\Models\CatalogItem;
use Modules\Customer\Models\Customer;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Modules\Order\Models\OrderEvent;
use Modules\Order\Models\Payment;
use Tests\TestCase;

/**
 * Riwayat perubahan order (docs/specs/0.2): setiap jalur tulis meninggalkan
 * event dalam transaksi yang sama.
 */
class OrderEventsTest extends TestCase
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

    /** @return list<string> tipe event order, terbaru dulu */
    private function types(Order $order): array
    {
        return $order->events()->get()->map(fn (OrderEvent $e) => $e->type->value)->all();
    }

    public function test_creating_order_with_deposit_records_created_and_payment_events()
    {
        $this->post(route('orders.store'), [
            'business_line' => 'studio',
            'customer_id' => Customer::where('name', 'Dewi Anggraini')->sole()->id,
            'service_date' => '2026-09-05',
            'items' => [['catalog_item_id' => CatalogItem::where('name', 'Paket Studio 1 Jam')->sole()->id, 'quantity' => 1]],
            'dp' => 100_000, 'dp_method' => 'transfer',
        ])->assertSessionHasNoErrors();

        $order = Order::latest('id')->firstOrFail();
        $this->assertSame(['payment_recorded', 'created'], $this->types($order));

        $payment = $order->events()->get()->first();
        $this->assertSame(100_000, $payment?->changes['amount']['to']);
        $this->assertSame('transfer', $payment?->changes['method']['to']);
        $this->assertSame($this->user->id, $payment?->user_id);
        $this->assertSame('scheduled', $order->events()->get()->last()?->changes['work_status']['to']);
    }

    public function test_pos_sale_records_created_and_payment_events()
    {
        $this->post(route('pos.store'), [
            'items' => [['catalog_item_id' => CatalogItem::where('name', 'Cetak 4R')->sole()->id, 'quantity' => 4]],
            'payments' => [['method' => 'cash', 'amount' => 20_000]],
        ])->assertSessionHasNoErrors();

        $order = Order::latest('id')->firstOrFail();
        $this->assertSame(['payment_recorded', 'created'], $this->types($order));
        $this->assertSame($order->total(), $order->events()->get()->first()?->changes['amount']['to']);
    }

    public function test_advance_records_from_and_to_status()
    {
        $order = Order::where('work_status', WorkStatus::Booking)->orderBy('id')->firstOrFail();

        $this->patch(route('orders.advance', $order))->assertSessionHasNoErrors();

        $event = $order->events()->get()->first();
        $this->assertSame('advanced', $event?->type->value);
        $this->assertEquals(['from' => 'booking', 'to' => 'scheduled'], $event?->changes['work_status']); // jsonb mengurutkan key
    }

    public function test_cancel_records_reason()
    {
        $order = $this->order('ORD-0008');

        $this->patch(route('orders.cancel', $order), ['reason' => 'Customer pindah kota'])->assertSessionHasNoErrors();

        $event = $order->events()->get()->first();
        $this->assertSame('cancelled', $event?->type->value);
        $this->assertSame('Customer pindah kota', $event?->changes['reason']['to']);
        $this->assertSame('cancelled', $event?->changes['work_status']['to']);
    }

    public function test_deleting_payment_records_amount_and_date()
    {
        $order = $this->order('ORD-0005');
        $this->post(route('orders.payments.store', $order), ['amount' => 100_000, 'method' => 'cash', 'paid_on' => '2026-08-26']);
        $payment = $order->payments()->latest('id')->firstOrFail();

        $this->from(route('orders.index'))->delete(route('orders.payments.destroy', [$order, $payment]))->assertSessionHasNoErrors();

        $event = $order->events()->get()->first();
        $this->assertSame('payment_deleted', $event?->type->value);
        $this->assertEquals(['from' => 100_000, 'to' => null], $event?->changes['amount']); // jsonb mengurutkan key
        $this->assertSame('2026-08-26', $event?->changes['paid_on']['from']);
        $this->assertDatabaseMissing('payments', ['id' => $payment->id]);
    }

    public function test_rejected_payment_delete_in_closed_month_records_nothing()
    {
        // Juli 2026 sudah tutup buku di data demo.
        $order = $this->order('ORD-0005');
        $payment = Payment::create(['order_id' => $order->id, 'paid_on' => '2026-07-10', 'amount' => 50_000, 'method' => 'cash', 'note' => 'DP']);
        $before = OrderEvent::count();

        $this->from(route('orders.index'))->delete(route('orders.payments.destroy', [$order, $payment]))->assertSessionHasErrors('delete');

        $this->assertSame($before, OrderEvent::count());
        $this->assertDatabaseHas('payments', ['id' => $payment->id]);
    }

    public function test_events_survive_user_deletion()
    {
        $order = Order::where('work_status', WorkStatus::Booking)->orderBy('id')->firstOrFail();
        $this->patch(route('orders.advance', $order));
        $event = $order->events()->get()->first();

        $this->user->delete();

        $this->assertNull($event?->fresh()?->user_id);
        $this->assertSame('advanced', $event?->fresh()?->type->value);
    }

    public function test_index_props_list_events_newest_first_with_user_name()
    {
        $order = Order::where('work_status', WorkStatus::Booking)->orderBy('id')->firstOrFail();
        $this->patch(route('orders.advance', $order));
        $this->travelTo('2026-08-26 10:00:00');
        $this->patch(route('orders.advance', $order));

        $events = collect($this->get(route('orders.index'))->inertiaPage()['props']['orders']['data'])
            ->firstWhere('id', $order->id)['events'];

        $this->assertSame(['advanced', 'advanced'], array_column($events, 'type'));
        $this->assertSame('in_progress', $events[0]['changes']['work_status']['to']);
        $this->assertSame('Agung', $events[0]['user_name']);
        $this->assertStringStartsWith('2026-08-26T10:00', $events[0]['at']);
    }
}
