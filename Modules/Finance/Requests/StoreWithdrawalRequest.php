<?php

namespace Modules\Finance\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Modules\Finance\Enums\Fund;
use Modules\Finance\Services\Funds;

/** Pemakaian pos dana — tidak masuk Laba Rugi; saldo tidak boleh minus (Funds). */
class StoreWithdrawalRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'fund' => ['required', Rule::enum(Fund::class)],
            'amount' => ['required', 'integer', 'min:1'],
            'withdrawn_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'note' => ['required', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<int, \Closure(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->hasAny(['fund', 'amount'])) {
                return;
            }
            $error = app(Funds::class)->validateWithdrawal(Fund::from((string) $this->input('fund')), (int) $this->input('amount'));
            if ($error !== null) {
                $validator->errors()->add('amount', $error);
            }
        }];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['fund' => 'pos dana', 'amount' => 'nominal', 'withdrawn_on' => 'tanggal', 'note' => 'keterangan'];
    }
}
