<?php

namespace Modules\Customer\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\Customer\Models\Customer;

/**
 * Tambah & edit customer. Hanya nama yang wajib — kontak opsional dengan
 * alasan yang sama seperti customer di POS: field wajib adalah cara tercepat
 * membuat pencatatan dilewat (business-flow 5.1).
 */
class CustomerRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'source' => ['nullable', Rule::in(Customer::SOURCES)],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nama',
            'phone' => 'no HP',
            'email' => 'email',
            'source' => 'sumber tahu',
            'notes' => 'catatan',
        ];
    }
}
