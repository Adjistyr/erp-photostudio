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
            // 1–2 pembayaran (split tunai + QRIS, spek 4.4) — satu jalur saja;
            // field lama `method` sudah dihapus.
            'payments' => ['required', 'array', 'min:1', 'max:2'],
            'payments.*.method' => ['required', Rule::enum(PaymentMethod::class)],
            'payments.*.amount' => ['required', 'integer', 'min:1'],
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

                return;
            }
            // Jumlah harus PERSIS total — kembalian urusan laci, bukan omzet.
            $total = $subtotal - $this->discount();
            $paid = array_sum(array_column($this->payments(), 'amount'));
            if ($paid !== $total) {
                $validator->errors()->add('payments', 'Jumlah pembayaran '.Money::format($paid).' tidak sama dengan total '.Money::format($total).'.');

                return;
            }
            $methods = array_map(fn (array $p) => $p['method'], $this->payments());
            if (count($methods) !== count(array_unique($methods, SORT_REGULAR))) {
                $validator->errors()->add('payments.1.method', 'Dua pembayaran dengan metode sama — gabungkan saja.');
            }
        }];
    }

    /** HP ternormalisasi (`62…`); null kalau kosong atau tanpa digit. */
    public function customerPhone(): ?string
    {
        $phone = Phone::normalise((string) $this->input('customer_phone', ''));

        return $phone === '' ? null : $phone;
    }

    /** @return list<array{method: PaymentMethod, amount: int}> */
    public function payments(): array
    {
        /** @var list<array{method: string, amount: int|string}> $rows */
        $rows = $this->input('payments', []);

        return array_map(fn (array $p) => [
            'method' => PaymentMethod::from($p['method']),
            'amount' => (int) $p['amount'],
        ], $rows);
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
            'payments' => 'pembayaran',
            'payments.*.method' => 'metode bayar',
            'payments.*.amount' => 'jumlah bayar',
            'customer_name' => 'nama customer',
            'customer_phone' => 'no HP',
        ];
    }
}
