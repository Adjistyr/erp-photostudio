<?php

namespace Modules\Catalog\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Catalog\Models\CatalogItem;

/**
 * Komponen paket jasa (spek 6.3) — mengganti seluruh daftar. Komponen hanya
 * produk (jasa tidak punya HPP tetap; sekaligus mencegah paket bersarang).
 * Daftar kosong = paket tanpa komponen lagi.
 */
class UpdateBundleComponentsRequest extends FormRequest
{
    public const MAX_COMPONENTS = 20;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'components' => ['present', 'array', 'max:'.self::MAX_COMPONENTS],
            'components.*.component_id' => ['required', 'integer', 'distinct',
                Rule::exists('catalog_items', 'id')->where('type', CatalogItemType::Product->value)],
            'components.*.quantity' => ['required', 'integer', 'min:1', 'max:99'],
        ];
    }

    /** @return array<int, \Closure(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator) {
            $bundle = $this->bundle();
            if ($bundle->type !== CatalogItemType::Service) {
                $validator->errors()->add('components', 'Komponen hanya untuk paket jasa — produk tidak bisa berisi produk lain.');

                return;
            }
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            $kept = $bundle->components()->pluck('catalog_items.id')->map(fn ($id) => (int) $id)->all();
            $chosen = CatalogItem::findMany(array_column($this->componentsData(), 'component_id'))->keyBy('id');
            foreach ($this->componentsData() as $i => $row) {
                $component = $chosen->get($row['component_id']);
                if ($row['component_id'] === $bundle->id) {
                    $validator->errors()->add("components.{$i}.component_id", 'Paket tidak bisa menjadi komponen dirinya sendiri.');
                } elseif ($component !== null && ! $component->is_active && ! in_array($component->id, $kept, true)) {
                    // Komponen lama yang kemudian dinonaktifkan tetap boleh tinggal (aturan 4).
                    $validator->errors()->add("components.{$i}.component_id", "{$component->name} sudah nonaktif — aktifkan dulu untuk menambahkannya.");
                }
            }
        }];
    }

    private function bundle(): CatalogItem
    {
        $item = $this->route('catalogItem');

        return $item instanceof CatalogItem ? $item : throw new \LogicException('Route tanpa item katalog');
    }

    /** @return list<array{component_id: int, quantity: int}> */
    public function componentsData(): array
    {
        /** @var list<array{component_id: int|string, quantity: int|string}> $rows */
        $rows = $this->input('components', []) ?? [];

        return array_map(fn (array $r) => ['component_id' => (int) $r['component_id'], 'quantity' => (int) $r['quantity']], $rows);
    }

    /**
     * Bentuk untuk `sync()`: [component_id => ['quantity' => n]].
     *
     * @return array<int, array{quantity: int}>
     */
    public function syncData(): array
    {
        $sync = [];
        foreach ($this->componentsData() as $row) {
            $sync[$row['component_id']] = ['quantity' => $row['quantity']];
        }

        return $sync;
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'components' => 'komponen',
            'components.*.component_id' => 'produk komponen',
            'components.*.quantity' => 'jumlah komponen',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'components.*.component_id.exists' => 'Komponen harus produk fisik dari katalog — jasa tidak punya HPP tetap.',
            'components.*.component_id.distinct' => 'Produk ini sudah ada di daftar komponen — ubah jumlahnya saja.',
        ];
    }
}
