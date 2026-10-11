<?php

namespace Modules\Asset\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\Asset\Models\AssetCategory;

/** Tambah & ubah kategori aset (spek 8.1). */
class AssetCategoryRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => trim((string) $this->input('name', '')),
            'code_prefix' => mb_strtoupper(trim((string) $this->input('code_prefix', ''))),
        ]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $category = $this->route('assetCategory');
        $ignore = $category instanceof AssetCategory ? $category->id : null;

        return [
            'name' => ['required', 'string', 'max:50', Rule::unique('asset_categories', 'name')->ignore($ignore)],
            'code_prefix' => ['required', 'regex:/^[A-Z0-9]{2,6}$/', Rule::unique('asset_categories', 'code_prefix')->ignore($ignore)],
            'useful_life_months' => ['required', 'integer', 'min:1', 'max:600'],
            'maintenance_interval_months' => ['nullable', 'integer', 'min:1', 'max:120'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nama kategori',
            'code_prefix' => 'prefiks kode',
            'useful_life_months' => 'umur ekonomis',
            'maintenance_interval_months' => 'interval perawatan',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['code_prefix.regex' => 'Prefiks 2–6 huruf/angka, mis. KAM.'];
    }

    /** @return array{name: string, code_prefix: string, useful_life_months: int, maintenance_interval_months: int|null} */
    public function categoryData(): array
    {
        return [
            'name' => (string) $this->input('name'),
            'code_prefix' => (string) $this->input('code_prefix'),
            'useful_life_months' => $this->integer('useful_life_months'),
            'maintenance_interval_months' => $this->filled('maintenance_interval_months') ? $this->integer('maintenance_interval_months') : null,
        ];
    }
}
