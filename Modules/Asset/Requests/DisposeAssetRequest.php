<?php

namespace Modules\Asset\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Modules\Asset\Models\Asset;
use Modules\Asset\Requests\Concerns\ResolvesRouteAsset;
use Modules\Finance\Rules\OpenPeriod;

/**
 * Lepas aset (dijual / rusak total / hilang) — aset TIDAK dihapus: alokasi
 * bulan-bulan saat aset masih dimiliki dan riwayat servisnya harus tetap ada.
 */
class DisposeAssetRequest extends FormRequest
{
    use ResolvesRouteAsset;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', Rule::in(Asset::DISPOSAL_REASONS)],
            'disposed_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:today', 'after_or_equal:'.$this->asset()->purchased_on->toDateString(), new OpenPeriod],
            'sale_price' => ['nullable', 'integer', 'min:0'],
        ];
    }

    /**
     * @return array<int, \Closure(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator) {
            if ($this->asset()->isDisposed()) {
                $validator->errors()->add('reason', 'Aset sudah dilepas.');
            }
        }];
    }

    /** Hanya aset yang dijual punya hasil jual — sisanya selalu 0. */
    public function salePrice(): int
    {
        return $this->input('reason') === Asset::SOLD ? (int) $this->input('sale_price', 0) : 0;
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['reason' => 'alasan', 'disposed_on' => 'tanggal', 'sale_price' => 'harga jual'];
    }
}
