<?php

namespace Modules\Order\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Customer\Models\Customer;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Modules\Shared\Enums\BusinessLine;
use Tests\TestCase;

/** Pencarian + filter + paginasi Order & Booking (docs/specs/3.1). */
class OrdersSearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-08-26 09:00:00');
        $this->actingAs(User::factory()->create());
    }

    /**
     * @param  array<string, string|int>  $query
     * @return array<string, mixed>
     */
    private function list(array $query = []): array
    {
        return $this->get(route('orders.index', $query))->assertOk()->inertiaPage()['props'];
    }

    /** @return list<string> */
    private function numbers(array $query): array
    {
        return array_column($this->list($query)['orders']['data'], 'number');
    }

    public function test_search_by_order_number_returns_single_row()
    {
        $this->assertSame(['ORD-0012'], $this->numbers(['q' => 'ORD-0012']));
        $this->assertSame(['ORD-0012'], $this->numbers(['q' => 'ord-0012']));
    }

    public function test_order_number_search_does_not_match_phones_containing_its_digits()
    {
        // HP mengandung "0012" — "ORD-0012" bukan nomor telepon, jadi tidak boleh ikut.
        $c = Customer::create(['name' => 'Kebetulan', 'phone' => '0812-0012-9999']);
        Order::create(['number' => 'ORD-0100', 'customer_id' => $c->id, 'business_line' => BusinessLine::Studio,
            'service_date' => '2026-09-01', 'work_status' => WorkStatus::Booking]);

        $this->assertSame(['ORD-0012'], $this->numbers(['q' => 'ORD-0012']));
        // Sebaliknya, mengetik nomor HP-nya menemukan order itu.
        $this->assertSame(['ORD-0100'], $this->numbers(['q' => '0812 0012']));
    }

    public function test_search_by_customer_name_is_case_insensitive()
    {
        $this->assertSame(['ORD-0009', 'ORD-0001'], $this->numbers(['q' => 'BUDI']));
    }

    public function test_search_by_phone_ignores_formatting_and_prefix()
    {
        // Sinta: 0812-3344-5566 → ORD-0012, ORD-0002.
        $this->assertSame(['ORD-0012', 'ORD-0002'], $this->numbers(['q' => '+62 812-3344']));
        $this->assertSame(['ORD-0012', 'ORD-0002'], $this->numbers(['q' => '08123344']));
    }

    public function test_pay_filter_matches_derived_payment_status()
    {
        $all = Order::with(['items', 'payments'])->get();
        foreach (['unpaid', 'partial', 'paid'] as $pay) {
            $expected = $all->filter(fn (Order $o) => $o->paymentStatus()->value === $pay)->pluck('number')->sort()->values()->all();
            $actual = $this->numbers(['pay' => $pay]);
            sort($actual);
            $this->assertSame($expected, $actual, $pay);
        }
    }

    public function test_pay_filter_respects_discount()
    {
        // Retail berdiskon: dibayar = total − diskon → Lunas, bukan DP.
        $order = Order::create(['number' => 'ORD-0101', 'business_line' => BusinessLine::Retail,
            'service_date' => '2026-08-26', 'work_status' => WorkStatus::Delivered, 'discount' => 5_000]);
        $order->items()->create(['name' => 'Cetak 4R', 'quantity' => 4, 'unit_price' => 5_000, 'unit_cost' => 1_500]);
        $order->payments()->create(['paid_on' => '2026-08-26', 'amount' => 15_000, 'method' => 'cash', 'note' => 'Pelunasan']);

        $this->assertContains('ORD-0101', $this->numbers(['pay' => 'paid']));
        $this->assertNotContains('ORD-0101', $this->numbers(['pay' => 'partial']));
    }

    public function test_pagination_splits_at_25_and_keeps_filters()
    {
        foreach (range(1, 30) as $n) {
            Order::create(['number' => sprintf('ORD-9%03d', $n), 'business_line' => BusinessLine::Studio,
                'service_date' => '2026-09-01', 'work_status' => WorkStatus::Booking]);
        }
        $studioCount = Order::where('business_line', BusinessLine::Studio)->count();

        $first = $this->list(['line' => 'studio']);
        $this->assertSame([1, 2, $studioCount, 25], [$first['orders']['current_page'], $first['orders']['last_page'], $first['orders']['total'], count($first['orders']['data'])]);
        $this->assertSame('studio', $first['filters']['line']);

        $second = $this->list(['line' => 'studio', 'page' => 2]);
        $this->assertCount($studioCount - 25, $second['orders']['data']);
        $this->assertSame(['studio'], array_values(array_unique(array_column($second['orders']['data'], 'business_line'))));
    }

    public function test_invalid_filter_values_are_ignored()
    {
        $props = $this->list(['line' => 'foo', 'status' => 'bar', 'from' => '2026-13-45']);

        $this->assertSame(Order::count(), $props['orders']['total']);
        $this->assertSame(['q' => ''], $props['filters']);
    }

    public function test_page_out_of_range_returns_empty_data_not_404()
    {
        $props = $this->list(['page' => 99]);

        $this->assertSame([], $props['orders']['data']);
        $this->assertSame(Order::count(), $props['orders']['total']);
    }

    public function test_date_range_and_status_filter()
    {
        $numbers = $this->numbers(['from' => '2026-08-20', 'to' => '2026-08-24', 'status' => 'delivered']);
        sort($numbers);

        // ORD-0006 (20 Agu retail), ORD-0007 (21 Agu), ORD-0009 (24 Agu) — semua Diserahkan.
        $this->assertSame(['ORD-0006', 'ORD-0007', 'ORD-0009'], $numbers);
    }
}
