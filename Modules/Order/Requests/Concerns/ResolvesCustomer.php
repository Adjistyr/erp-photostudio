<?php

namespace Modules\Order\Requests\Concerns;

use Modules\Customer\Actions\FindOrCreateCustomer;
use Modules\Customer\Models\Customer;

/**
 * Customer order = `customer_id` yang sudah ada ATAU `new_customer {name,
 * phone}` (spek 3.4). Kalau keduanya terkirim, `customer_id` menang —
 * server tidak boleh membuat baris customer liar.
 *
 * resolveCustomer() menulis ke DB, jadi dipanggil controller DI DALAM
 * transaksi order — bukan di after() validator (validator tidak boleh menulis).
 */
trait ResolvesCustomer
{
    /** @return array<string, list<string>> */
    protected function customerRules(): array
    {
        return [
            'customer_id' => ['nullable', 'integer', 'exists:customers,id', 'required_without:new_customer.name'],
            'new_customer' => ['nullable', 'array'],
            'new_customer.name' => ['nullable', 'string', 'max:255', 'required_without:customer_id'],
            // Sama dengan CustomerRequest.
            'new_customer.phone' => ['nullable', 'string', 'max:30'],
        ];
    }

    /** @return array<string, string> */
    protected function customerMessages(): array
    {
        $pesan = 'Pilih customer atau isi nama customer baru.';

        return ['customer_id.required_without' => $pesan, 'new_customer.name.required_without' => $pesan];
    }

    /** @return array<string, string> */
    protected function customerAttributes(): array
    {
        return [
            'customer_id' => 'customer',
            'new_customer.name' => 'nama customer baru',
            'new_customer.phone' => 'no HP customer baru',
        ];
    }

    public function wantsNewCustomer(): bool
    {
        return ! $this->filled('customer_id') && trim((string) $this->input('new_customer.name', '')) !== '';
    }

    public function newCustomerName(): string
    {
        return trim((string) $this->input('new_customer.name', ''));
    }

    public function resolveCustomer(FindOrCreateCustomer $findOrCreate): Customer
    {
        if (! $this->wantsNewCustomer()) {
            return Customer::query()->findOrFail($this->integer('customer_id'));
        }

        $phone = trim((string) $this->input('new_customer.phone', ''));

        return $findOrCreate->execute($this->newCustomerName(), $phone === '' ? null : $phone);
    }
}
