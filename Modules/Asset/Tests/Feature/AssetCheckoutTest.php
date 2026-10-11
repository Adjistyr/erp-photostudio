<?php

namespace Modules\Asset\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Asset\Enums\AssetStatus;
use Modules\Asset\Models\Asset;
use Modules\Asset\Models\AssetCheckout;
use Modules\Order\Models\Order;
use Tests\TestCase;

/** Peminjaman alat ke event (spek 8.4). */
class AssetCheckoutTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');
        $this->actingAs(User::factory()->create());
    }

    private function asset(string $name = 'Lighting studio'): Asset
    {
        return Asset::where('name', $name)->sole();
    }

    private function order(string $number): Order
    {
        return Order::where('number', $number)->sole();
    }

    /** @param  array<string, mixed>  $data */
    private function checkout(Asset $asset, array $data = [])
    {
        return $this->post(route('assets.checkouts.store', $asset), [
            'quantity' => 1, 'holder' => 'Raka', 'order_id' => $this->order('ORD-0011')->id,
            'checked_out_on' => '2026-08-26', 'due_back_on' => '2026-08-28', 'note' => 'Prewed outdoor', ...$data,
        ]);
    }

    public function test_checkout_records_holder_order_and_dates()
    {
        $lighting = $this->asset();

        $this->checkout($lighting)->assertSessionHasNoErrors();

        $c = $lighting->checkouts()->sole();
        $this->assertSame([1, 'Raka', 'ORD-0011', '2026-08-28', null], [$c->quantity, $c->holder, $c->order?->number, $c->due_back_on?->toDateString(), $c->returned_on]);
        $this->assertSame(1, $lighting->unitsOut());
    }

    public function test_quantity_cannot_exceed_available_units()
    {
        $lighting = $this->asset(); // 2 unit
        $this->checkout($lighting)->assertSessionHasNoErrors();

        $this->checkout($lighting, ['quantity' => 2])->assertSessionHasErrors(['quantity' => 'Tersedia 1 dari 2 unit.']);
        $this->checkout($lighting, ['quantity' => 1])->assertSessionHasNoErrors();
    }

    public function test_disposed_or_broken_asset_cannot_go_out()
    {
        $printer = $this->asset('Printer foto');
        $printer->update(['status' => AssetStatus::Broken]);
        $this->checkout($printer)->assertSessionHasErrors(['quantity' => 'Aset sedang rusak — tandai aktif dulu bila sudah diperbaiki.']);

        $kamera = $this->asset('Kamera mirrorless');
        $this->patch(route('assets.dispose', $kamera), ['reason' => 'Hilang', 'disposed_on' => '2026-08-26']);
        $this->checkout($kamera)->assertSessionHasErrors(['quantity' => 'Aset sudah dilepas — tidak bisa dipinjamkan.']);
    }

    public function test_order_must_be_studio_or_event_and_not_cancelled()
    {
        $retail = Order::where('business_line', 'retail')->orderBy('id')->firstOrFail();
        $this->checkout($this->asset(), ['order_id' => $retail->id])
            ->assertSessionHasErrors(['order_id' => 'Order harus studio atau event yang tidak batal.']);
        // ORD-0004 = batal.
        $this->checkout($this->asset(), ['order_id' => $this->order('ORD-0004')->id])->assertSessionHasErrors('order_id');
        // Tanpa order tetap boleh.
        $this->checkout($this->asset(), ['order_id' => null])->assertSessionHasNoErrors();
        $this->checkout($this->asset(), ['due_back_on' => '2026-08-25'])
            ->assertSessionHasErrors(['due_back_on' => 'Rencana kembali tidak boleh sebelum tanggal keluar.']);
    }

    public function test_return_and_return_broken_marks_asset_broken()
    {
        $lighting = $this->asset();
        $this->checkout($lighting);
        $this->checkout($lighting);
        [$a, $b] = $lighting->checkouts()->orderBy('id')->get()->all();

        $this->patch(route('assets.checkouts.return', [$lighting, $a]), ['returned_on' => '2026-08-26'])->assertSessionHasNoErrors();
        $this->assertSame([AssetStatus::Active, 1], [$lighting->fresh()?->status, $lighting->unitsOut()]);
        // Tidak bisa dikembalikan dua kali.
        $this->patch(route('assets.checkouts.return', [$lighting, $a]), ['returned_on' => '2026-08-26'])->assertSessionHasErrors('returned_on');

        $this->patch(route('assets.checkouts.return', [$lighting, $b]), ['returned_on' => '2026-08-26', 'broken' => true])->assertSessionHasNoErrors();
        $this->assertSame([AssetStatus::Broken, 0], [$lighting->fresh()?->status, $lighting->unitsOut()]);
    }

    public function test_overdue_appears_in_asset_pages_and_dashboard()
    {
        $lighting = $this->asset();
        $this->checkout($lighting, ['checked_out_on' => '2026-08-20', 'due_back_on' => '2026-08-22']);

        $this->get(route('assets.index'))->assertInertia(fn (Assert $page) => $page
            ->has('overdue_checkouts', 1)
            ->where('overdue_checkouts.0.holder', 'Raka')
            ->where('assets', fn ($rows) => collect($rows)->firstWhere('name', 'Lighting studio')['units_out'] === 1));
        $this->get(route('assets.show', $lighting))->assertInertia(fn (Assert $page) => $page
            ->where('asset.available_units', 1)
            ->where('asset.checkouts.0.overdue', true)
            ->where('asset.checkouts.0.order.number', 'ORD-0011')
            ->where('order_options', fn ($opts) => collect($opts)->contains('number', 'ORD-0011') && ! collect($opts)->contains('number', 'ORD-0004')));
        $this->get(route('dashboard'))->assertInertia(fn (Assert $page) => $page->where('overdue_checkouts_count', 1));
    }

    public function test_asset_still_out_cannot_be_disposed()
    {
        $lighting = $this->asset();
        $this->checkout($lighting);

        $this->patch(route('assets.dispose', $lighting), ['reason' => 'Dijual', 'disposed_on' => '2026-08-26', 'sale_price' => 1])
            ->assertSessionHasErrors(['reason' => 'Masih dipinjam 1 unit — kembalikan dulu sebelum dilepas.']);
        $this->assertFalse($lighting->fresh()?->isDisposed());
    }

    public function test_order_sheet_lists_checked_out_assets()
    {
        $this->checkout($this->asset());

        $orders = collect($this->get(route('orders.index'))->inertiaPage()['props']['orders']['data'])->keyBy('number');
        $this->assertSame(['Lighting studio', 1, 'Raka', null], [
            $orders['ORD-0011']['asset_checkouts'][0]['asset_name'], $orders['ORD-0011']['asset_checkouts'][0]['quantity'],
            $orders['ORD-0011']['asset_checkouts'][0]['holder'], $orders['ORD-0011']['asset_checkouts'][0]['returned_on'],
        ]);
    }

    public function test_destroy_and_other_asset_checkout_not_found()
    {
        $lighting = $this->asset();
        $this->checkout($lighting);
        $c = $lighting->checkouts()->sole();

        $this->delete(route('assets.checkouts.destroy', [$this->asset('Printer foto'), $c]))->assertNotFound();
        $this->delete(route('assets.checkouts.destroy', [$lighting, $c]))->assertSessionHasNoErrors();
        $this->assertNull(AssetCheckout::find($c->id));
    }

    public function test_guest_cannot_checkout()
    {
        auth()->logout();
        $this->checkout($this->asset())->assertRedirect(route('login'));
    }
}
