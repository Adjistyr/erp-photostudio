<?php

namespace Modules\Asset\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Modules\Asset\Requests\Concerns\AssetIdentity;
use Modules\Asset\Requests\Concerns\ResolvesRouteAsset;

/**
 * Edit aset (spek 8.1) — identitas saja. Harga, unit, tanggal beli, persen
 * maintenance, dan sumber dana tidak ada di aturan: dikirim pun diabaikan,
 * karena mengubahnya menggeser alokasi bulan lalu dan investasi tercatat.
 */
class UpdateAssetRequest extends FormRequest
{
    use AssetIdentity;
    use ResolvesRouteAsset;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return $this->identityRules($this->asset());
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return $this->identityAttributes();
    }
}
