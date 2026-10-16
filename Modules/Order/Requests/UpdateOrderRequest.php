<?php

namespace Modules\Order\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Validator;
use Modules\Customer\Models\Customer;
use Modules\Order\Models\Order;
use Modules\Order\Models\OrderItem;
use Modules\Order\Requests\Concerns\ResolvesCatalogLines;
use Modules\Order\Requests\Concerns\ResolvesCustomer;
use Modules\Shared\Enums\BusinessLine;
use Modules\Shared\Support\Money;

/**
 * Ubah order studio/event (docs/specs/1.2-edit-order.md).
 *
 * Baris item dengan `id` = baris lama: hanya qty yang boleh berubah, harga
 * deal TIDAK disalin ulang dari katalog. Baris tanpa `id` = baris baru:
 * nama, harga, HPP dari katalog saat ini (sama dengan StoreOrderRequest).
 */
class UpdateOrderRequest extends FormRequest
{
    use ResolvesCatalogLines;
    use ResolvesCustomer;

    /**
     * Order batal ditolak SEBELUM validasi field. Dulu retail juga (item retail
     * produk gagal di aturan `items`); sejak spek 7.4 retail boleh diubah —
     * customer & catatan saja, item & tanggal terkunci seperti order Diserahkan.
     */
    public function authorize(): bool
    {
        return $this->order()->isEditable();
    }

    /** 422 dengan alasan, bukan 403 — sama dengan aturan bisnis lain di form. */
    protected function failedAuthorization(): never
    {
        throw ValidationException::withMessages(['order' => 'Order yang dibatalkan tidak bisa diubah.']);
    }

    /** Retail walk-in boleh tanpa customer (spek 7.4); studio/event wajib. */
    private function customerOptional(): bool
    {
        return $this->order()->business_line === BusinessLine::Retail;
    }

    /** @return array<string, list<string>> */
    private function optionalCustomerRules(): array
    {
        return array_map(
            fn (array $rules) => array_values(array_filter($rules, fn (string $r) => ! str_starts_with($r, 'required_without'))),
            $this->customerRules(),
        );
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // customer_id ATAU new_customer (spek 3.4); retail boleh tanpa customer (walk-in, spek 7.4).
            ...($this->customerOptional() ? $this->optionalCustomerRules() : $this->customerRules()),
            'service_date' => ['required', 'date_format:Y-m-d'],
            'service_time' => ['nullable', 'date_format:H:i'],
            'location' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            // Sumber lead (spek 6.6); kosong = tidak dicatat. Retail tidak
            // mencatat sumber — nilai kiriman diabaikan di normalised().
            'source' => ['nullable', 'string', Rule::in(Customer::SOURCES)],
            'items' => ['required', 'array', 'min:1', 'max:20'],
            // Ada = baris lama; null = baris baru.
            'items.*.id' => ['nullable', 'integer'],
            // TANPA is_active: baris lama boleh merujuk paket yang sudah
            // dinonaktifkan supaya order lama tetap bisa diubah. Baris baru
            // dicek aktif di after().
            // Jasa atau produk (spek 7.4 baris lama retail, 7.5 baris baru);
            // baris baru dicek aktif di after().
            'items.*.catalog_item_id' => ['nullable', 'integer', 'exists:catalog_items,id'],
            'items.*.catalog_item_variant_id' => ['nullable', 'integer'],
            // Item custom (spek 1.3): nama + harga bila tanpa paket.
            'items.*.name' => ['required_without:items.*.catalog_item_id', 'nullable', 'string', 'max:255'],
            'items.*.unit_price' => ['required_without:items.*.catalog_item_id', 'nullable', 'integer', 'min:0'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
        ];
    }

