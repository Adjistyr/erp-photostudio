<?php

namespace Modules\Order\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Catalog\Models\CatalogItemVariant;
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
            // Varian produk (spek 7.3) — wajib/terlarang tergantung produknya, di after().
            'items.*.catalog_item_variant_id' => ['nullable', 'integer'],
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
            if ($this->rejectWrongVariants($validator)) {
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

    /**
     * Produk bervarian wajib varian aktif miliknya; produk tanpa varian tidak
     * boleh membawa varian (spek 7.3). true = ada error.
     */
    private function rejectWrongVariants(Validator $validator): bool
    {
        /** @var list<array{catalog_item_id: int|string, catalog_item_variant_id?: int|string|null}> $items */
        $items = $this->input('items', []);
        $ids = array_map(fn (array $i) => (int) $i['catalog_item_id'], $items);
        $variantsByItem = CatalogItemVariant::whereIn('catalog_item_id', $ids)->get()->groupBy('catalog_item_id');

        foreach ($items as $n => $i) {
            $variants = $variantsByItem->get((int) $i['catalog_item_id']);
            $chosen = isset($i['catalog_item_variant_id']) && $i['catalog_item_variant_id'] !== '' ? (int) $i['catalog_item_variant_id'] : null;
            $key = "items.{$n}.catalog_item_variant_id";
            if ($variants === null) {
                if ($chosen !== null) {
                    $validator->errors()->add($key, 'Produk ini tidak punya varian.');
                }

                continue;
            }
            $variant = $chosen === null ? null : $variants->firstWhere('id', $chosen);
            if ($variant === null) {
                $validator->errors()->add($key, 'Pilih varian produk ini.');
            } elseif (! $variant->is_active) {
                $validator->errors()->add($key, "Varian {$variant->name} sudah tidak dijual.");
            }
        }

        return $validator->errors()->isNotEmpty();
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
