<?php

namespace Modules\Order\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Validator;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Customer\Models\Customer;
use Modules\Order\Models\Order;
use Modules\Order\Models\OrderItem;
use Modules\Order\Requests\Concerns\ResolvesCatalogLines;
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

    /**
     * Order retail/batal ditolak SEBELUM validasi field — item retail adalah
     * produk dan akan gagal di aturan `items` dengan pesan yang menyesatkan.
     */
    public function authorize(): bool
    {
        return $this->order()->isEditable();
    }

    /** 422 dengan alasan, bukan 403 — sama dengan aturan bisnis lain di form. */
    protected function failedAuthorization(): never
    {
        throw ValidationException::withMessages(['order' => $this->order()->business_line === BusinessLine::Retail
            ? 'Order retail tidak bisa diubah — hapus pembayaran atau catat retur.'
            : 'Order yang dibatalkan tidak bisa diubah.']);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'service_date' => ['required', 'date_format:Y-m-d'],
            'service_time' => ['nullable', 'date_format:H:i'],
            'location' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1', 'max:20'],
            // Ada = baris lama; null = baris baru.
            'items.*.id' => ['nullable', 'integer'],
            // TANPA is_active: baris lama boleh merujuk paket yang sudah
            // dinonaktifkan supaya order lama tetap bisa diubah. Baris baru
            // dicek aktif di after().
            'items.*.catalog_item_id' => ['required', 'integer', Rule::exists('catalog_items', 'id')
                ->where('type', CatalogItemType::Service->value)],
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
            foreach ($this->lines() as $i => ['item' => $catalog]) {
                $id = $this->rows()[$i]['id'];
                if ($id === null) {
                    if (! $catalog->is_active) {
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
                // Ganti paket = hapus baris lalu tambah baru — aturan snapshot
                // harga tetap sederhana: baris lama tidak pernah berganti isi.
                if ($line->catalog_item_id !== $catalog->id) {
                    $validator->errors()->add("items.{$i}.catalog_item_id", 'Ganti paket dengan menghapus baris lalu menambah yang baru.');

                    return;
                }
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
     * katalog. Bukan subtotal() trait — itu memakai harga katalog untuk semua
     * baris, salah untuk harga deal lama.
     */
    public function newTotal(): int
    {
        $stored = $this->order()->items->keyBy('id');
        $total = 0;
        foreach ($this->lines() as $i => ['item' => $catalog, 'quantity' => $qty]) {
            $id = $this->rows()[$i]['id'];
            $price = $id !== null ? ($stored->get($id)->unit_price ?? $catalog->price) : $catalog->price;
            $total += $price * $qty;
        }

        return $total;
    }

    /**
     * Field skalar setelah dirapikan — bentuk yang sama dengan yang disimpan,
     * supaya pembandingan "berubah?" tidak tertipu spasi atau jam "14:00" vs
     * "14:00:00".
     *
     * @return array{customer_id: int, service_date: string, service_time: string|null, location: string|null, notes: string|null}
     */
    public function normalised(): array
    {
        $location = trim((string) $this->input('location', ''));
        $time = (string) $this->input('service_time', '');

        return [
            'customer_id' => $this->integer('customer_id'),
            'service_date' => (string) $this->input('service_date'),
            'service_time' => $time !== '' ? $time : null,
            // Sama dengan store(): studio tanpa lokasi = di studio.
            'location' => $location !== '' ? $location : ($this->order()->business_line === BusinessLine::Studio ? 'Studio' : null),
            'notes' => trim((string) $this->input('notes', '')) ?: null,
        ];
    }

    /**
     * Diff untuk event `updated` — hanya yang berubah. Customer dicatat
     * dengan NAMA supaya riwayat terbaca tanpa join.
     *
     * @return array<string, array{from: mixed, to: mixed}>
     */
    public function changes(Order $order): array
    {
        $new = $this->normalised();
        $current = $this->currentValues($order);
        $changes = [];

        foreach (['service_date', 'service_time', 'location', 'notes'] as $field) {
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
        foreach ($this->lines() as $i => ['item' => $catalog, 'quantity' => $qty]) {
            $id = $this->rows()[$i]['id'];
            $name = $id !== null ? ($stored->get($id)->name ?? $catalog->name) : $catalog->name;
            $parts[] = $qty > 1 ? "{$name} ×{$qty}" : $name;
        }

        return implode(', ', $parts);
    }

    /**
     * @return array{customer_id: int|null, service_date: string, service_time: string|null, location: string|null, notes: string|null}
     */
    private function currentValues(Order $order): array
    {
        return [
            'customer_id' => $order->customer_id,
            'service_date' => $order->service_date->toDateString(),
            'service_time' => $order->service_time === null ? null : substr($order->service_time, 0, 5),
            'location' => $order->location,
            'notes' => $order->notes,
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'customer_id' => 'customer',
            'service_date' => 'tanggal',
            'service_time' => 'jam',
            'location' => 'lokasi',
            'notes' => 'catatan',
            'items' => 'item',
            'items.*.id' => 'item',
            'items.*.catalog_item_id' => 'paket',
            'items.*.quantity' => 'qty',
        ];
    }
}
