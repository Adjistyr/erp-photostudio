<?php

namespace Modules\Order\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Catalog\Models\CatalogItem;
use Modules\Order\Enums\PaymentMethod;
use Modules\Shared\Enums\BusinessLine;
use Modules\Shared\Support\Money;

/**
 * Buat order studio/event. Retail sengaja ditolak: walk-in lewat POS, dan
 * order retail berjadwal bertabrakan dengan alur POS 30 detik.
 *
 * Harga TIDAK diterima dari klien — hanya id katalog + qty. Harga, HPP, dan
 * nama disalin dari katalog di server saat simpan.
 */
class StoreOrderRequest extends FormRequest
{
    /** @var list<array{item: CatalogItem, quantity: int}>|null */
    private ?array $lines = null;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'business_line' => ['required', Rule::in([BusinessLine::Studio->value, BusinessLine::Event->value])],
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            // Tanggal lampau diizinkan: order sering dicatat setelah deal lewat chat.
            'service_date' => ['required', 'date_format:Y-m-d'],
            'service_time' => ['nullable', 'date_format:H:i'],
            'location' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1', 'max:20'],
            'items.*.catalog_item_id' => ['required', 'integer', Rule::exists('catalog_items', 'id')
                ->where('is_active', true)
                ->where('type', CatalogItemType::Service->value)],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
            'dp' => ['nullable', 'integer', 'min:0'],
            'dp_method' => ['nullable', Rule::enum(PaymentMethod::class)],
        ];
    }

    /**
     * @return array<int, \Closure(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator) {
            // Item tidak valid sudah punya error sendiri — total belum bisa dihitung.
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            $total = $this->total();
            if ($this->deposit() > $total) {
                $validator->errors()->add('dp', 'Melebihi total order '.Money::format($total).'.');
            }
        }];
    }

    /**
     * Baris item dengan model katalognya — dipanggil setelah validasi lolos.
     *
     * @return list<array{item: CatalogItem, quantity: int}>
     */
    public function lines(): array
    {
        if ($this->lines !== null) {
            return $this->lines;
        }

        /** @var list<array{catalog_item_id: int|string, quantity: int|string}> $items */
        $items = $this->input('items', []);
        $catalog = CatalogItem::findMany(array_column($items, 'catalog_item_id'))->keyBy('id');

        return $this->lines = array_map(fn (array $i) => [
            'item' => $catalog->get((int) $i['catalog_item_id']) ?? throw new \LogicException('Item katalog hilang'),
            'quantity' => (int) $i['quantity'],
        ], $items);
    }

    public function total(): int
    {
        return array_sum(array_map(fn (array $l) => $l['item']->price * $l['quantity'], $this->lines()));
    }

    public function deposit(): int
    {
        return (int) $this->input('dp', 0);
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'business_line' => 'jenis order',
            'customer_id' => 'customer',
            'service_date' => 'tanggal',
            'service_time' => 'jam',
            'location' => 'lokasi',
            'notes' => 'catatan',
            'items' => 'item',
            'items.*.catalog_item_id' => 'paket',
            'items.*.quantity' => 'qty',
            'dp' => 'DP',
            'dp_method' => 'metode DP',
        ];
    }
}
