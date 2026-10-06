<?php

namespace Modules\Order\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Finance\Services\ProfitAndLoss;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Tests\TestCase;

/** Daftar order, status kerja, pembatalan, link hasil foto. */
class OrdersPageTest extends TestCase
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
        return Order::where('number', $number)->sole();
    }

    public function test_guest_is_redirected_to_login()
    {
        auth()->logout();

        $this->get(route('orders.index'))->assertRedirect(route('login'));
    }

    public function test_index_lists_newest_first_with_derived_figures()
    {
        $this->get(route('orders.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('order::index')
                ->has('orders', 12)
                ->where('orders.0.number', 'ORD-0012')
                ->where('orders.0.customer_name', 'Sinta Prameswari')
                ->where('orders.0.service_time', '14:00')
                ->where('orders.0.payment_status', 'partial')
                ->where('orders.0.paid_percent', 43)
                ->where('orders.0.next_status', 'done')
                // ORD-0011: wedding, biaya job 1,6 jt → margin 6,9 jt.
                ->where('orders.1.direct_cost', 1_600_000)
                ->where('orders.1.margin', 6_900_000)
                ->has('orders.1.job_costs', 2)
                // Walk-in: tanpa customer.
                ->where('orders.2.customer_name', null)
            );
    }

    public function test_advance_moves_exactly_one_step()
    {
        $this->patch(route('orders.advance', $this->order('ORD-0005')))->assertRedirect(route('orders.index'));

        $this->assertSame(WorkStatus::Scheduled, $this->order('ORD-0005')->work_status);
    }

    public function test_delivered_and_cancelled_cannot_advance()
    {
        $this->patch(route('orders.advance', $this->order('ORD-0001')))->assertSessionHasErrors('work_status');
        $this->patch(route('orders.advance', $this->order('ORD-0004')))->assertSessionHasErrors('work_status');

        $this->assertSame(WorkStatus::Delivered, $this->order('ORD-0001')->work_status);
        $this->assertSame(WorkStatus::Cancelled, $this->order('ORD-0004')->work_status);
    }

    public function test_cancel_keeps_deposit_as_revenue_and_appends_reason()
    {
        $revenueBefore = app(ProfitAndLoss::class)->revenue('2026-08');

        $this->patch(route('orders.cancel', $this->order('ORD-0008')), ['reason' => 'Customer pindah kota'])
            ->assertRedirect(route('orders.index'));

        $order = $this->order('ORD-0008');
        $this->assertSame(WorkStatus::Cancelled, $order->work_status);
        $this->assertStringContainsString('Customer pindah kota', $order->notes ?? '');
        // Refund belum ada (business-flow 2, pertanyaan 6): DP tetap omzet.
        $this->assertSame($revenueBefore, app(ProfitAndLoss::class)->revenue('2026-08'));
    }

    public function test_cancel_appends_without_erasing_existing_notes()
    {
        $order = $this->order('ORD-0011');
        $order->update(['notes' => 'Minta album 30 halaman']);

        $this->patch(route('orders.cancel', $order), ['reason' => 'Batal nikah']);

        $notes = $this->order('ORD-0011')->notes ?? '';
        $this->assertStringContainsString('Minta album 30 halaman', $notes);
        $this->assertStringContainsString('Batal nikah', $notes);
    }

    public function test_cancelled_order_margin_counts_only_money_received()
    {
        // ORD-0008: total 2,5 jt, DP 1 jt, biaya job 1,2 jt. Setelah batal, sisa
        // 1,5 jt tidak akan pernah ditagih — margin dari DP, bukan dari total.
        $this->patch(route('orders.cancel', $this->order('ORD-0008')));

        $this->get(route('orders.index'))
            ->assertInertia(function (Assert $page) {
                $row = collect($page->toArray()['props']['orders'])->firstWhere('number', 'ORD-0008');
                $this->assertSame(-200_000, $row['margin']);
                $this->assertSame(1_200_000, $row['direct_cost']);
            });
    }

    public function test_active_order_margin_still_from_order_total()
    {
        $this->get(route('orders.index'))
            ->assertInertia(function (Assert $page) {
                $row = collect($page->toArray()['props']['orders'])->firstWhere('number', 'ORD-0008');
                $this->assertSame(2_500_000 - 1_200_000, $row['margin']);
            });
    }

    public function test_cannot_cancel_twice()
    {
        $this->patch(route('orders.cancel', $this->order('ORD-0004')))->assertSessionHasErrors('work_status');
    }

    public function test_result_link_only_after_editing_is_done()
    {
        $this->patch(route('orders.result-link', $this->order('ORD-0005')), ['result_link' => 'https://drive.google.com/x'])
            ->assertSessionHasErrors('result_link');

        $this->patch(route('orders.result-link', $this->order('ORD-0008')), ['result_link' => 'https://drive.google.com/ord-0008'])
            ->assertSessionHasNoErrors();
        $this->assertSame('https://drive.google.com/ord-0008', $this->order('ORD-0008')->result_link);
    }

    public function test_result_link_must_be_a_url()
    {
        $this->patch(route('orders.result-link', $this->order('ORD-0008')), ['result_link' => 'bukan link'])
            ->assertSessionHasErrors('result_link');
    }
}
