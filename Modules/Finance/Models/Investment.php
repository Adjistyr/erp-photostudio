<?php

namespace Modules\Finance\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Modules\Shared\Models\Concerns\RecordsCreator;

/**
 * Renovasi, beli alat — DI LUAR laba rugi (8.4).
 *
 * @property int $id
 * @property CarbonImmutable $invested_on
 * @property string $description
 * @property int $amount
 * @property int|null $owner_contribution_id null = dibayar dari kas usaha
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read OwnerContribution|null $contribution
 */
#[Fillable(['invested_on', 'description', 'amount', 'owner_contribution_id', 'created_by'])]
class Investment extends Model
{
    use RecordsCreator;

    protected function casts(): array
    {
        return ['invested_on' => 'immutable_date', 'amount' => 'integer'];
    }

    /** @return BelongsTo<OwnerContribution, $this> */
    public function contribution(): BelongsTo
    {
        return $this->belongsTo(OwnerContribution::class, 'owner_contribution_id');
    }
}
