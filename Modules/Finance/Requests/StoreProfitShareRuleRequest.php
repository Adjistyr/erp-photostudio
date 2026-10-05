<?php

namespace Modules\Finance\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;
use Modules\Finance\Models\Owner;
use Modules\Finance\Services\ProfitSharing;

/**
 * Aturan bagi hasil baru — menambah baris, tidak mengedit yang lama, supaya
 * bagi hasil bulan lalu tidak ikut berubah (8.6). Aturan bisnisnya
 * (tidak mundur, sesudah aturan terakhir, total 100%) di ProfitSharing.
 */
class StoreProfitShareRuleRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'effective_month' => ['required', 'date_format:Y-m'],
            'reserve_percent' => ['required', 'integer', 'min:0', 'max:100'],
            // owner_id => persen
            'shares' => ['required', 'array'],
            'shares.*' => ['required', 'integer', 'min:0', 'max:100'],
        ];
    }

    /**
     * @return array<int, \Closure(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator) {
            // Setiap owner wajib punya persen (boleh 0) — owner yang terlewat
            // diam-diam kehilangan haknya. Dicek walau field lain error,
            // supaya semua kesalahan tampil sekaligus.
            if (! $validator->errors()->has('shares') && ! $validator->errors()->has('shares.*')) {
                $owners = Owner::pluck('id')->sort()->values()->all();
                $given = collect(array_keys($this->shares()))->sort()->values()->all();
                if ($owners !== $given) {
                    $validator->errors()->add('shares', 'Isi persen untuk setiap owner.');
                }
            }
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            $error = app(ProfitSharing::class)->validateRule(
                (string) $this->input('effective_month'),
                (int) $this->input('reserve_percent'),
                $this->shares(),
            );
            if ($error !== null) {
                $validator->errors()->add('effective_month', $error);
            }
        }];
    }

    /** @return array<int, int> owner_id => persen */
    public function shares(): array
    {
        /** @var array<int|string, int|string> $raw */
        $raw = $this->input('shares', []);
        $shares = [];
        foreach ($raw as $ownerId => $percent) {
            $shares[(int) $ownerId] = (int) $percent;
        }

        return $shares;
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['effective_month' => 'bulan mulai berlaku', 'reserve_percent' => 'persen dana cadangan', 'shares' => 'bagian owner'];
    }
}