    /**
     * Berurutan dan berhenti di error pertama — tahap berikut mengandalkan
     * tahap sebelumnya lolos (mis. total baru butuh id baris yang sah).
     *
     * @return array<int, \Closure(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            $order = $this->order();

            $stored = $order->items->keyBy('id');
            $ids = array_values(array_filter(array_column($this->rows(), 'id')));
            if (count($ids) !== count(array_unique($ids))) {
                $validator->errors()->add('items', 'Item yang sama terkirim dua kali.');

                return;
            }
            foreach ($this->lines() as $i => ['item' => $catalog, 'name' => $name, 'unit_price' => $price]) {
                $id = $this->rows()[$i]['id'];
                if ($id === null) {
                    if ($catalog !== null && ! $catalog->is_active) {
                        $validator->errors()->add("items.{$i}.catalog_item_id", "{$catalog->name} sudah nonaktif.");

                        return;
                    }

                    continue;
                }
                $line = $stored->get($id);
                if ($line === null) {
                    $validator->errors()->add('items', 'Item bukan milik order ini.');

                    return;
                }
                // Baris lama tidak pernah berganti isi — hanya qty. Ganti paket
                // atau ubah nama/harga custom = hapus baris lalu tambah baru,
                // supaya aturan snapshot harga tetap sederhana.
                if ($line->catalog_item_id === null) {
                    if ($catalog !== null || $name !== $line->name || $price !== $line->unit_price) {
                        $validator->errors()->add("items.{$i}.name", 'Ubah item custom dengan menghapus baris lalu menambah yang baru.');

                        return;
                    }
                } elseif ($catalog?->id !== $line->catalog_item_id) {
                    $validator->errors()->add("items.{$i}.catalog_item_id", 'Ganti paket dengan menghapus baris lalu menambah yang baru.');

                    return;
                }
            }

            // Varian hanya dicek untuk baris baru — baris lama tidak berganti isi.
            $new = array_keys(array_filter($this->rows(), fn (array $r) => $r['id'] === null));
            if ($this->rejectWrongVariants($validator, $new)) {
                return;
            }

            if ($order->hasLockedSchedule()) {
                $locked = 'Order sudah diserahkan — jadwal dan item terkunci.';
                $current = $this->currentValues($order);
                foreach (['service_date', 'service_time', 'location'] as $field) {
                    if ($this->normalised()[$field] !== $current[$field]) {
                        $validator->errors()->add($field, $locked);

                        return;
                    }
                }
                if ($this->itemsChanged($order)) {
                    $validator->errors()->add('items', $locked);

                    return;
                }
            }

            $paid = $order->totalPaid();
            if ($this->newTotal() < $paid) {
                $validator->errors()->add('items', 'Total baru '.Money::format($this->newTotal()).' lebih kecil dari yang sudah dibayar '
                    .Money::format($paid).' — hapus pembayaran dulu kalau memang mau mengurangi.');
            }
        }];
    }

    public function order(): Order
    {
        /** @var Order $order */
        $order = $this->route('order');

