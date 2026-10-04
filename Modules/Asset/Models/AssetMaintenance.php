<?php

namespace Modules\Asset\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Modules\Asset\Enums\MaintenanceType;

/**
 * Riwayat perawatan/perbaikan. Biaya > 0 diambil dari dana maintenance.
 *
 * @property int $id
 * @property int $asset_id
 * @property CarbonImmutable $performed_on
 * @property MaintenanceType $type
 * @property string $description
 * @property int $cost
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Asset $asset
 */
#[Fillable(['asset_id', 'performed_on', 'type', 'description', 'cost'])]
class AssetMaintenance extends Model
{
    protected function casts(): array
    {
        return [
            'performed_on' => 'immutable_date',
            'type' => MaintenanceType::class,
            'cost' => 'integer',
        ];
    }

    /** @return BelongsTo<Asset, $this> */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }
}
