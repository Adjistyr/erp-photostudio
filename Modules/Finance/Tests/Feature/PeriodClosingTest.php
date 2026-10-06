<?php

namespace Modules\Finance\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Finance\Enums\Fund;
use Modules\Finance\Models\PeriodClosing;
use Modules\Finance\Services\Funds;
use Modules\Finance\Services\Periods;
use Modules\Finance\Services\ProfitShareMonth;
use Modules\Finance\Services\ProfitSharing;
use Modules\Order\Models\Order;
use Tests\TestCase;

/**
 * Tutup buku manual (keputusan owner 2026-10-06). "Hari ini" 5 September:
 * Agustus sudah lewat tapi BELUM ditutup — transaksi telat masih boleh.
 */
class PeriodClosingTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->travelTo('2026-09-05 09:00:00');
        $this->user = User::factory()->create();
        $this->actingAs($this->user);
    }

    private function august(): ?ProfitShareMonth
    {
        return app(ProfitSharing::class)->forMonth('2026-08');
    }

    private function pay(string $date)
    {
        return $this->post(route('orders.payments.store', Order::where('number', 'ORD-0005')->sole()), [
            'amount' => 50_000, 'method' => 'cash', 'paid_on' => $date,
        ]);
    }

    public function test_past_month_is_not_final_until_closed()
    {
        $this->assertSame(['2026-07'], app(Periods::class)->closedMonths());
        $this->assertFalse($this->august()?->final);
        $this->assertSame('2026-08', app(Periods::class)->nextToClose());
    }

    public function test_late_entry_for_open_past_month_is_accepted()
    {
        // Transaksi tanggal 31 yang baru dicatat tanggal 5 — alasan tutup buku manual.
        $this->pay('2026-08-31')->assertSessionHasNoErrors();
    }

    public function test_closing_makes_month_final_and_moves_allocation_into_funds()
    {
        $before = app(Funds::class)->balance(Fund::Maintenance);

        $this->post(route('capital.closings.store'), ['month' => '2026-08'])
            ->assertRedirect(route('capital.index'))
            ->assertSessionHasNoErrors();

        $this->assertTrue($this->august()?->final);
        $this->assertSame($this->user->id, PeriodClosing::where('month', '2026-08')->sole()->closed_by);
        // Alokasi maintenance Agustus baru masuk dana setelah tutup buku.
        $this->assertSame($before + 790_450, app(Funds::class)->balance(Fund::Maintenance));
    }

    public function test_closed_month_rejects_new_entries()
    {
        $this->post(route('capital.closings.store'), ['month' => '2026-08']);

        $this->pay('2026-08-31')->assertSessionHasErrors('paid_on');
        $this->post(route('expenses.operating.store'), [
            'category' => 'Utilitas', 'amount' => 1, 'spent_on' => '2026-08-20',
        ])->assertSessionHasErrors('spent_on');
        // Bulan sesudahnya tetap terbuka.
        $this->pay('2026-09-01')->assertSessionHasNoErrors();
    }

    public function test_months_close_in_order_and_never_the_running_month()
    {
        // September = bulan berjalan; Oktober = masa depan; Juli sudah tutup.
        foreach (['2026-09', '2026-10', '2026-07'] as $month) {
            $this->post(route('capital.closings.store'), ['month' => $month])->assertSessionHasErrors('month');
        }
        $this->assertSame(1, PeriodClosing::count());
    }

    public function test_only_latest_closed_month_can_be_reopened_and_it_is_logged()
    {
        $this->post(route('capital.closings.store'), ['month' => '2026-08']);

        // Juli bukan yang terakhir ditutup.
        $this->post(route('capital.closings.reopen', '2026-07'))->assertSessionHasErrors('month');

        $this->post(route('capital.closings.reopen', '2026-08'))
            ->assertRedirect(route('capital.index'))
            ->assertSessionHasNoErrors();

        $row = PeriodClosing::where('month', '2026-08')->sole();
        $this->assertSame($this->user->id, $row->reopened_by);
        $this->assertNotNull($row->reopened_at);
        $this->assertFalse($this->august()?->final);
        $this->pay('2026-08-31')->assertSessionHasNoErrors();

        // Tutup lagi = baris baru; riwayat buka kembali tetap ada.
        $this->post(route('capital.closings.store'), ['month' => '2026-08'])->assertSessionHasNoErrors();
        $this->assertSame(2, PeriodClosing::where('month', '2026-08')->count());
    }

    public function test_capital_page_and_dashboard_expose_closing_state()
    {
        $this->get(route('capital.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('next_to_close', '2026-08')
                ->where('last_closed', '2026-07')
                ->where('history.1.month', '2026-08')
                ->where('history.1.final', false)
            );

        $this->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page->where('unclosed_month', '2026-08'));
    }
}
