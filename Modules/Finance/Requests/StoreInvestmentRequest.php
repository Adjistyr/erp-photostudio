<?php

namespace Modules\Finance\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/** Investasi di luar alat (renovasi dsb.) — bukan Biaya, tidak masuk Laba Rugi. */
class StoreInvestmentRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'integer', 'min:1'],
            'invested_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            // null = kas usaha; id owner = setoran modal owner itu.
            'paid_by' => ['nullable', 'integer', 'exists:owners,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['description' => 'keterangan', 'amount' => 'nominal', 'invested_on' => 'tanggal', 'paid_by' => 'pembayar'];
    }
}
