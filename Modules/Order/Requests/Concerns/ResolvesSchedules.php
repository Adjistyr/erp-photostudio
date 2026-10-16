<?php

namespace Modules\Order\Requests\Concerns;

use Carbon\CarbonImmutable;
use Illuminate\Validation\Validator;
use Modules\Shared\Enums\BusinessLine;
use Modules\Shared\Support\Money;

/**
 * Termin pembayaran di form order (spek 6.4). `schedules` kosong (`[]`, yang
 * dikirim form tanpa termin) disamakan dengan null = tanpa termin; satu
 * termin tidak berarti, jadi bila ada minimal dua.
 *
 * Aturan: hanya lini event; `due_on` naik (tiap termin setelah termin
 * sebelumnya); termin terakhir ≤ tanggal acara; Σ amount = total order.
 */
trait ResolvesSchedules
{
    protected function prepareForValidation(): void
    {
        if ($this->input('schedules') === []) {
            $this->merge(['schedules' => null]);
        }
    }

    /** @return array<string, list<string>> */
    protected function scheduleRules(): array
    {
        return [
            'schedules' => ['nullable', 'array', 'min:2', 'max:6'],
            'schedules.*.due_on' => ['required', 'date_format:Y-m-d'],
            'schedules.*.amount' => ['required', 'integer', 'min:1'],
            'schedules.*.label' => ['nullable', 'string', 'max:50'],
        ];
    }

    /** @return array<string, string> */
    protected function scheduleAttributes(): array
    {
        return [
            'schedules' => 'termin',
            'schedules.*.due_on' => 'tanggal termin',
            'schedules.*.amount' => 'nominal termin',
            'schedules.*.label' => 'label termin',
        ];
    }

    /** `schedules` ada di request (termasuk kosong = hapus semua termin). */
    public function submitsSchedules(): bool
    {
        return $this->exists('schedules');
    }

    /**
     * Termin yang dikirim, urut seperti di form — urutan = `sequence`.
     *
     * @return list<array{due_on: string, amount: int, label: string|null}>
     */
    public function submittedSchedules(): array
    {
        /** @var array<int, array{due_on: string, amount: int|string, label?: string|null}> $rows */
        $rows = $this->input('schedules') ?? [];

        return array_map(function (array $r) {
            $label = trim((string) ($r['label'] ?? ''));

            return ['due_on' => (string) $r['due_on'], 'amount' => (int) $r['amount'], 'label' => $label !== '' ? $label : null];
        }, array_values($rows));
    }

    /**
     * Aturan bisnis termin. `$total` null = jumlah tidak dicek (Ubah Order
     * yang menghapus termin karena total berubah — aturan 5).
     *
     * @param  list<array{due_on: string, amount: int, label: string|null}>  $schedules
     */
    protected function validateSchedules(Validator $validator, array $schedules, BusinessLine $line, string $serviceDate, ?int $total): void
    {
        if ($schedules === []) {
            return;
        }
        if ($line !== BusinessLine::Event) {
            $validator->errors()->add('schedules', 'Termin pembayaran hanya untuk order event.');

            return;
        }

        foreach ($schedules as $i => $s) {
            if ($i > 0 && $s['due_on'] <= $schedules[$i - 1]['due_on']) {
                $validator->errors()->add("schedules.{$i}.due_on", 'Tanggal termin '.($i + 1).' harus setelah termin '.$i.'.');

                return;
            }
        }
        $last = $schedules[count($schedules) - 1]['due_on'];
        if ($last > $serviceDate) {
            $validator->errors()->add('schedules.'.(count($schedules) - 1).'.due_on',
                'Termin terakhir melewati tanggal acara ('.CarbonImmutable::parse($serviceDate)->translatedFormat('j M Y').').');

            return;
        }

        if ($total !== null && ($message = self::sumMismatch(array_sum(array_column($schedules, 'amount')), $total)) !== null) {
            $validator->errors()->add('schedules', $message);
        }
    }

    /** "Jumlah termin kurang Rp 500.000 dari total" — null bila pas. */
    public static function sumMismatch(int $sum, int $total): ?string
    {
        return match (true) {
            $sum < $total => 'Jumlah termin kurang '.Money::format($total - $sum).' dari total.',
            $sum > $total => 'Jumlah termin lebih '.Money::format($sum - $total).' dari total.',
            default => null,
        };
    }
}
