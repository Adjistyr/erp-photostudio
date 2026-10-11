<?php

namespace Modules\Asset\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Modules\Asset\Enums\AssetPhotoKind;
use Modules\Shared\Models\Concerns\RecordsCreator;

/**
 * Foto alat atau nota/garansi aset (spek 8.2). Gambar = WebP hasil sandi
 * ulang; PDF nota disimpan apa adanya (tanpa thumbnail).
 *
 * @property int $id
 * @property int $asset_id
 * @property AssetPhotoKind $kind
 * @property string $path
 * @property string|null $thumb_path null untuk PDF
 * @property string $mime
 * @property string $original_name
 * @property int $position terkecil = sampul (foto alat)
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Asset $asset
 */
#[Fillable(['asset_id', 'kind', 'path', 'thumb_path', 'mime', 'original_name', 'position', 'created_by'])]
class AssetPhoto extends Model
{
    use RecordsCreator;

    /**
     * Privat — berbeda dengan foto katalog (publik, untuk company profile).
     * Dibuka lewat route ber-auth `assets.photos.show`, bukan URL langsung.
     */
    public const DISK = 'local';

    protected function casts(): array
    {
        return ['kind' => AssetPhotoKind::class, 'position' => 'integer'];
    }

    /** @return BelongsTo<Asset, $this> */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    public function isPdf(): bool
    {
        return $this->mime === 'application/pdf';
    }

    public function deleteFiles(): void
    {
        Storage::disk(self::DISK)->delete(array_filter([$this->path, $this->thumb_path]));
    }

    /** @return array{id: int, kind: string, url: string, thumb_url: string|null, is_pdf: bool, name: string} */
    public function toProps(): array
    {
        $params = ['asset' => $this->asset_id, 'photo' => $this->id];

        return [
            'id' => $this->id,
            'kind' => $this->kind->value,
            'url' => route('assets.photos.show', $params),
            'thumb_url' => $this->thumb_path ? route('assets.photos.show', [...$params, 'size' => 'thumb']) : null,
            'is_pdf' => $this->isPdf(),
            'name' => $this->original_name,
        ];
    }
}
