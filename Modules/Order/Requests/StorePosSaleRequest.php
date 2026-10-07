<?php

namespace Modules\Order\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Customer\Support\Phone;
use Modules\Order\Enums\PaymentMethod;
use Modules\Order\Requests\Concerns\ResolvesCatalogLines;
use Modules\Shared\Support\Money;

/**
 * Transaksi POS. Hanya produk fisik aktif — jasa punya jadwal dan biaya per
 * job, jadi lewat Form Order (kalau lewat POS, paket wedding bisa terjual
 * tanpa tanggal acara). Customer opsional: mewajibkannya membuat owner malas
 * mencatat (business-flow 5.1).
 */
class StorePosSaleRequest extends FormRequest
{
    use ResolvesCatalogLines;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.catalog_item_id' => ['required', 'integer', Rule::exists('catalog_items', 'id')
                ->where('is_active', true)
                ->where('type', CatalogItemType::Product->value)],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
            'discount' => ['nullable', 'integer', 'min:0'],
            'method' => ['required', Rule::enum(PaymentMethod::class)],
            'customer_name' => ['nullable', 'string', 'max:255'],
            // Longgar (max:30, tanpa pola): nomor luar negeri ada. Dinormalkan di server.
            'customer_phone' => ['nullable', 'string', 'max:30'],
        ];
    }

    /**
     * @return array<int, \Closure(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            // Diskon sebesar subtotal = transaksi nol rupiah — hampir pasti
            // salah ketik, dan order nol tidak punya arti di laporan.
            $subtotal = $this->subtotal();
            if ($this->discount() >= $subtotal) {
                $validator->errors()->add('discount', 'Diskon harus di bawah subtotal '.Money::format($subtotal).'.');
            }
        }];
    }

    /** HP ternormalisasi (`62…`); null kalau kosong atau tanpa digit. */
    public function customerPhone(): ?string
    {
        $phone = Phone::normalise((string) $this->input('customer_phone', ''));

        return $phone === '' ? null : $phone;
    }

    public function discount(): int
    {
        return (int) $this->input('discount', 0);
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'items' => 'item',
            'items.*.catalog_item_id' => 'produk',
            'items.*.quantity' => 'qty',
            'discount' => 'diskon',
            'method' => 'metode bayar',
            'customer_name' => 'nama customer',
            'customer_phone' => 'no HP',
        ];
    }
}
