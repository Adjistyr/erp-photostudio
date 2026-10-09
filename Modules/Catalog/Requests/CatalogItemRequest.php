<?php

namespace Modules\Catalog\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Catalog\Enums\ServiceCategory;
use Modules\Catalog\Models\CatalogItem;
use Modules\Catalog\Models\CatalogItemVariant;

/** Tambah & edit item katalog — aturannya sama untuk keduanya. */
class CatalogItemRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $isProduct = $this->input('type') === CatalogItemType::Product->value;
        $itemId = $this->item()->id ?? 0;
        // Produk bervarian: harga & HPP item disalin dari varian (spek 7.3).
        $hasVariants = $isProduct && $this->hasVariants();

        return [
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::enum(CatalogItemType::class)],
            'price' => $hasVariants ? ['nullable', 'integer', 'min:1'] : ['required', 'integer', 'min:1'],
            // Produk WAJIB punya HPP — tanpanya margin retail terlihat 100%
            // (business-flow 7, Soal HPP). Jasa DILARANG punya HPP: biayanya
            // tidak tetap, dicatat per job. Ditolak, bukan diam-diam dibuang,
            // supaya isian yang salah kelihatan.
            'unit_cost' => [Rule::requiredIf($isProduct && ! $hasVariants), Rule::prohibitedIf(! $isProduct), 'nullable', 'integer', 'min:0'],
            // Kategori JASA menentukan di form order mana paket muncul — dikunci ke
            // enum; kategori produk tetap bebas (tidak ada layar yang membacanya).
            'category' => $isProduct
                ? ['nullable', 'string', 'max:100']
                : ['required', Rule::in(ServiceCategory::values())],
            // Profil publik (spek 7.1) — dibaca company profile nanti.
            'description' => ['nullable', 'string', 'max:2000'],
            'is_public' => ['boolean'],
            // Varian (spek 7.3) — produk saja; id & foto harus milik item ini.
            'variants' => [Rule::prohibitedIf(! $isProduct), 'nullable', 'array', 'max:'.CatalogItemVariant::MAX_PER_ITEM],
            'variants.*.id' => ['nullable', 'integer', Rule::exists('catalog_item_variants', 'id')->where('catalog_item_id', $itemId)],
            'variants.*.name' => ['required', 'string', 'max:100'],
            'variants.*.price' => ['required', 'integer', 'min:1'],
            'variants.*.unit_cost' => ['required', 'integer', 'min:0'],
            'variants.*.catalog_item_photo_id' => ['nullable', 'integer', Rule::exists('catalog_item_photos', 'id')->where('catalog_item_id', $itemId)],
            'variants.*.is_active' => ['boolean'],
        ];
    }

    /** @return array<int, \Closure(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            $item = $this->item();
            if ($item && $this->input('type') !== CatalogItemType::Product->value && $item->variants()->exists()) {
                $validator->errors()->add('type', 'Produk ini punya varian — tidak bisa diubah jadi jasa. Buat item jasa baru.');

                return;
            }
            $seen = [];
            foreach ($this->variantsData() as $i => $v) {
                $key = mb_strtolower($v['name']);
                if (isset($seen[$key])) {
                    $validator->errors()->add("variants.{$i}.name", "Nama varian \"{$v['name']}\" dobel.");
                }
                $seen[$key] = true;
            }
        }];
    }

    /** Item yang diedit; null saat tambah. */
    private function item(): ?CatalogItem
    {
        $item = $this->route('catalogItem');

        return $item instanceof CatalogItem ? $item : null;
    }

    /** Varian dikirim, atau item sudah punya varian (varian tidak pernah dihapus). */
    private function hasVariants(): bool
    {
        return count((array) $this->input('variants', [])) > 0
            || ($this->item()?->variants()->exists() ?? false);
    }

    /**
     * @return list<array{id: int|null, name: string, price: int, unit_cost: int, catalog_item_photo_id: int|null, is_active: bool}>
     */
    public function variantsData(): array
    {
        /** @var list<array{id?: int|string|null, name: string, price: int|string, unit_cost: int|string, catalog_item_photo_id?: int|string|null, is_active?: bool|string|null}> $rows */
        $rows = $this->input('variants', []) ?? [];

        return array_map(fn (array $v) => [
            'id' => isset($v['id']) && $v['id'] !== '' ? (int) $v['id'] : null,
            'name' => trim($v['name']),
            'price' => (int) $v['price'],
            'unit_cost' => (int) $v['unit_cost'],
            'catalog_item_photo_id' => isset($v['catalog_item_photo_id']) && $v['catalog_item_photo_id'] !== '' ? (int) $v['catalog_item_photo_id'] : null,
            'is_active' => filter_var($v['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN),
        ], $rows);
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
            'variants' => 'varian',
            'variants.*.name' => 'nama varian',
            'variants.*.price' => 'harga varian',
            'variants.*.unit_cost' => 'HPP varian',
            'variants.*.catalog_item_photo_id' => 'foto varian',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        $pesan = 'Kategori jasa harus Studio, Event, atau Add-on — menentukan di mana paket muncul saat Buat Order.';

        return [
            'category.in' => $pesan,
            'category.required' => $pesan,
            'variants.prohibited' => 'Varian hanya untuk produk fisik — paket jasa dibuat sebagai item terpisah.',
        ];
    }

    /**
     * Kategori kosong → "Lain-lain", supaya laporan tidak punya grup tanpa nama.
     *
     * @return array{name: string, type: string, price: int, unit_cost: int|null, category: string, description: string|null, is_public: bool}
     */
    public function catalogData(): array
    {
        /** @var array{name: string, type: string, price?: int|null, unit_cost?: int|null, category?: string|null, description?: string|null, is_public?: bool} $data */
        $data = $this->validated();

        return [
            'name' => $data['name'],
            'type' => $data['type'],
            // Produk bervarian tanpa harga item: sementara dari varian pertama —
            // CatalogItem::syncPriceFromVariants() menimpanya setelah simpan.
            'price' => (int) ($data['price'] ?? $this->variantsData()[0]['price'] ?? $this->item()->price ?? 0),
            'unit_cost' => isset($data['unit_cost']) ? (int) $data['unit_cost']
                : ($this->input('type') === CatalogItemType::Product->value ? ($this->variantsData()[0]['unit_cost'] ?? $this->item()?->unit_cost) : null),
            'category' => ($data['category'] ?? null) ?: 'Lain-lain',
            // Spasi saja = kosong — jangan simpan deskripsi "   ".
            'description' => trim((string) ($data['description'] ?? '')) ?: null,
            'is_public' => (bool) ($data['is_public'] ?? false),
        ];
    }
}
