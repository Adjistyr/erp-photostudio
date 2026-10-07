<?php

namespace Modules\Expense\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Modules\Shared\Models\Concerns\RecordsCreator;

/**
 * Biaya operasional bulanan — tidak dinisbatkan ke order mana pun.
 *
 * @property int $id
 * @property CarbonImmutable $spent_on
 * @property string $category
 * @property string $description
 * @property int $amount
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['spent_on', 'category', 'description', 'amount', 'created_by'])]
class OperatingExpense extends Model
{
    use RecordsCreator;

    protected function casts(): array
    {
        return [
            'spent_on' => 'immutable_date',
            'amount' => 'integer',
        ];
    }
}
