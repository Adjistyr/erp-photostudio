<?php

namespace Modules\Finance\Services;

use Modules\Order\Enums\PaymentMethod;
use Modules\Order\Models\Payment;
use Modules\Order\Models\Refund;

/**
 * Kas Harian (spek 3.3): penerimaan per tanggal bayar × metode, untuk
 * mencocokkan laci kas (tunai) dan mutasi rekening (transfer/QRIS) tiap tutup
 * hari. Penerimaan saja — pengeluaran ada di Biaya.
 *
 * Membaca `payments.paid_on` dalam rentang bulan yang sama dengan
 * ProfitAndLoss::revenue(), jadi totalnya selalu sama dengan omzet Laba Rugi.
 * Pembayaran order batal ikut — uangnya memang masuk (DP hangus).
 * Pengembalian (spek 4.2) dikurangkan per metode pada hari pengembalian.
 */
final class CashReceipts
{
    public function forMonth(string $month): CashReceiptsMonth
    {
        $range = [Periods::start($month), Periods::end($month)];
        // Agregasi di SQL, bukan memuat semua Payment: layar ini dibuka tiap
        // hari dan tabel payments tumbuh paling cepat.
        $payments = Payment::query()
            ->toBase()
            ->selectRaw('paid_on AS day, method, SUM(amount) AS amount, COUNT(*) AS count')
            ->whereBetween('paid_on', $range)
            ->groupBy('paid_on', 'method')
            ->get();
        // Pengembalian (spek 4.2) = uang keluar hari itu dari kas metode itu.
        $refunds = Refund::query()
            ->toBase()
            ->selectRaw('refunded_on AS day, method, SUM(amount) AS amount')
            ->whereBetween('refunded_on', $range)
            ->groupBy('refunded_on', 'method')
            ->get();

        $methods = array_map(fn (PaymentMethod $m) => $m->value, PaymentMethod::cases());
        $zero = array_fill_keys($methods, 0);

        /** @var array<string, array{in: array<string, int>, out: array<string, int>, count: int}> $byDate */
        $byDate = [];
        foreach ($payments as $row) {
            $date = substr((string) $row->day, 0, 10);
            $byDate[$date] ??= ['in' => $zero, 'out' => $zero, 'count' => 0];
            $byDate[$date]['in'][(string) $row->method] = (int) $row->amount;
            $byDate[$date]['count'] += (int) $row->count;
        }
        foreach ($refunds as $row) {
            $date = substr((string) $row->day, 0, 10);
            $byDate[$date] ??= ['in' => $zero, 'out' => $zero, 'count' => 0];
            $byDate[$date]['out'][(string) $row->method] = (int) $row->amount;
        }
        ksort($byDate);

        $days = [];
        $totals = $zero;
        $refundTotals = $zero;
        $count = 0;
        foreach ($byDate as $date => $d) {
            // Bersih per metode = yang benar-benar ada di laci/rekening.
            $net = [];
            foreach ($methods as $m) {
                $net[$m] = $d['in'][$m] - $d['out'][$m];
                $totals[$m] += $net[$m];
                $refundTotals[$m] += $d['out'][$m];
            }
            $days[] = new CashDay((string) $date, $net, array_sum($net), $d['count'], $d['out']);
            $count += $d['count'];
        }

        return new CashReceiptsMonth($month, $days, $totals, array_sum($totals), $count, $refundTotals);
    }
}
