<?php

namespace Modules\Finance\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Modules\Finance\Enums\ContributionDestination;
use Modules\Finance\Enums\ContributionKind;

/**
 * Uang dari owner ke usaha — bukan omzet, tidak memengaruhi laba (8.3).
 *
 * @property int $id
 * @property int $owner_id
 * @property CarbonImmutable $contributed_on
 * @property int $amount
 * @property ContributionKind $kind
 * @property ContributionDestination $destination
 * @property string $note
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Owner $owner
 */
#[Fillable(['owner_id', 'contributed_on', 'amount', 'kind', 'destination', 'note'])]
class OwnerContribution extends Model
{
    protected function casts(): array
    {
        return [
            'contributed_on' => 'immutable_date',
            'amount' => 'integer',
            'kind' => ContributionKind::class,
            'destination' => ContributionDestination::class,
        ];
    }

    /** @return BelongsTo<Owner, $this> */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class);
    }
}
