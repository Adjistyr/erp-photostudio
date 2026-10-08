<?php

namespace Modules\Order\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Order\Enums\PaymentMethod;
use Modules\Order\Requests\Concerns\ResolvesCatalogLines;
use Modules\Order\Requests\Concerns\ResolvesCustomer;
use Modules\Shared\Enums\BusinessLine;
use Modules\Shared\Support\Money;

/**
 * Buat order studio/event. Retail sengaja ditolak: walk-in lewat POS, dan
 * order retail berjadwal bertabrakan dengan alur POS 30 detik.
 *
 * Harga katalog TIDAK diterima dari klien — hanya id katalog + qty; harga,
 * HPP, dan nama disalin dari katalog di server. Harga item custom (spek 1.3)
 * diterima karena tidak ada sumber lain.
 */
class StoreOrderRequest extends FormRequest
{
    use ResolvesCatalogLines;
    use ResolvesCustomer;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'business_line' => ['required', Rule::in([BusinessLine::Studio->value, BusinessLine::Event->value])],
            // customer_id ATAU new_customer (spek 3.4).
            ...$this->customerRules(),
            // Tanggal lampau diizinkan: order sering dicatat setelah deal lewat chat.
            'service_date' => ['required', 'date_format:Y-m-d'],
            'service_time' => ['nullable', 'date_format:H:i'],
            'location' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1', 'max:20'],
            // Baris katalog (catalog_item_id) ATAU item custom (nama + harga,
            // spek 1.3). Baris katalog mengabaikan name/unit_price kiriman klien.
            'items.*.catalog_item_id' => ['nullable', 'integer', Rule::exists('catalog_items', 'id')
                ->where('is_active', true)
                ->where('type', CatalogItemType::Service->value)],
            'items.*.name' => ['required_without:items.*.catalog_item_id', 'nullable', 'string', 'max:255'],
            // 0 diizinkan: bonus yang tetap ingin tercetak di invoice.
            'items.*.unit_price' => ['required_without:items.*.catalog_item_id', 'nullable', 'integer', 'min:0'],
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

    /** Order studio/event belum punya diskon — total = subtotal katalog. */
    public function total(): int
    {
        return $this->subtotal();
    }

    public function deposit(): int
    {
        return (int) $this->input('dp', 0);
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return $this->customerMessages();
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            ...$this->customerAttributes(),
            'business_line' => 'jenis order',
            'service_date' => 'tanggal',
            'service_time' => 'jam',
            'location' => 'lokasi',
            'notes' => 'catatan',
            'items' => 'item',
            'items.*.catalog_item_id' => 'paket',
            'items.*.name' => 'nama item',
            'items.*.unit_price' => 'harga item',
            'items.*.quantity' => 'qty',
            'dp' => 'DP',
            'dp_method' => 'metode DP',
        ];
    }
}
