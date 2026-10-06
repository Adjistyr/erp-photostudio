<?php

namespace Modules\Expense\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Expense\Models\JobCost;
use Modules\Expense\Models\OperatingExpense;
use Modules\Expense\Requests\StoreJobCostRequest;
use Modules\Expense\Requests\StoreOperatingExpenseRequest;
use Modules\Finance\Rules\OpenPeriod;
use Modules\Finance\Services\Periods;
use Modules\Finance\Services\ProfitAndLoss;
use Modules\Order\Models\Order;
use Modules\Shared\Enums\BusinessLine;
use Modules\Shared\Support\Money;

/**
 * Biaya — biaya job + biaya operasional per bulan (prompt 4.11).
 *
 * Kedua daftar difilter bulan yang SAMA, dan totalnya diambil dari
 * ProfitAndLoss — angka di layar ini harus persis sama dengan Laba Rugi.
 * (Prototype menampilkan biaya job semua waktu tapi operasional bulan ini,
 * sehingga "Total keluar" menjumlahkan dua periode berbeda.)
 *
 * Tidak ada edit: salah catat dihapus lalu dicatat ulang, hanya di bulan
 * yang belum tutup buku (docs/database.md).
 */
class ExpenseController extends Controller
{
    public function __construct(private readonly ProfitAndLoss $pnl) {}

    public function index(Request $request): Response
    {
        $month = Periods::orCurrent($request->query('month'));
        $range = [Periods::start($month)->toDateString(), Periods::end($month)->toDateString()];

        $jobCosts = JobCost::with('order.customer')
            ->whereBetween('incurred_on', $range)
            ->orderByDesc('incurred_on')
            ->orderByDesc('id')
            ->get();

        // Pilihan order di dialog: studio & event, termasuk yang batal —
        // biaya yang sudah keluar sebelum batal tetap dicatat ke ordernya.
        $orders = Order::with(['customer', 'items', 'jobCosts'])
            ->whereIn('business_line', [BusinessLine::Studio, BusinessLine::Event])
            ->orderByDesc('number')
            ->get();

        return Inertia::render('expense::index', [
            'month' => $month,
            'today' => now()->toDateString(),
            'job_costs' => $jobCosts->map(fn (JobCost $j) => [
                'id' => $j->id,
                'incurred_on' => $j->incurred_on->toDateString(),
                'order_number' => $j->order->number,
                'customer_name' => $j->order->customer?->name,
                'business_line' => $j->order->business_line->value,
                'category' => $j->category,
                'description' => $j->description,
                'amount' => $j->amount,
            ])->values()->all(),
            'operating_expenses' => $this->pnl->operatingExpenses($month)
                ->sortByDesc('spent_on')
                ->map(fn (OperatingExpense $e) => [
                    'id' => $e->id,
                    'spent_on' => $e->spent_on->toDateString(),
                    'category' => $e->category,
                    'description' => $e->description,
                    'amount' => $e->amount,
                ])->values()->all(),
            'totals' => [
                'job' => $this->pnl->jobCosts($month),
                'operating' => (int) $this->pnl->operatingExpenses($month)->sum('amount'),
            ],
            'orders' => $orders->map(fn (Order $o) => [
                'id' => $o->id,
                'number' => $o->number,
                'customer_name' => $o->customer?->name,
                'service_date' => $o->service_date->toDateString(),
                'job_cost' => (int) $o->jobCosts->sum('amount'),
                'cancelled' => $o->isCancelled(),
            ])->values()->all(),
        ]);
    }

    public function storeJobCost(StoreJobCostRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $order = Order::findOrFail($request->integer('order_id'));
        $order->jobCosts()->create([
            'incurred_on' => $data['incurred_on'],
            'category' => $data['category'],
            // Keterangan kosong → kategori, supaya baris tabel tidak bolong.
            'description' => trim((string) ($data['description'] ?? '')) ?: $data['category'],
            'amount' => $data['amount'],
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Biaya job '.Money::format($data['amount'])." untuk {$order->number} tercatat."]);

        return $this->backToMonth($data['incurred_on']);
    }

    public function storeOperatingExpense(StoreOperatingExpenseRequest $request): RedirectResponse
    {
        $data = $request->validated();
        OperatingExpense::create([
            'spent_on' => $data['spent_on'],
            'category' => $data['category'],
            'description' => trim((string) ($data['description'] ?? '')) ?: $data['category'],
            'amount' => $data['amount'],
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Biaya operasional '.Money::format($data['amount']).' tercatat.']);

        return $this->backToMonth($data['spent_on']);
    }

    /** Kembali ke bulan biaya yang baru dicatat — supaya barisnya langsung terlihat. */
    private function backToMonth(string $date): RedirectResponse
    {
        return to_route('expenses.index', ['month' => substr($date, 0, 7)]);
    }

    /** Hapus salah catat — hanya di bulan yang belum tutup buku. */
    public function destroyJobCost(JobCost $jobCost): RedirectResponse
    {
        OpenPeriod::ensureOpen($jobCost->incurred_on);
        $jobCost->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Biaya job '.Money::format($jobCost->amount).' dihapus.']);

        return back();
    }

    public function destroyOperatingExpense(OperatingExpense $operatingExpense): RedirectResponse
    {
        OpenPeriod::ensureOpen($operatingExpense->spent_on);
        $operatingExpense->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Biaya operasional '.Money::format($operatingExpense->amount).' dihapus.']);

        return back();
    }
}
