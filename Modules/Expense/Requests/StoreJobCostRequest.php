<?php

namespace Modules\Expense\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\Finance\Rules\OpenPeriod;
use Modules\Order\Enums\WorkStatus;
use Modules\Shared\Enums\BusinessLine;

/**
 * Biaya job — menempel ke satu order studio/event, mengurangi margin lini.
 *
 * Retail ditolak: biaya bahannya sudah tercatat sebagai HPP dari katalog,
 * membebaninya biaya job lagi menghitung biaya yang sama dua kali. Order
 * batal ditolak mengikuti prototype (web/app/routes/biaya.tsx).
 */
class StoreJobCostRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'order_id' => ['required', 'integer', Rule::exists('orders', 'id')
                ->whereIn('business_line', [BusinessLine::Studio->value, BusinessLine::Event->value])
                ->whereNot('work_status', WorkStatus::Cancelled->value)],
            // Kategori = saran di layar, bukan daftar tertutup: bisnis baru
            // jalan sebulan dan kategorinya masih akan berubah.
            'category' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'amount' => ['required', 'integer', 'min:1'],
            // Basis kas: biaya masa depan belum keluar.
            'incurred_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:today', new OpenPeriod],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'order_id' => 'order',
            'category' => 'kategori',
            'description' => 'keterangan',
            'amount' => 'nominal',
            'incurred_on' => 'tanggal',
        ];
    }
}
