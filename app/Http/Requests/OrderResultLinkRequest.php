<?php

namespace App\Http\Requests;

use App\Models\Order;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class OrderResultLinkRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return ['result_link' => ['nullable', 'url', 'max:500']];
    }

    /**
     * Link hasil baru bisa diisi setelah editing selesai — sebelum itu belum
     * ada yang bisa ditautkan.
     *
     * @return array<int, \Closure(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator) {
            $order = $this->route('order');
            if ($order instanceof Order && ! $order->work_status->allowsResultLink()) {
                $validator->errors()->add('result_link', 'Link hasil baru bisa diisi setelah status Selesai Dikerjakan.');
            }
        }];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['result_link' => 'link hasil'];
    }
}
