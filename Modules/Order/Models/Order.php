<?php

namespace Modules\Order\Models;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;
use Modules\Customer\Models\Customer;
use Modules\Expense\Models\JobCost;
use Modules\Order\Enums\PaymentStatus;
use Modules\Order\Enums\WorkStatus;
use Modules\Shared\Enums\BusinessLine;

/**
 * Satu tabel untuk retail, studio, dan event (business-flow bagian 3).
 *
 * Perhitungan di bawah membaca relasi yang SUDAH dimuat — pemanggil wajib
 * eager-load `items`, `payments`, `jobCosts` supaya tidak N+1.
 *
 * @property int $id
 * @property string $number
 * @property int|null $customer_id
 * @property BusinessLine $business_line
 * @property CarbonImmutable $service_date
 * @property string|null $service_time
 * @property WorkStatus $work_status
 * @property string|null $location
 * @property string|null $notes
 * @property string|null $result_link
 * @property int $discount
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Customer|null $customer
 * @property-read Collection<int, OrderItem> $items
 * @property-read Collection<int, Payment> $payments
 * @property-read Collection<int, JobCost> $jobCosts
 */
#[Fillable([
    'number', 'customer_id', 'business_line', 'service_date', 'service_time',
    'work_status', 'location', 'notes', 'result_link', 'discount',
])]
class Order extends Model
{
    protected function casts(): array
    {
        return [
            'business_line' => BusinessLine::class,
            'service_date' => 'immutable_date',
            'work_status' => WorkStatus::class,
            'discount' => 'integer',
        ];
    }

    /**
     * Nomor berikutnya dari order TERAKHIR berdasarkan id, bukan MAX(number):
     * MAX string salah setelah ORD-9999 ("ORD-10000" < "ORD-9999").
     *
     * ponytail: tanpa lock — satu owner yang menginput. Dua simpan bersamaan
     * ditolak unique index `number`; pakai sequence DB kalau kasir bertambah.
     */
    public static function nextNumber(): string
    {
        $last = static::query()->orderByDesc('id')->value('number');
        $n = is_string($last) ? (int) substr($last, 4) : 0;

        return sprintf('ORD-%04d', $n + 1);
    }

    /** "ORD-0012" → "INV-0012": satu order = satu invoice, nomornya ikut. */
    public function invoiceNumber(): string
    {
        return 'INV-'.substr($this->number, 4);
    }

    /**
     * Link invoice untuk customer — signed URL tanpa kedaluwarsa: bisa dibuka
     * tanpa login, tapi id di dalamnya tidak bisa diganti untuk mengintip
     * invoice orang lain. Isinya selalu kondisi terkini (DP → pelunasan).
     */
    public function invoiceUrl(): string
    {
        return URL::signedRoute('invoices.public', ['order' => $this->id]);
    }

    /** @return BelongsTo<Customer, $this> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** @return HasMany<OrderItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /** @return HasMany<Payment, $this> */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /** @return HasMany<JobCost, $this> */
    public function jobCosts(): HasMany
    {
        return $this->hasMany(JobCost::class);
    }

    public function total(): int
    {
        return $this->items->sum(fn (OrderItem $i) => $i->quantity * $i->unit_price) - $this->discount;
    }

    public function totalPaid(): int
    {
        return (int) $this->payments->sum('amount');
    }

    public function balance(): int
    {
        return $this->total() - $this->totalPaid();
    }

    /**
     * Status bayar DITURUNKAN, tidak pernah diinput (business-flow bagian 4)
     * — tidak mungkin "Lunas" padahal pembayarannya kurang.
     */
    public function paymentStatus(): PaymentStatus
    {
        $paid = $this->totalPaid();

        return match (true) {
            $paid <= 0 => PaymentStatus::Unpaid,
            $paid < $this->total() => PaymentStatus::Partial,
            default => PaymentStatus::Paid,
        };
    }

    /** Rasio 0..1 — badge DP menampilkan persentasenya (DESIGN.md R3). */
    public function paidRatio(): float
    {
        $total = $this->total();

        return $total === 0 ? 0.0 : $this->totalPaid() / $total;
    }

    /** HPP bahan yang terpakai. Jasa tidak punya HPP katalog. */
    public function materialCost(): int
    {
        return $this->items->sum(fn (OrderItem $i) => $i->quantity * ($i->unit_cost ?? 0));
    }

    /** Biaya langsung = HPP bahan + seluruh biaya job (business-flow bagian 7). */
    public function directCost(): int
    {
        return $this->materialCost() + (int) $this->jobCosts->sum('amount');
    }

    /**
     * Margin per order. Order BATAL dihitung dari uang yang sudah diterima
     * (DP hangus), bukan total order — sisanya tidak akan pernah ditagih,
     * sama dengan basis kas di Laba Rugi. Diputuskan owner 2026-10-06; tanpa
     * ini, order batal yang biaya job-nya melebihi DP tampil untung.
     */
    public function margin(): int
    {
        return ($this->isCancelled() ? $this->totalPaid() : $this->total()) - $this->directCost();
    }

    /** Hari menuju jatuh tempo. Positif = belum jatuh tempo, 0 = hari ini. */
    public function daysUntilDue(CarbonInterface $today): int
    {
        return (int) $today->startOfDay()->diffInDays($this->service_date, false);
    }

    /** "Keychain Foto Akrilik ×2, Cetak 4R ×6" — ringkasan untuk kolom tabel. */
    public function itemsSummary(): string
    {
        return $this->items
            ->map(fn (OrderItem $i) => $i->quantity > 1 ? "{$i->name} ×{$i->quantity}" : $i->name)
            ->implode(', ');
    }

    public function isCancelled(): bool
    {
        return $this->work_status === WorkStatus::Cancelled;
    }
}
