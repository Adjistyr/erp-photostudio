<?php

namespace Modules\Customer\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Modules\Customer\Support\Phone;
use Modules\Order\Enums\WorkStatus;
use Modules\Order\Models\Order;
use Modules\Shared\Http\ListQuery;

/**
 * @property int $id
 * @property string $name
 * @property string|null $phone
 * @property string|null $email
 * @property string|null $source
 * @property string|null $notes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, Order> $orders
 */
#[Fillable(['name', 'phone', 'email', 'source', 'notes'])]
class Customer extends Model
{
    /**
     * Sumber tahu studio — untuk mengukur kanal mana yang benar-benar
     * mendatangkan customer (business-flow 5.6).
     */
    public const SOURCES = ['Instagram', 'Teman', 'Lewat depan studio', 'Google Maps', 'Lainnya'];

    /** @return HasMany<Order, $this> */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /**
     * Pencarian daftar customer (spek 3.1): nama tanpa beda huruf besar, HP
     * digit saja; `line` = pernah bertransaksi (tidak batal) di lini itu.
     *
     * @param  Builder<self>  $query
     */
    public function scopeSearch(Builder $query, ListQuery $list): void
    {
        if ($list->q !== '') {
            $query->where(function (Builder $w) use ($list) {
                $w->whereRaw('LOWER(name) LIKE ?', ['%'.mb_strtolower($list->q).'%']);
                if ($list->phoneDigits() !== '') {
                    $w->orWhereRaw(Phone::SQL_NORMALISED_PHONE.' LIKE ?', ['%'.Phone::normalise($list->phoneDigits()).'%']);
                }
            });
        }
        if (($line = $list->get('line')) !== null) {
            $query->whereHas('orders', fn (Builder $o) => $o
                ->where('business_line', $line)
                ->where('work_status', '!=', WorkStatus::Cancelled));
        }
    }
}
