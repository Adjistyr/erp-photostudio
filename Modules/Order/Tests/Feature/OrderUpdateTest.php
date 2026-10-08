<?php

namespace Modules\Order\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Catalog\Models\CatalogItem;
use Modules\Customer\Models\Customer;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Modules\Order\Models\OrderEvent;
use Modules\Order\Models\OrderItem;
use Tests\TestCase;

/** Edit order studio/event (docs/specs/1.2-edit-order.md). */
class OrderUpdateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');
        $this->actingAs(User::factory()->create());
    }

    private function order(string $number): Order
    {
        return Order::with(['items', 'payments', 'customer'])->where('number', $number)->sole();
    }

    private function catalog(string $name): CatalogItem
    {
        return CatalogItem::where('name', $name)->sole();
    }

    /**
     * Isian form persis seperti tersimpan — tiap test hanya mengubah yang diuji.
     *
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(Order $order, array $overrides = []): array
    {
        return [
            'customer_id' => $order->customer_id,
            'service_date' => $order->service_date->toDateString(),
            'service_time' => $order->service_time === null ? '' : substr($order->service_time, 0, 5),
            'location' => $order->location ?? '',
            'notes' => $order->notes ?? '',
            'items' => $order->items->map(fn (OrderItem $i) => [
                'id' => $i->id, 'catalog_item_id' => $i->catalog_item_id, 'quantity' => $i->quantity,
            ])->values()->all(),
            ...$overrides,
        ];
    }

    private function update(Order $order, array $overrides = [])
    {
        return $this->put(route('orders.update', $order), $this->payload($order, $overrides));
    }

    private function lastEvent(Order $order): ?OrderEvent
    {
        return $order->events()->first();
    }

    public function test_edit_page_shows_order_with_locked_flags()
    {
        $this->get(route('orders.edit', $this->order('ORD-0005')))
            ->assertInertia(fn (Assert $page) => $page
                ->component('order::edit')
                ->where('order.number', 'ORD-0005')
                ->where('order.editable', true)
                ->where('order.items.0.catalog_item_id', $this->catalog('Paket Studio 1 Jam')->id)
                ->where('locked.schedule', false)
                ->where('locked.items', false)
                ->has('customers')
                ->has('catalog')
            );

        $this->get(route('orders.edit', $this->order('ORD-0001')))
            ->assertInertia(fn (Assert $page) => $page->where('locked.schedule', true));
    }

    public function test_reschedule_is_saved_with_updated_event_and_status_unchanged()
    {
        $order = $this->order('ORD-0005');
        // Tanggal lama di Juli (sudah tutup buku) — jadwal bukan uang, tidak dicek tutup buku.
        $order->update(['service_date' => '2026-07-20']);
        $order->refresh();

        $this->update($order, ['service_date' => '2026-09-12', 'service_time' => '15:30'])
            ->assertRedirect(route('orders.index'))
            ->assertSessionHasNoErrors();

        $order->refresh();
        $this->assertSame('2026-09-12', $order->service_date->toDateString());
        $this->assertSame(WorkStatus::Booking, $order->work_status);

        $event = $this->lastEvent($order);
        $this->assertSame('updated', $event?->type->value);
        $this->assertEquals(['from' => '2026-07-20', 'to' => '2026-09-12'], $event?->changes['service_date']);
        $this->assertEquals(['from' => '10:00', 'to' => '15:30'], $event?->changes['service_time']);
        $this->assertArrayNotHasKey('items', $event?->changes ?? []);
    }

    public function test_items_sync_deletes_updates_and_adds()
    {
        $order = $this->order('ORD-0005');
        $a = $order->items->sole();
        $addon = $this->catalog('Add-on Editing Lanjutan');
        $b = $order->items()->create(['catalog_item_id' => $addon->id, 'name' => $addon->name, 'quantity' => 2, 'unit_price' => $addon->price]);
        $order->refresh();
        $family = $this->catalog('Paket Studio Keluarga 2 Jam');

        $this->update($order, ['items' => [
            ['id' => $a->id, 'catalog_item_id' => $a->catalog_item_id, 'quantity' => 3],
            ['id' => null, 'catalog_item_id' => $family->id, 'quantity' => 1],
        ]])->assertSessionHasNoErrors();

        $items = $order->items()->orderBy('id')->get();
        $this->assertCount(2, $items);
        $this->assertSame([$a->id, 3, 350_000], [$items[0]->id, $items[0]->quantity, $items[0]->unit_price]);
        $this->assertDatabaseMissing('order_items', ['id' => $b->id]);
        $this->assertSame([$family->id, $family->price], [$items[1]->catalog_item_id, $items[1]->unit_price]);

        $changes = $this->lastEvent($order)?->changes ?? [];
        $this->assertSame('Paket Studio 1 Jam ×3, Paket Studio Keluarga 2 Jam', $changes['items']['to']);
        $this->assertSame(350_000 * 3 + $family->price, $changes['total']['to']);
    }

    public function test_kept_item_keeps_deal_price_after_catalog_price_change()
    {
        $order = $this->order('ORD-0005');
        $a = $order->items->sole();
        $a->catalogItem?->update(['price' => 400_000]);

        $this->update($order, ['items' => [
            ['id' => $a->id, 'catalog_item_id' => $a->catalog_item_id, 'quantity' => 2],
            ['id' => null, 'catalog_item_id' => $a->catalog_item_id, 'quantity' => 1],
        ]])->assertSessionHasNoErrors();

        $prices = $order->items()->orderBy('id')->pluck('unit_price')->all();
        // Harga deal lama tetap; baris baru dengan paket yang sama memakai harga baru.
        $this->assertSame([350_000, 400_000], $prices);
        $this->assertSame(350_000 * 2 + 400_000, $order->refresh()->load('items')->total());
    }

    public function test_total_below_paid_is_rejected_and_nothing_changes()
    {
        // ORD-0011: Wedding 8,5 jt, DP 2,5 jt. Ganti ke Prewedding 2,5 jt − 1 rupiah tidak mungkin;
        // pakai Add-on 150 rb saja → di bawah DP.
        $order = $this->order('ORD-0011');
        $before = OrderEvent::count();

        $this->update($order, ['items' => [
            ['id' => null, 'catalog_item_id' => $this->catalog('Add-on Editing Lanjutan')->id, 'quantity' => 1],
        ]])->assertSessionHasErrors('items');

        $this->assertSame('Paket Wedding Full Day', $order->items()->sole()->name);
        $this->assertSame($before, OrderEvent::count());
    }

    public function test_retail_and_cancelled_orders_cannot_be_edited()
    {
        foreach (['ORD-0002', 'ORD-0004'] as $number) {
            $order = $this->order($number);
            $this->get(route('orders.edit', $order))->assertNotFound();
            $this->update($order, ['notes' => 'x'])->assertSessionHasErrors('order');
        }
    }

    public function test_delivered_order_allows_only_notes_and_customer()
    {
        $order = $this->order('ORD-0001');
        $other = Customer::where('id', '!=', $order->customer_id)->orderBy('id')->firstOrFail();

        $this->update($order, ['notes' => 'Salah customer, sudah dikoreksi', 'customer_id' => $other->id])
            ->assertSessionHasNoErrors();
        $this->assertSame($other->id, $order->refresh()->customer_id);

        $order = $this->order('ORD-0001');
        $this->update($order, ['service_time' => '09:00'])->assertSessionHasErrors('service_time');

        $line = $order->items->sole();
        $this->update($order, ['items' => [['id' => $line->id, 'catalog_item_id' => $line->catalog_item_id, 'quantity' => 2]]])
            ->assertSessionHasErrors('items');
    }

    public function test_item_id_from_other_order_or_duplicated_is_rejected()
    {
        $order = $this->order('ORD-0005');
        $foreign = $this->order('ORD-0012')->items->sole();
        $own = $order->items->sole();

        $this->update($order, ['items' => [['id' => $foreign->id, 'catalog_item_id' => $foreign->catalog_item_id, 'quantity' => 1]]])
            ->assertSessionHasErrors('items');
        $this->update($order, ['items' => [
            ['id' => $own->id, 'catalog_item_id' => $own->catalog_item_id, 'quantity' => 1],
            ['id' => $own->id, 'catalog_item_id' => $own->catalog_item_id, 'quantity' => 5],
        ]])->assertSessionHasErrors('items');

        $this->assertSame(1, $foreign->refresh()->quantity);
    }

    public function test_changing_package_on_existing_row_is_rejected()
    {
        $order = $this->order('ORD-0005');
        $own = $order->items->sole();

        $this->update($order, ['items' => [
            ['id' => $own->id, 'catalog_item_id' => $this->catalog('Paket Studio Keluarga 2 Jam')->id, 'quantity' => 1],
        ]])->assertSessionHasErrors('items.0.catalog_item_id');
    }

    public function test_new_row_with_inactive_package_is_rejected_but_old_row_may_keep_one()
    {
        $order = $this->order('ORD-0005');
        $own = $order->items->sole();
        $own->catalogItem?->update(['is_active' => false]);

        $this->update($order, ['items' => [['id' => $own->id, 'catalog_item_id' => $own->catalog_item_id, 'quantity' => 2]]])
            ->assertSessionHasNoErrors();

        $order = $this->order('ORD-0005');
        $this->update($order, ['items' => [
            ['id' => $own->id, 'catalog_item_id' => $own->catalog_item_id, 'quantity' => 2],
            ['id' => null, 'catalog_item_id' => $own->catalog_item_id, 'quantity' => 1],
        ]])->assertSessionHasErrors('items.1.catalog_item_id');

        // Halaman edit tetap menampilkan paket nonaktif yang dirujuk baris lama.
        $this->get(route('orders.edit', $order))->assertInertia(fn (Assert $page) => $page
            ->where('catalog', fn ($catalog) => collect($catalog)->contains(fn ($c) => $c['id'] === $own->catalog_item_id && $c['is_active'] === false)));
    }

    public function test_no_change_records_no_event()
    {
        $order = $this->order('ORD-0012');
        $before = OrderEvent::count();
        $updatedAt = $order->updated_at;

        $this->update($order)
            ->assertRedirect(route('orders.index'))
            ->assertSessionHas('inertia.flash_data.toast.message', 'Tidak ada yang berubah.');

        $this->assertSame($before, OrderEvent::count());
        $this->assertEquals($updatedAt, $order->refresh()->updated_at);
    }

    public function test_customer_change_is_recorded_by_name()
    {
        $order = $this->order('ORD-0012');
        $from = $order->customer?->name;
        $other = Customer::where('id', '!=', $order->customer_id)->orderBy('id')->firstOrFail();

        $this->update($order, ['customer_id' => $other->id])->assertSessionHasNoErrors();

        $this->assertEquals(['from' => $from, 'to' => $other->name], $this->lastEvent($order)?->changes['customer_id']);
    }

    public function test_index_marks_only_studio_and_event_orders_editable()
    {
        $orders = collect($this->get(route('orders.index'))->inertiaPage()['props']['orders'])->keyBy('number');

        $this->assertTrue($orders['ORD-0005']['editable']);
        $this->assertTrue($orders['ORD-0001']['editable']);
        $this->assertFalse($orders['ORD-0002']['editable']);
        $this->assertFalse($orders['ORD-0004']['editable']);
    }

    public function test_update_can_add_custom_item_and_change_its_quantity_only()
    {
        $order = $this->order('ORD-0005');
        $catalogRow = $order->items->sole();

        $this->update($order, ['items' => [
            ['id' => $catalogRow->id, 'catalog_item_id' => $catalogRow->catalog_item_id, 'quantity' => 1],
            ['id' => null, 'catalog_item_id' => null, 'name' => 'Sewa kostum', 'unit_price' => 75_000, 'quantity' => 1],
        ]])->assertSessionHasNoErrors();

        $order = $this->order('ORD-0005');
        $custom = $order->items->firstWhere('catalog_item_id', null);
        $this->assertSame(['Sewa kostum', 75_000], [$custom?->name, $custom?->unit_price]);

        $keep = fn (array $customRow) => ['items' => [
            ['id' => $catalogRow->id, 'catalog_item_id' => $catalogRow->catalog_item_id, 'quantity' => 1],
            ['id' => $custom?->id, 'catalog_item_id' => null, ...$customRow],
        ]];
        $this->update($order, $keep(['name' => 'Sewa kostum', 'unit_price' => 75_000, 'quantity' => 2]))->assertSessionHasNoErrors();
        $this->assertSame(2, $custom?->refresh()->quantity);

        // Ubah harga/nama baris custom lama = hapus + tambah, bukan diedit.
        $order = $this->order('ORD-0005');
        $this->update($order, $keep(['name' => 'Sewa kostum', 'unit_price' => 50_000, 'quantity' => 2]))->assertSessionHasErrors('items.1.name');
        $this->update($order, $keep(['name' => 'Kostum', 'unit_price' => 75_000, 'quantity' => 2]))->assertSessionHasErrors('items.1.name');
        // Baris custom lama tidak bisa "diubah" jadi paket katalog.
        $this->update($order, ['items' => [
            ['id' => $catalogRow->id, 'catalog_item_id' => $catalogRow->catalog_item_id, 'quantity' => 1],
            ['id' => $custom?->id, 'catalog_item_id' => $catalogRow->catalog_item_id, 'quantity' => 2],
        ]])->assertSessionHasErrors('items.1.name');
        $this->assertSame(75_000, $custom?->refresh()->unit_price);
    }
}
