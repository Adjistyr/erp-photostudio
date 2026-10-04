<?php

namespace Modules\Expense\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/** Biaya operasional — bulanan, tidak dinisbatkan ke order; masuk setelah laba kotor. */
class StoreOperatingExpenseRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'category' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'amount' => ['required', 'integer', 'min:1'],
            'spent_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'category' => 'kategori',
            'description' => 'keterangan',
            'amount' => 'nominal',
            'spent_on' => 'tanggal',
        ];
    }
}
