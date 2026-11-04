<?php

namespace Modules\Order\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Catalog\Models\CatalogItem;
use Modules\Customer\Models\Customer;
use Modules\Expense\Models\JobCost;
use Modules\Finance\Services\ProfitAndLoss;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Modules\Shared\Enums\BusinessLine;
use Tests\TestCase;

/**
 * Estimasi biaya job jasa (masukan presentasi, Nov 2026): diisi di katalog
 * jasa, di-snapshot ke baris order, dipakai untuk estimasi margin order
 * selama biaya job aktual belum dicatat. Tidak masuk Laba Rugi.
 */
class OrderEstimatedCostTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');
        $this->actingAs(User::factory()->create());
    }

    private function service(): CatalogItem
    {
        return CatalogItem::where('name', 'Paket Studio 1 Jam')->sole();
    }

    private function storeStudioOrder(int $quantity = 1): Order
    {
        $this->post(route('orders.store'), [
            'business_line' => 'studio',
            'customer_id' => Customer::where('name', 'Dewi Anggraini')->sole()->id,
            'service_date' => '2026-09-05',
            'items' => [['catalog_item_id' => $this->service()->id, 'quantity' => $quantity]],
        ])->assertSessionHasNoErrors();

        return Order::with(['items', 'jobCosts'])->orderByDesc('id')->firstOrFail();
    }

    public function test_service_stores_estimated_cost()
    {
        $item = $this->service();

        $this->put(route('catalog.update', $item), [
            'name' => $item->name, 'type' => 'service', 'price' => $item->price,
            'category' => $item->category, 'estimated_cost' => 150_000,
        ])->assertSessionHasNoErrors();

        $this->assertSame(150_000, $item->fresh()?->estimated_cost);
    }

    public function test_product_cannot_carry_estimated_cost()
    {
        $this->post(route('catalog.store'), [
            'name' => 'Keychain', 'type' => 'product', 'price' => 25_000, 'unit_cost' => 8_000,
            'category' => 'Merchandise', 'estimated_cost' => 1_000,
        ])->assertSessionHasErrors('estimated_cost');
    }

    public function test_order_snapshots_estimate_and_ignores_later_catalog_change()
    {
        $this->service()->update(['estimated_cost' => 150_000]);
        $order = $this->storeStudioOrder(quantity: 2);

        $this->assertSame(150_000, $order->items->sole()->estimated_cost);
        $this->assertSame(300_000, $order->estimatedJobCost());

        $this->service()->update(['estimated_cost' => 999_000]);
        $this->assertSame(300_000, $order->fresh(['items', 'jobCosts'])?->estimatedJobCost());
    }

    public function test_estimate_drops_once_actual_job_cost_is_recorded()
    {
        $this->service()->update(['estimated_cost' => 150_000]);
        $order = $this->storeStudioOrder();

        $this->get(route('orders.show', $order))->assertInertia(fn (Assert $page) => $page
            ->where('order.estimated_job_cost', 150_000)
            ->where('order.estimated_margin', $order->total() - 150_000)
            // Margin aktual tidak tersentuh estimasi.
            ->where('order.margin', $order->total()));

        JobCost::create(['order_id' => $order->id, 'incurred_on' => '2026-08-26', 'category' => 'Fee crew', 'description' => 'Fotografer', 'amount' => 100_000]);

        $this->get(route('orders.show', $order))->assertInertia(fn (Assert $page) => $page
            ->where('order.estimated_job_cost', 0)
            ->where('order.estimated_margin', null)
            ->where('order.margin', $order->total() - 100_000));
    }

    public function test_cancelled_order_has_no_estimate()
    {
        $this->service()->update(['estimated_cost' => 150_000]);
        $order = $this->storeStudioOrder();
        $order->update(['work_status' => WorkStatus::Cancelled]);

        $this->assertSame(0, $order->fresh(['items', 'jobCosts'])?->estimatedJobCost());
    }

    public function test_estimate_never_reaches_profit_and_loss()
    {
        $pnl = app(ProfitAndLoss::class);
        $before = $pnl->forMonth('2026-08');
        $this->service()->update(['estimated_cost' => 150_000]);
        $order = $this->storeStudioOrder();
        $order->payments()->create(['paid_on' => '2026-08-26', 'amount' => $order->total(), 'method' => 'cash', 'note' => 'Pelunasan']);

        $after = $pnl->forMonth('2026-08');
        $this->assertSame($before->totalDirectCost, $after->totalDirectCost);
        $this->assertSame($before->grossProfit + $order->total(), $after->grossProfit);
        $this->assertSame(BusinessLine::Studio, $order->business_line);
    }

    public function test_admin_does_not_see_estimate()
    {
        $this->service()->update(['estimated_cost' => 150_000]);
        $order = $this->storeStudioOrder();

        $this->actingAs(User::factory()->admin()->create())
            ->get(route('orders.show', $order))
            ->assertInertia(fn (Assert $page) => $page
                ->missing('order.estimated_job_cost')
                ->missing('order.estimated_margin'));
    }
}
