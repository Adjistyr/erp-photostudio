<?php

namespace Modules\Order\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Modules\Finance\Rules\OpenPeriod;
use Modules\Order\Enums\PaymentMethod;
use Modules\Order\Models\Order;
use Modules\Shared\Support\Money;

/**
 * Catat pengembalian uang (spek 4.2, K3). Uang keluar pada hari pengembalian
 * — tanggalnya harus di bulan yang belum tutup buku; pembayaran asli tidak
 * disentuh walau bulannya sudah tertutup.
 */
class StoreRefundRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Pengembalian masa depan belum terjadi — basis kas.
            'refunded_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:today', new OpenPeriod],
            'amount' => ['required', 'integer', 'min:1'],
            // Dari kas mana uangnya keluar — dipakai Kas Harian per metode.
            'method' => ['required', Rule::enum(PaymentMethod::class)],
            'reason' => ['required', 'string', 'max:255'],
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
            $refundable = $this->order()->netPaid();
            if ((int) $this->input('amount') > $refundable) {
                $validator->errors()->add('amount', 'Pengembalian melebihi uang yang diterima (sisa '.Money::format($refundable).').');
            }
        }];
    }

    public function order(): Order
    {
        /** @var Order $order */
        $order = $this->route('order');

        return $order->loadMissing(['payments', 'refunds']);
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'refunded_on' => 'tanggal pengembalian',
            'amount' => 'jumlah',
            'method' => 'metode',
            'reason' => 'alasan',
        ];
    }
}
