<?php

namespace Modules\Finance\Services;

use Modules\Order\Enums\PaymentMethod;
use Modules\Order\Models\Payment;

/**
 * Kas Harian (spek 3.3): penerimaan per tanggal bayar × metode, untuk
 * mencocokkan laci kas (tunai) dan mutasi rekening (transfer/QRIS) tiap tutup
 * hari. Penerimaan saja — pengeluaran ada di Biaya.
 *
 * Membaca `payments.paid_on` dalam rentang bulan yang sama dengan
 * ProfitAndLoss::revenue(), jadi totalnya selalu sama dengan omzet Laba Rugi.
 * Pembayaran order batal ikut — uangnya memang masuk (DP hangus).
 */
final class CashReceipts
{
    public function forMonth(string $month): CashReceiptsMonth
    {
        // Agregasi di SQL, bukan memuat semua Payment: layar ini dibuka tiap
        // hari dan tabel payments tumbuh paling cepat.
        $rows = Payment::query()
            ->toBase()
            ->selectRaw('paid_on, method, SUM(amount) AS amount, COUNT(*) AS count')
            ->whereBetween('paid_on', [Periods::start($month), Periods::end($month)])
            ->groupBy('paid_on', 'method')
            ->orderBy('paid_on')
            ->get();

        $methods = array_map(fn (PaymentMethod $m) => $m->value, PaymentMethod::cases());
        $zero = array_fill_keys($methods, 0);

        /** @var array<string, array{by: array<string, int>, count: int}> $byDate */
        $byDate = [];
        foreach ($rows as $row) {
            $date = substr((string) $row->paid_on, 0, 10);
            $byDate[$date] ??= ['by' => $zero, 'count' => 0];
            $byDate[$date]['by'][(string) $row->method] = (int) $row->amount;
            $byDate[$date]['count'] += (int) $row->count;
        }

        $days = [];
        $totals = $zero;
        $count = 0;
        foreach ($byDate as $date => $d) {
            $days[] = new CashDay((string) $date, $d['by'], array_sum($d['by']), $d['count']);
            foreach ($d['by'] as $method => $amount) {
                $totals[$method] += $amount;
            }
            $count += $d['count'];
        }

        return new CashReceiptsMonth($month, $days, $totals, array_sum($totals), $count);
    }
}
