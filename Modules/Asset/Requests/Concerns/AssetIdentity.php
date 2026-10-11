<?php

namespace Modules\Asset\Requests\Concerns;

use Illuminate\Validation\Rule;
use Modules\Asset\Models\Asset;

/**
 * Field identitas aset (spek 8.1) — bisa diubah kapan saja, juga setelah
 * aset dilepas. Dipakai Tambah dan Edit supaya aturannya tidak berbeda.
 * Field keuangan (harga, unit, tanggal beli, persen, sumber dana) TIDAK di
 * sini: terkunci setelah simpan.
 */
trait AssetIdentity
{
    /** Kode disimpan huruf besar — unik tanpa beda huruf besar/kecil. */
    protected function prepareForValidation(): void
    {
        $code = trim((string) $this->input('code', ''));
        $this->merge(['code' => $code === '' ? null : mb_strtoupper($code)]);
    }

    /** @return array<string, array<mixed>> */
    protected function identityRules(?Asset $ignore = null): array
    {
        $unique = Rule::unique('assets', 'code');

        return [
            'name' => ['required', 'string', 'max:255'],
            'asset_category_id' => ['required', 'integer', 'exists:asset_categories,id'],
            'code' => ['nullable', 'string', 'max:30', 'regex:/^[A-Z0-9][A-Z0-9\-_\/.]*$/', $ignore ? $unique->ignore($ignore->id) : $unique],
            'brand' => ['nullable', 'string', 'max:100'],
            'model' => ['nullable', 'string', 'max:255'],
            'serial_number' => ['nullable', 'string', 'max:255'],
            'warranty_until' => ['nullable', 'date_format:Y-m-d'],
            'location' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:2000'],
            // Umur hanya untuk nilai buku (informasi), interval hanya jadwal —
            // keduanya bukan uang, jadi tetap bisa dikoreksi.
            'useful_life_months' => ['required', 'integer', 'min:1', 'max:600'],
            'maintenance_interval_months' => ['nullable', 'integer', 'min:1', 'max:120'],
        ];
    }

    /** @return array<string, string> */
    protected function identityAttributes(): array
    {
        return [
            'name' => 'nama',
            'asset_category_id' => 'kategori',
            'code' => 'kode',
            'brand' => 'merek',
            'model' => 'model',
            'serial_number' => 'nomor seri',
            'warranty_until' => 'garansi sampai',
            'location' => 'lokasi',
            'notes' => 'catatan',
            'useful_life_months' => 'umur ekonomis',
            'maintenance_interval_months' => 'interval perawatan',
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'code.regex' => 'Kode hanya huruf, angka, dan - _ / . (mis. KAM-001).',
            'code.unique' => 'Kode ini sudah dipakai aset lain.',
        ];
    }

    /**
     * Isian identitas siap simpan — teks kosong jadi null. `code` null = minta
     * kode otomatis (hanya saat tambah).
     *
     * @return array{name: string, asset_category_id: int, code: string|null, brand: string|null, model: string|null, serial_number: string|null, warranty_until: string|null, location: string|null, notes: string|null, useful_life_months: int, maintenance_interval_months: int|null}
     */
    public function identityData(): array
    {
        $text = fn (string $key) => trim((string) $this->input($key, '')) ?: null;

        return [
            'name' => trim((string) $this->input('name')),
            'asset_category_id' => $this->integer('asset_category_id'),
            'code' => $this->input('code'),
            'brand' => $text('brand'),
            'model' => $text('model'),
            'serial_number' => $text('serial_number'),
            'warranty_until' => $text('warranty_until'),
            'location' => $text('location'),
            'notes' => $text('notes'),
            'useful_life_months' => $this->integer('useful_life_months'),
            'maintenance_interval_months' => $this->filled('maintenance_interval_months') ? $this->integer('maintenance_interval_months') : null,
        ];
    }
}
