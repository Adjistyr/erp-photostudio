<?php

namespace Modules\Catalog\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Catalog\Enums\ServiceCategory;

/** Tambah & edit item katalog — aturannya sama untuk keduanya. */
class CatalogItemRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $isProduct = $this->input('type') === CatalogItemType::Product->value;

        return [
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::enum(CatalogItemType::class)],
            'price' => ['required', 'integer', 'min:1'],
            // Produk WAJIB punya HPP — tanpanya margin retail terlihat 100%
            // (business-flow 7, Soal HPP). Jasa DILARANG punya HPP: biayanya
            // tidak tetap, dicatat per job. Ditolak, bukan diam-diam dibuang,
            // supaya isian yang salah kelihatan.
            'unit_cost' => [Rule::requiredIf($isProduct), Rule::prohibitedIf(! $isProduct), 'nullable', 'integer', 'min:0'],
            // Kategori JASA menentukan di form order mana paket muncul — dikunci ke
            // enum; kategori produk tetap bebas (tidak ada layar yang membacanya).
            'category' => $isProduct
                ? ['nullable', 'string', 'max:100']
                : ['required', Rule::in(ServiceCategory::values())],
            // Profil publik (spek 7.1) — dibaca company profile nanti.
            'description' => ['nullable', 'string', 'max:2000'],
            'is_public' => ['boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nama',
            'type' => 'jenis',
            'price' => 'harga jual',
            'unit_cost' => 'HPP bahan',
            'category' => 'kategori',
            'description' => 'deskripsi',
            'is_public' => 'tampil di company profile',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        $pesan = 'Kategori jasa harus Studio, Event, atau Add-on — menentukan di mana paket muncul saat Buat Order.';

        return ['category.in' => $pesan, 'category.required' => $pesan];
    }

    /**
     * Kategori kosong → "Lain-lain", supaya laporan tidak punya grup tanpa nama.
     *
     * @return array{name: string, type: string, price: int, unit_cost: int|null, category: string, description: string|null, is_public: bool}
     */
    public function catalogData(): array
    {
        /** @var array{name: string, type: string, price: int, unit_cost?: int|null, category?: string|null, description?: string|null, is_public?: bool} $data */
        $data = $this->validated();

        return [
            'name' => $data['name'],
            'type' => $data['type'],
            'price' => (int) $data['price'],
            'unit_cost' => isset($data['unit_cost']) ? (int) $data['unit_cost'] : null,
            'category' => ($data['category'] ?? null) ?: 'Lain-lain',
            // Spasi saja = kosong — jangan simpan deskripsi "   ".
            'description' => trim((string) ($data['description'] ?? '')) ?: null,
            'is_public' => (bool) ($data['is_public'] ?? false),
        ];
    }
}
