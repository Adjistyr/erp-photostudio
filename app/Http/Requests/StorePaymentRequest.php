<?php

namespace App\Http\Requests;

use App\Enums\PaymentMethod;
use App\Models\Order;
use App\Services\Finance\Money;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Catat pembayaran. Status bayar TIDAK diinput — diturunkan dari total
 * pembayaran (business-flow bagian 4). Yang dijaga di sini adalah supaya
 * angka pembayarannya masuk akal.
 */
class StorePaymentRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'amount' => ['required', 'integer', 'min:1'],
            'method' => ['required', Rule::enum(PaymentMethod::class)],
            // Pembayaran masa depan bukan uang diterima — basis kas.
            'paid_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
        ];
    }

    /**
     * @return array<int, \Closure(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator) {
            $order = $this->order();
            if ($order->isCancelled()) {
                $validator->errors()->add('amount', 'Order sudah dibatalkan — tidak ditagih lagi.');

                return;
            }
            $balance = $order->balance();
            if ($balance <= 0) {
                $validator->errors()->add('amount', 'Order ini sudah lunas.');

                return;
            }
            // Kelebihan bayar hampir pasti salah ketik — tidak ada kembalian.
            if ((int) $this->input('amount') > $balance) {
                $validator->errors()->add('amount', 'Melebihi sisa tagihan '.Money::format($balance).'.');
            }
        }];
    }

    public function order(): Order
    {
        $order = $this->route('order');
        if (! $order instanceof Order) {
            throw new \LogicException('Route tanpa order');
        }

        return $order->loadMissing(['items', 'payments']);
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['amount' => 'nominal', 'method' => 'metode', 'paid_on' => 'tanggal'];
    }
}
