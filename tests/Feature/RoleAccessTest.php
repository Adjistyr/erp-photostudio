<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Asset\Models\Asset;
use Modules\Asset\Models\AssetCategory;
use Modules\Asset\Models\AssetMaintenance;
use Modules\Catalog\Models\CatalogItem;
use Modules\Customer\Models\Customer;
use Modules\Expense\Models\JobCost;
use Modules\Expense\Models\OperatingExpense;
use Modules\Finance\Models\OwnerContribution;
use Modules\Finance\Tests\Feature\DemoDataTestCase;
use Modules\Order\Models\Order;
use Modules\Order\Models\Payment;
use Modules\Order\Models\Refund;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * Peran owner / admin lintas modul (spek 5.1): route terlarang 403, props
 * finansial dihapus di server untuk admin, owner tidak berubah.
 */
class RoleAccessTest extends DemoDataTestCase
{
    private User $owner;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->owner = User::factory()->create();
        $this->admin = User::factory()->admin()->create();
    }

    /** @return array<string, array{string, array<string, string>}> */
    public static function financePages(): array
    {
        return [
            'laba rugi' => ['reports.profit-loss', []],
            'margin' => ['reports.margin', []],
            'penjualan' => ['reports.sales', []],
            'kas harian' => ['reports.cash', []],
            'ekspor kas' => ['reports.cash.export', []],
            'piutang (laporan)' => ['reports.receivables', []],
            'modal & bagi hasil' => ['capital.index', []],
            // Ekspor berisi HPP & margin / nilai buku.
            'ekspor order' => ['orders.export', []],
            'ekspor aset' => ['assets.export', []],
        ];
    }

    #[DataProvider('financePages')]
    public function test_admin_gets_403_on_finance_routes(string $route): void
    {
        $this->actingAs($this->admin)->get(route($route))->assertForbidden();
        $this->actingAs($this->owner)->get(route($route))->assertOk();
    }

    /** @return array<string, array{string}> */
    public static function ownerOnlyPages(): array
    {
        return [
            'tambah katalog' => ['catalog.create'],
            'ubah katalog' => ['catalog.edit'],
            'tambah aset' => ['assets.create'],
            'ubah aset' => ['assets.edit'],
            'kategori aset' => ['asset-categories.index'],
            'pengguna' => ['users.index'],
        ];
    }

    #[DataProvider('ownerOnlyPages')]
    public function test_admin_gets_403_on_management_pages(string $route): void
    {
        $params = match ($route) {
            'catalog.edit' => [CatalogItem::firstOrFail()],
            'assets.edit' => [Asset::firstOrFail()],
            default => [],
        };

        $this->actingAs($this->admin)->get(route($route, $params))->assertForbidden();
        $this->actingAs($this->owner)->get(route($route, $params))->assertOk();
    }

    public function test_admin_cannot_delete_money(): void
    {
        $this->actingAs($this->admin);
        // Admin boleh mencatat retur, tapi tidak menghapusnya.
        $order = Order::where('number', 'ORD-0003')->sole();
        $this->post(route('orders.refunds.store', $order), [
            'refunded_on' => '2026-08-26', 'amount' => 10_000, 'method' => 'cash', 'reason' => 'Cetak salah',
        ])->assertSessionHasNoErrors();

        $payment = Payment::firstOrFail();
        $refund = Refund::sole();
        $jobCost = JobCost::firstOrFail();
        $operating = OperatingExpense::firstOrFail();
        $maintenance = AssetMaintenance::firstOrFail();
        $contribution = OwnerContribution::firstOrFail();

        $this->delete(route('orders.payments.destroy', [$payment->order_id, $payment]))->assertForbidden();
        $this->delete(route('orders.refunds.destroy', [$refund->order_id, $refund]))->assertForbidden();
        $this->delete(route('expenses.job-costs.destroy', $jobCost))->assertForbidden();
        $this->delete(route('expenses.operating.destroy', $operating))->assertForbidden();
        $this->delete(route('assets.maintenances.destroy', [$maintenance->asset_id, $maintenance]))->assertForbidden();
        $this->delete(route('capital.contributions.destroy', $contribution))->assertForbidden();

        foreach ([$payment, $refund, $jobCost, $operating, $maintenance, $contribution] as $record) {
            $this->assertModelExists($record);
        }
    }

    public function test_owner_can_still_delete_money(): void
    {
        $jobCost = JobCost::whereDate('incurred_on', '>=', '2026-08-01')->firstOrFail();

        $this->actingAs($this->owner)
            ->delete(route('expenses.job-costs.destroy', $jobCost))
            ->assertSessionHasNoErrors();

        $this->assertModelMissing($jobCost);
    }

    public function test_admin_cannot_manage_catalog_assets_templates(): void
    {
        $this->actingAs($this->admin);
        $item = CatalogItem::firstOrFail();
        $asset = Asset::firstOrFail();
        $catalogBefore = CatalogItem::count();
        $assetsBefore = Asset::count();

        $this->post(route('catalog.store'), ['name' => 'Cetak A3', 'type' => 'product', 'price' => 50_000, 'unit_cost' => 10_000])->assertForbidden();
        $this->put(route('catalog.update', $item), ['name' => 'Diubah'])->assertForbidden();
        $this->patch(route('catalog.toggle-active', $item))->assertForbidden();
        $this->post(route('assets.store'), ['name' => 'Lensa'])->assertForbidden();
        $this->put(route('assets.update', $asset), ['name' => 'Diubah'])->assertForbidden();
        $this->patch(route('assets.dispose', $asset), ['disposed_on' => '2026-08-26', 'reason' => 'Rusak'])->assertForbidden();
        $this->post(route('asset-categories.store'), ['name' => 'Drone'])->assertForbidden();
        $this->put(route('communication.templates.update', 'reminder'), ['body' => 'Halo {nama}'])->assertForbidden();
        $this->post(route('expenses.operating.store'), ['spent_on' => '2026-08-26', 'category' => 'Sewa', 'description' => 'Sewa', 'amount' => 1])->assertForbidden();
        $this->post(route('capital.closings.store'))->assertForbidden();
        $this->post(route('capital.closings.reopen', '2026-07'))->assertForbidden();

        $this->assertSame($catalogBefore, CatalogItem::count());
        $this->assertSame($assetsBefore, Asset::count());
        $this->assertTrue($item->fresh()?->is_active);
        $this->assertNotSame('Diubah', $item->fresh()?->name);
        $this->assertNull($asset->fresh()?->disposed_on);
        $this->assertSame(0, AssetCategory::where('name', 'Drone')->count());
    }

    public function test_admin_can_record_daily_transactions(): void
    {
        $this->actingAs($this->admin);
        $product = CatalogItem::where('name', 'Cetak 4R')->sole();
        $package = CatalogItem::where('name', 'Paket Studio 1 Jam')->sole();
        $order = Order::where('number', 'ORD-0012')->sole();
        $printer = Asset::where('name', 'Printer foto')->sole();

        $this->post(route('pos.store'), [
            'items' => [['catalog_item_id' => $product->id, 'quantity' => 2]],
            'payments' => [['method' => 'cash', 'amount' => 10_000]],
        ])->assertRedirect()->assertSessionHasNoErrors();
        $this->post(route('orders.store'), [
            'business_line' => 'studio', 'customer_id' => Customer::where('name', 'Dewi Anggraini')->sole()->id,
            'service_date' => '2026-09-05', 'items' => [['catalog_item_id' => $package->id, 'quantity' => 1]],
        ])->assertRedirect()->assertSessionHasNoErrors();
        $this->post(route('orders.payments.store', $order), ['amount' => 50_000, 'method' => 'transfer', 'paid_on' => '2026-08-26'])
            ->assertRedirect()->assertSessionHasNoErrors();
        $this->post(route('expenses.job-costs.store'), ['order_id' => $order->id, 'category' => 'Crew', 'amount' => 150_000, 'incurred_on' => '2026-08-26'])
            ->assertRedirect()->assertSessionHasNoErrors();
        $this->post(route('customers.store'), ['name' => 'Lead Instagram'])->assertRedirect()->assertSessionHasNoErrors();
        $this->post(route('assets.maintenances.store', $printer), ['type' => 'routine', 'description' => 'Head cleaning', 'performed_on' => '2026-08-26', 'cost' => 0])
            ->assertRedirect()->assertSessionHasNoErrors();
        $this->patch(route('assets.status', $printer), ['status' => 'broken'])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertSame(1, Customer::where('name', 'Lead Instagram')->count());
        $this->assertSame(1, $printer->maintenances()->where('description', 'Head cleaning')->count());
    }

    public function test_order_props_hide_margin_for_admin(): void
    {
        $this->actingAs($this->admin)->get(route('orders.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('orders.data.0.total')
                ->missing('orders.data.0.margin')
                ->missing('orders.data.0.direct_cost')
                ->missing('orders.data.0.job_costs')
                ->missing('orders.data.0.items.0.unit_cost'));

        $order = Order::where('number', 'ORD-0012')->sole();
        $this->get(route('orders.show', $order))
            ->assertInertia(fn (Assert $page) => $page->missing('order.margin')->missing('order.job_costs'));

        $this->actingAs($this->owner)->get(route('orders.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('orders.data.0.margin')
                ->has('orders.data.0.direct_cost')
                ->has('orders.data.0.job_costs')
                ->has('orders.data.0.items.0.unit_cost'));
    }

    public function test_pos_products_hide_unit_cost_for_admin(): void
    {
        $this->actingAs($this->admin)->get(route('pos.index'))
            ->assertInertia(fn (Assert $page) => $page->has('products.0.price')->missing('products.0.unit_cost'));

        $this->actingAs($this->owner)->get(route('pos.index'))
            ->assertInertia(fn (Assert $page) => $page->has('products.0.unit_cost'));
    }

    public function test_catalog_hides_unit_cost_for_admin(): void
    {
        $this->actingAs($this->admin)->get(route('catalog.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('items.0.price')
                ->missing('items.0.unit_cost')
                ->missing('low_margin_ratio'));

        $this->actingAs($this->owner)->get(route('catalog.index'))
            ->assertInertia(fn (Assert $page) => $page->has('items.0.unit_cost')->has('low_margin_ratio'));
    }

    public function test_bundle_cost_hidden_for_admin(): void
    {
        $package = CatalogItem::where('name', 'Paket Studio 1 Jam')->sole();
        $print = CatalogItem::where('name', 'Cetak 4R')->sole();
        $package->components()->attach($print->id, ['quantity' => 5]);

        $this->actingAs($this->admin)
            ->put(route('catalog.components.update', $package), ['components' => []])
            ->assertForbidden();
        $this->assertSame(1, $package->components()->count());

        $adminItem = collect($this->get(route('catalog.index'))->viewData('page')['props']['items'])->firstWhere('id', $package->id);
        $this->assertSame('Cetak 4R', $adminItem['components'][0]['name']);
        $this->assertArrayNotHasKey('unit_cost', $adminItem['components'][0]);
        $this->assertArrayNotHasKey('bundle_cost', $adminItem);

        $this->post(route('orders.store'), [
            'business_line' => 'studio', 'customer_id' => Customer::where('name', 'Dewi Anggraini')->sole()->id,
            'service_date' => '2026-09-05', 'items' => [['catalog_item_id' => $package->id, 'quantity' => 1]],
        ])->assertSessionHasNoErrors();
        $order = Order::latest('id')->firstOrFail();

        $this->get(route('orders.show', $order))
            ->assertInertia(fn (Assert $page) => $page
                ->where('order.items.0.components.0.name', 'Cetak 4R')
                ->missing('order.items.0.components.0.unit_cost'));

        $this->actingAs($this->owner)->get(route('orders.show', $order))
            ->assertInertia(fn (Assert $page) => $page->has('order.items.0.components.0.unit_cost'));
        $ownerItem = collect($this->get(route('catalog.index'))->viewData('page')['props']['items'])->firstWhere('id', $package->id);
        $this->assertSame(5 * $print->unit_cost, $ownerItem['bundle_cost']);
    }

    public function test_dashboard_hides_revenue_and_break_even_for_admin(): void
    {
        $this->actingAs($this->admin)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('receivables.total')
                ->has('bookings_today')
                ->missing('revenue')
                ->missing('break_even')
                ->missing('unclosed_month')
                ->missing('replacements_shortfall'));

        $this->actingAs($this->owner)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page->has('revenue')->has('break_even')->has('replacements_shortfall'));
    }

    public function test_assets_hide_book_value_for_admin(): void
    {
        $asset = Asset::firstOrFail();

        $this->actingAs($this->admin)->get(route('assets.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('summary.purchase_value')
                ->missing('summary.book_value')
                ->missing('summary.allocation')
                ->missing('assets.0.book_value')
                ->missing('assets.0.allocation')
                ->missing('assets.0.accumulated')
                ->missing('by_category.0.book_value')
                ->missing('replacements.maintenance_balance')
                ->missing('replacements.shortfall'));
        $this->get(route('assets.show', $asset))
            ->assertInertia(fn (Assert $page) => $page
                ->has('asset.maintenances')
                ->missing('asset.book_value')
                ->missing('asset.funded_by')
                ->missing('maintenance_balance'));

        $this->actingAs($this->owner)->get(route('assets.index'))
            ->assertInertia(fn (Assert $page) => $page->has('summary.book_value')->has('assets.0.book_value')->has('replacements.shortfall'));
        $this->get(route('assets.show', $asset))
            ->assertInertia(fn (Assert $page) => $page->has('asset.funded_by')->has('maintenance_balance'));
    }

    public function test_expenses_hide_operating_for_admin(): void
    {
        $this->actingAs($this->admin)->get(route('expenses.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('job_costs')
                ->has('totals.job')
                ->missing('operating_expenses')
                ->missing('totals.operating'));

        $this->actingAs($this->owner)->get(route('expenses.index'))
            ->assertInertia(fn (Assert $page) => $page->has('operating_expenses')->has('totals.operating'));
    }

    public function test_shared_props_include_can_map(): void
    {
        $this->actingAs($this->admin)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.user.role', 'admin')
                ->where('auth.can.view_finance', false)
                ->where('auth.can.delete_money', false)
                ->where('auth.can.manage_users', false));

        $this->actingAs($this->owner)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page->where('auth.can', [
                'view_finance' => true, 'manage_catalog' => true, 'delete_money' => true, 'close_period' => true,
                'manage_users' => true, 'manage_assets' => true, 'manage_templates' => true, 'record_operating_expense' => true,
            ]));
    }

    public function test_existing_users_default_to_owner(): void
    {
        // Baris yang dibuat tanpa menyebut peran (mis. sebelum kolom ada) → owner.
        $id = User::query()->insertGetId([
            'name' => 'Akun Lama', 'email' => 'lama@example.com', 'password' => 'x',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->assertTrue(Schema::hasColumn('users', 'role'));
        $this->assertTrue(User::findOrFail($id)->isOwner());
    }
}
