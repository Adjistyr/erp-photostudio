<?php

namespace Modules\Customer\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/** Blast email — penerima dipilih owner; yang tanpa email dilewati di controller. */
class SendEmailBlastRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'customer_ids' => ['required', 'array', 'min:1', 'max:500'],
            'customer_ids.*' => ['required', 'integer', 'exists:customers,id'],
            'subject' => ['required', 'string', 'max:150'],
            'body' => ['required', 'string', 'max:5000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['customer_ids' => 'penerima', 'customer_ids.*' => 'penerima', 'subject' => 'subjek', 'body' => 'isi pesan'];
    }
}
