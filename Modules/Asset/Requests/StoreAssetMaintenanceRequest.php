<?php

namespace Modules\Asset\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Modules\Asset\Enums\MaintenanceType;
use Modules\Asset\Requests\Concerns\ResolvesRouteAsset;
use Modules\Finance\Rules\OpenPeriod;
use Modules\Finance\Services\Funds;

/**
 * Catat servis. Biayanya keluar dari dana maintenance (bukan Biaya), jadi
 * saldo dana dicek di server — dana tidak boleh minus (Funds).
 */
class StoreAssetMaintenanceRequest extends FormRequest
{
    use ResolvesRouteAsset;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::enum(MaintenanceType::class)],
            'description' => ['required', 'string', 'max:255'],
            'performed_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:today', 'after_or_equal:'.$this->asset()->purchased_on->toDateString(), new OpenPeriod],
            // 0 sah — perawatan yang dikerjakan sendiri.
            'cost' => ['required', 'integer', 'min:0'],
        ];
    }

    /**
     * @return array<int, \Closure(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator) {
            if ($this->asset()->isDisposed()) {
                $validator->errors()->add('type', 'Aset sudah dilepas — tidak bisa dicatat servisnya.');

                return;
            }
            if ($validator->errors()->has('cost')) {
                return;
            }
            $error = app(Funds::class)->validateMaintenanceCost((int) $this->input('cost'));
            if ($error !== null) {
                $validator->errors()->add('cost', $error);
            }
        }];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['type' => 'jenis', 'description' => 'keterangan', 'performed_on' => 'tanggal', 'cost' => 'biaya'];
    }
}
