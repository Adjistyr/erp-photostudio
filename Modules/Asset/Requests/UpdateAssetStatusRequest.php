<?php

namespace Modules\Asset\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Modules\Asset\Enums\AssetStatus;
use Modules\Asset\Requests\Concerns\ResolvesRouteAsset;

/** Aktif ↔ rusak. "Dilepas" hanya lewat aksi Lepas Aset (butuh tanggal & alasan). */
class UpdateAssetStatusRequest extends FormRequest
{
    use ResolvesRouteAsset;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in([AssetStatus::Active->value, AssetStatus::Broken->value])],
        ];
    }

    /**
     * @return array<int, \Closure(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator) {
            if ($this->asset()->isDisposed()) {
                $validator->errors()->add('status', 'Aset sudah dilepas.');
            }
        }];
    }
}