        return $order;
    }

    /** @return list<array{id: int|null, quantity: int}> */
    public function rows(): array
    {
        /** @var list<array{id?: int|string|null, quantity: int|string}> $items */
        $items = $this->input('items', []);

        return array_map(fn (array $r) => [
            'id' => isset($r['id']) && $r['id'] !== '' ? (int) $r['id'] : null,
            'quantity' => (int) $r['quantity'],
        ], $items);
    }

    /**
     * Total setelah diubah: baris lama × harga TERSIMPAN, baris baru × harga
     * katalog (atau harga custom). Bukan subtotal() trait — itu memakai harga
     * katalog saat ini untuk baris lama juga, salah untuk harga deal lama.
     */
    public function newTotal(): int
    {
        $stored = $this->order()->items->keyBy('id');
        $total = 0;
        foreach ($this->lines() as $i => $line) {
            $id = $this->rows()[$i]['id'];
            $price = $id !== null ? ($stored->get($id)->unit_price ?? $line['unit_price']) : $line['unit_price'];
            $total += $price * $line['quantity'];
        }

        return $total;
    }

    /**
     * Field skalar setelah dirapikan — bentuk yang sama dengan yang disimpan,
     * supaya pembandingan "berubah?" tidak tertipu spasi atau jam "14:00" vs
     * "14:00:00".
     *
     * `$customerId` = hasil resolveCustomer() bila customer baru dibuat/dicocokkan
     * di transaksi; null = `customer_id` dari input.
     *
     * @return array{customer_id: int|null, service_date: string, service_time: string|null, location: string|null, notes: string|null, source: string|null}
     */
    public function normalised(?int $customerId = null): array
    {
        $location = trim((string) $this->input('location', ''));
        $time = (string) $this->input('service_time', '');

        return [
            // Kosong = tanpa customer (retail walk-in) — bukan 0, yang melanggar FK.
            'customer_id' => $customerId ?? ($this->filled('customer_id') ? $this->integer('customer_id') : null),
            'service_date' => (string) $this->input('service_date'),
            'service_time' => $time !== '' ? $time : null,
            // Sama dengan store(): studio tanpa lokasi = di studio.
            'location' => $location !== '' ? $location : ($this->order()->business_line === BusinessLine::Studio ? 'Studio' : null),
            'notes' => trim((string) $this->input('notes', '')) ?: null,
            // Tidak menyentuh customers.source (spek 6.6 aturan 3).
            'source' => $this->customerOptional() ? $this->order()->source : ($this->filled('source') ? $this->string('source')->toString() : null),
        ];
    }

    /**
     * Diff untuk event `updated` — hanya yang berubah. Customer dicatat
     * dengan NAMA supaya riwayat terbaca tanpa join.
     *
     * @return array<string, array{from: mixed, to: mixed}>
     */
    public function changes(Order $order, ?int $customerId = null): array
    {
        $new = $this->normalised($customerId);
        $current = $this->currentValues($order);
        $changes = [];

        foreach (['service_date', 'service_time', 'location', 'notes', 'source'] as $field) {
            if ($new[$field] !== $current[$field]) {
                $changes[$field] = ['from' => $current[$field], 'to' => $new[$field]];
            }
        }
        if ($new['customer_id'] !== $current['customer_id']) {
            $changes['customer_id'] = [
                'from' => $order->customer?->name,
                'to' => Customer::query()->whereKey($new['customer_id'])->value('name'),
            ];
        }
        if ($this->itemsChanged($order)) {
            $changes['items'] = ['from' => $order->itemsSummary(), 'to' => $this->newItemsSummary()];
        }
        if ($this->newTotal() !== $order->total()) {
            $changes['total'] = ['from' => $order->total(), 'to' => $this->newTotal()];
        }

        return $changes;
    }

    /**
     * Berubah kalau ada baris baru, baris dihapus, atau qty baris lama
     * berbeda. Urutan baris di form tidak dihitung sebagai perubahan.
     */
    private function itemsChanged(Order $order): bool
    {
        $incoming = [];
        foreach ($this->rows() as $r) {
            if ($r['id'] === null) {
                return true;
            }
            $incoming[$r['id']] = $r['quantity'];
        }
        $stored = $order->items->mapWithKeys(fn (OrderItem $i) => [$i->id => $i->quantity])->all();
        ksort($incoming);
        ksort($stored);

        return $incoming !== $stored;
    }

    /** Ringkasan item setelah diubah — format sama dengan Order::itemsSummary(). */
    private function newItemsSummary(): string
    {
        $stored = $this->order()->items->keyBy('id');
        $parts = [];
        foreach ($this->lines() as $i => ['name' => $lineName, 'quantity' => $qty]) {
            $id = $this->rows()[$i]['id'];
            $name = $id !== null ? ($stored->get($id)->name ?? $lineName) : $lineName;
            $parts[] = $qty > 1 ? "{$name} ×{$qty}" : $name;
        }

        return implode(', ', $parts);
    }

    /**
     * @return array{customer_id: int|null, service_date: string, service_time: string|null, location: string|null, notes: string|null, source: string|null}
     */
    private function currentValues(Order $order): array
    {
        return [
            'customer_id' => $order->customer_id,
            'service_date' => $order->service_date->toDateString(),
            'service_time' => $order->service_time === null ? null : substr($order->service_time, 0, 5),
            'location' => $order->location,
            'notes' => $order->notes,
            'source' => $order->source,
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return $this->customerMessages();
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            ...$this->customerAttributes(),
            'service_date' => 'tanggal',
            'service_time' => 'jam',
            'location' => 'lokasi',
            'notes' => 'catatan',
            'source' => 'sumber order',
            'items' => 'item',
            'items.*.id' => 'item',
            'items.*.catalog_item_id' => 'paket',
            'items.*.name' => 'nama item',
            'items.*.unit_price' => 'harga item',
            'items.*.quantity' => 'qty',
        ];
    }
}
