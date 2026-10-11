<?php

namespace Modules\Asset\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Modules\Asset\Enums\AssetStatus;
use Modules\Asset\Requests\Concerns\ResolvesRouteAsset;
use Modules\Order\Enums\WorkStatus;
use Modules\Shared\Enums\BusinessLine;

/** Catat peminjaman alat (spek 8.4). */
class StoreAssetCheckoutRequest extends FormRequest
{
    use ResolvesRouteAsset;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'quantity' => ['required', 'integer', 'min:1'],
            'holder' => ['required', 'string', 'max:100'],
            // Order studio/event yang tidak batal — retail tidak membawa alat keluar.
            'order_id' => ['nullable', 'integer', Rule::exists('orders', 'id')
                ->whereNot('work_status', WorkStatus::Cancelled->value)
                ->whereIn('business_line', [BusinessLine::Studio->value, BusinessLine::Event->value])],
            'checked_out_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'due_back_on' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:checked_out_on'],
            'note' => ['nullable', 'string', 'max:255'],
        ];
    }

    /** @return array<int, \Closure(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            $asset = $this->asset();
            if ($asset->isDisposed()) {
                $validator->errors()->add('quantity', 'Aset sudah dilepas — tidak bisa dipinjamkan.');

                return;
            }
            if ($asset->status === AssetStatus::Broken) {
                $validator->errors()->add('quantity', 'Aset sedang rusak — tandai aktif dulu bila sudah diperbaiki.');

                return;
            }
            $available = $asset->units - $asset->unitsOut();
            if ($this->integer('quantity') > $available) {
                $validator->errors()->add('quantity', "Tersedia {$available} dari {$asset->units} unit.");
            }
        }];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'quantity' => 'jumlah',
            'holder' => 'pemegang',
            'order_id' => 'order',
            'checked_out_on' => 'tanggal keluar',
            'due_back_on' => 'rencana kembali',
            'note' => 'catatan',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'order_id.exists' => 'Order harus studio atau event yang tidak batal.',
            'due_back_on.after_or_equal' => 'Rencana kembali tidak boleh sebelum tanggal keluar.',
        ];
    }
}
