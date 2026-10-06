<?php

namespace Modules\Expense\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Expense\Models\JobCost;
use Modules\Expense\Models\OperatingExpense;
use Modules\Finance\Models\PeriodClosing;
use Modules\Finance\Services\ProfitAndLoss;
use Modules\Order\Models\Order;
use Tests\TestCase;

/**
 * Biaya job (menempel ke order, mengurangi margin lini) vs biaya operasional
 * (bulanan, setelah laba kotor) — dua jenis yang tidak boleh tertukar.
 */
class ExpensesTest extends TestCase
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
        return Order::with(['items', 'jobCosts'])->where('number', $number)->sole();
    }

    /** @param  array<string, mixed>  $data */
    private function storeJob(array $data)
    {
        return $this->post(route('expenses.job-costs.store'), [
            'order_id' => $this->order('ORD-0012')->id,
            'category' => 'Crew',
            'amount' => 150_000,
            'incurred_on' => '2026-08-26',
            ...$data,
        ]);
    }

    /** @param  array<string, mixed>  $data */
    private function storeOperating(array $data)
    {
        return $this->post(route('expenses.operating.store'), [
            'category' => 'Utilitas',
            'amount' => 250_000,
            'spent_on' => '2026-08-20',
            ...$data,
        ]);
    }

    public function test_guest_is_redirected_to_login()
    {
        auth()->logout();

        $this->get(route('expenses.index'))->assertRedirect(route('login'));
    }

    public function test_index_lists_current_month_with_totals_from_profit_and_loss()
    {
        $this->get(route('expenses.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('expense::index')
                ->where('month', '2026-08')
                // ORD-0008 ×3, ORD-0009 ×1, ORD-0011 ×2 — terbaru dulu.
                ->has('job_costs', 6)
                ->where('job_costs.0.order_number', 'ORD-0009')
                ->where('job_costs.0.incurred_on', '2026-08-24')
                ->where('job_costs.0.business_line', 'studio')
                ->where('job_costs.1.order_number', 'ORD-0011')
                ->has('operating_expenses', 3)
                ->where('totals.job', 3_000_000)
                ->where('totals.operating', 4_800_000)
                // Pilihan order: studio & event yang tidak batal.
                ->has('orders', 7)
            );
    }

    public function test_other_month_and_invalid_month()
    {
        $this->get(route('expenses.index', ['month' => '2026-09']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('month', '2026-09')
                ->has('job_costs', 0)
                ->has('operating_expenses', 0)
                ->where('totals.job', 0)
            );

        $this->get(route('expenses.index', ['month' => 'bukan']))
            ->assertInertia(fn (Assert $page) => $page->where('month', '2026-08'));
    }

    public function test_store_job_cost_reduces_order_margin_and_line_cost()
    {
        $before = app(ProfitAndLoss::class)->jobCosts('2026-08');

        $this->storeJob(['description' => ''])
            ->assertRedirect(route('expenses.index', ['month' => '2026-08']))
            ->assertSessionHasNoErrors();

        $order = $this->order('ORD-0012');
        $this->assertSame(150_000, $order->directCost());
        // Keterangan kosong → kategori, supaya baris tabel tidak bolong.
        $this->assertSame('Crew', $order->jobCosts->sole()->description);
        $this->assertSame($before + 150_000, app(ProfitAndLoss::class)->jobCosts('2026-08'));
    }

    public function test_redirects_to_month_of_the_entry()
    {
        // Juli dibuka dulu — bulan yang sudah tutup buku menolak transaksi baru.
        PeriodClosing::query()->delete();

        $this->storeJob(['incurred_on' => '2026-07-30'])
            ->assertRedirect(route('expenses.index', ['month' => '2026-07']));
    }

    public function test_job_cost_rejected_for_retail_and_cancelled_orders()
    {
        // Retail sudah punya HPP bahan dari katalog — biaya job menghitung dua kali.
        $this->storeJob(['order_id' => $this->order('ORD-0010')->id])->assertSessionHasErrors('order_id');
        $this->storeJob(['order_id' => $this->order('ORD-0004')->id])->assertSessionHasErrors('order_id');

        $this->assertSame(6, JobCost::count());
    }

    public function test_job_cost_validation()
    {
        // Basis kas: biaya masa depan belum keluar.
        $this->storeJob(['amount' => 0, 'category' => '', 'incurred_on' => '2026-08-27', 'order_id' => 999_999])
            ->assertSessionHasErrors(['amount', 'category', 'incurred_on', 'order_id']);
    }

    public function test_store_operating_expense_lands_after_gross_profit()
    {
        $this->storeOperating(['description' => 'Air PDAM'])
            ->assertRedirect(route('expenses.index', ['month' => '2026-08']))
            ->assertSessionHasNoErrors();

        $this->assertSame('Air PDAM', OperatingExpense::orderByDesc('id')->firstOrFail()->description);
        $this->assertSame(5_050_000, app(ProfitAndLoss::class)->operatingExpenses('2026-08')->sum('amount'));
        // Tidak menyentuh biaya langsung.
        $this->assertSame(3_000_000, app(ProfitAndLoss::class)->jobCosts('2026-08'));
    }

    public function test_operating_expense_validation()
    {
        $this->storeOperating(['amount' => -5, 'category' => '', 'spent_on' => '26/08/2026'])
            ->assertSessionHasErrors(['amount', 'category', 'spent_on']);

        $this->assertSame(3, OperatingExpense::count());
    }
}
