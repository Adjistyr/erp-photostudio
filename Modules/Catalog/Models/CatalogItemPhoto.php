<?php

namespace Modules\Catalog\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * Satu foto galeri item katalog (spek 7.1). Selalu WebP hasil sandi ulang
 * server — file asli tidak disimpan.
 *
 * @property int $id
 * @property int $catalog_item_id
 * @property string $path WebP besar (sisi terpanjang ≤ 1600 px)
 * @property string $thumb_path WebP persegi 400 × 400
 * @property int $position terkecil = sampul
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read CatalogItem $item
 */
#[Fillable(['catalog_item_id', 'path', 'thumb_path', 'position'])]
class CatalogItemPhoto extends Model
{
    /**
     * Foto produk memang untuk dilihat orang (POS, company profile) — publik,
     * berbeda dengan bukti transfer (6.7) yang privat. Pindah ke S3 cukup
     * dengan mengganti driver disk ini di config/filesystems.php.
     */
    public const DISK = 'public';

    /** Galeri per item — cukup untuk company profile tanpa membebani dialog. */
    public const MAX_PER_ITEM = 8;

    protected function casts(): array
    {
        return ['position' => 'integer'];
    }

    /** @return BelongsTo<CatalogItem, $this> */
    public function item(): BelongsTo
    {
        return $this->belongsTo(CatalogItem::class, 'catalog_item_id');
    }

    public function url(): string
    {
        return Storage::disk(self::DISK)->url($this->path);
    }

    public function thumbUrl(): string
    {
        return Storage::disk(self::DISK)->url($this->thumb_path);
    }

    /** Hapus kedua file — dipanggil sebelum baris dihapus. */
    public function deleteFiles(): void
    {
        Storage::disk(self::DISK)->delete([$this->path, $this->thumb_path]);
    }

    /** @return array{id: int, url: string, thumb_url: string} */
    public function toProps(): array
    {
        return ['id' => $this->id, 'url' => $this->url(), 'thumb_url' => $this->thumbUrl()];
    }
}
