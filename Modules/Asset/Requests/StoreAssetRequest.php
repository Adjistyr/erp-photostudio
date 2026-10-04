<?php

namespace Modules\Asset\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\Asset\Models\Asset;

/**
 * Tambah aset — bentuk input yang di prototype baru dicek di klien
 * (validasiAset). Semua angka yang menentukan alokasi maintenance wajib
 * masuk akal: alokasi = harga × unit × persen, tidak ada yang diketik tangan.
 */
class StoreAssetRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', Rule::in(array_column(Asset::CATEGORIES, 'name'))],
            'model' => ['nullable', 'string', 'max:255'],
            'units' => ['required', 'integer', 'min:1', 'max:999'],
            'unit_price' => ['required', 'integer', 'min:1'],
            // Basis kas: pembelian masa depan belum terjadi.
            'purchased_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'maintenance_percent' => ['required', 'integer', 'min:0', 'max:100'],
            'useful_life_months' => ['required', 'integer', 'min:1', 'max:600'],
            'maintenance_interval_months' => ['nullable', 'integer', 'min:1', 'max:120'],
            // null = kas usaha; id owner = dibayar owner (setoran modal).
            'paid_by' => ['nullable', 'integer', 'exists:owners,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nama',
            'category' => 'kategori',
            'model' => 'merek / model',
            'units' => 'unit',
            'unit_price' => 'harga per unit',
            'purchased_on' => 'tanggal beli',
            'maintenance_percent' => 'persen maintenance',
            'useful_life_months' => 'umur ekonomis',
            'maintenance_interval_months' => 'interval perawatan',
            'paid_by' => 'pembayar',
        ];
    }
}
