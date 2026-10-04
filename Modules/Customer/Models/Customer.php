<?php

namespace Modules\Customer\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Modules\Order\Models\Order;

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
}
