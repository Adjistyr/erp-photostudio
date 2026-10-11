<?php

namespace Modules\Asset\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;
use Modules\Asset\Models\AssetCheckout;

/** Kembalikan alat (spek 8.4) — seluruh catatan sekaligus. */
class ReturnAssetCheckoutRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'returned_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:today', 'after_or_equal:'.$this->checkout()->checked_out_on->toDateString()],
            // Kembali rusak → aset ditandai Rusak sekaligus (aturan 7).
            'broken' => ['boolean'],
        ];
    }

    /** @return array<int, \Closure(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator) {
            if (! $this->checkout()->isOut()) {
                $validator->errors()->add('returned_on', 'Alat ini sudah dikembalikan.');
            }
        }];
    }

    public function checkout(): AssetCheckout
    {
        $checkout = $this->route('checkout');
        if (! $checkout instanceof AssetCheckout) {
            throw new \LogicException('Route tanpa peminjaman');
        }

        return $checkout;
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['returned_on' => 'tanggal kembali'];
    }
}
