<?php

namespace Modules\Asset\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Modules\Asset\Requests\Concerns\AssetIdentity;
use Modules\Finance\Rules\OpenPeriod;

/**
 * Tambah aset — bentuk input yang di prototype baru dicek di klien
 * (validasiAset). Semua angka yang menentukan alokasi maintenance wajib
 * masuk akal: alokasi = harga × unit × persen, tidak ada yang diketik tangan.
 */
class StoreAssetRequest extends FormRequest
{
    use AssetIdentity;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Identitas (spek 8.1) — sama dengan Edit.
            ...$this->identityRules(),
            // Keuangan — hanya saat tambah; terkunci setelah simpan.
            'units' => ['required', 'integer', 'min:1', 'max:999'],
            'unit_price' => ['required', 'integer', 'min:1'],
            // Basis kas: pembelian masa depan belum terjadi.
            'purchased_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:today', new OpenPeriod],
            'maintenance_percent' => ['required', 'integer', 'min:0', 'max:100'],
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
            ...$this->identityAttributes(),
            'units' => 'unit',
            'unit_price' => 'harga per unit',
            'purchased_on' => 'tanggal beli',
            'maintenance_percent' => 'persen maintenance',
            'paid_by' => 'pembayar',
        ];
    }
}
