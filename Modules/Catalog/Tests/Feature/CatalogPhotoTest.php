<?php

namespace Modules\Catalog\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Catalog\Enums\CatalogItemType;
use Modules\Catalog\Models\CatalogItem;
use Modules\Catalog\Models\CatalogItemPhoto;
use Tests\TestCase;

/** Galeri foto item katalog (spek 7.1). */
class CatalogPhotoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake(CatalogItemPhoto::DISK);
        $this->actingAs(User::factory()->create());
    }

    private function item(string $name = 'Keychain Foto Akrilik'): CatalogItem
    {
        return CatalogItem::create([
            'name' => $name, 'type' => CatalogItemType::Product, 'price' => 25_000, 'unit_cost' => 8_000, 'category' => 'Merchandise',
        ]);
    }

    /** @param  list<UploadedFile>  $files */
    private function upload(CatalogItem $item, array $files)
    {
        return $this->post(route('catalog.photos.store', $item), ['photos' => $files]);
    }

    private function jpg(int $w = 2400, int $h = 1600): UploadedFile
    {
        return UploadedFile::fake()->image("foto-{$w}x{$h}.jpg", $w, $h);
    }

    public function test_upload_stores_resized_webp_and_square_thumbnail()
    {
        $item = $this->item();

        $this->upload($item, [$this->jpg()])->assertSessionHasNoErrors();

        $photo = $item->photos()->sole();
        $disk = Storage::disk(CatalogItemPhoto::DISK);
        // Selalu WebP hasil sandi ulang — bukan file asli. 2400×1600 → 1600×1067.
        $large = getimagesizefromstring($disk->get($photo->path));
        $this->assertSame([1600, 1067, IMAGETYPE_WEBP], [$large[0], $large[1], $large[2]]);
        $thumb = getimagesizefromstring($disk->get($photo->thumb_path));
        $this->assertSame([400, 400, IMAGETYPE_WEBP], [$thumb[0], $thumb[1], $thumb[2]]);
        $this->assertStringStartsWith("catalog/{$item->id}/", $photo->path);
    }

    public function test_small_photo_is_not_upscaled()
    {
        $item = $this->item();

        $this->upload($item, [$this->jpg(800, 600)])->assertSessionHasNoErrors();

        $size = getimagesizefromstring(Storage::disk(CatalogItemPhoto::DISK)->get($item->photos()->sole()->path));
        $this->assertSame([800, 600], [$size[0], $size[1]]);
    }

    public function test_upload_appends_positions_and_first_photo_is_cover()
    {
        $item = $this->item();

        $this->upload($item, [$this->jpg(), $this->jpg(1000, 1000)])->assertSessionHasNoErrors();
        $this->upload($item, [$this->jpg(600, 900)])->assertSessionHasNoErrors();

        $this->assertSame([1, 2, 3], $item->photos()->pluck('position')->all());
        $first = $item->photos()->first();
        $this->get(route('catalog.index'))->assertInertia(fn (Assert $page) => $page
            ->has('items.0.photos', 3)
            ->where('items.0.photos.0.id', $first?->id)
            ->where('items.0.photos.0.thumb_url', fn (string $url) => str_ends_with($url, '-thumb.webp')));
    }

    public function test_rejects_non_image_and_oversized_dimensions()
    {
        $item = $this->item();

        $this->upload($item, [UploadedFile::fake()->create('nota.pdf', 100, 'application/pdf')])
            ->assertSessionHasErrors(['photos.0' => 'Foto harus JPG, PNG, atau WebP.']);
        $this->upload($item, [$this->jpg(4200, 1000)])
            ->assertSessionHasErrors(['photos.0' => 'Foto maksimal 4000 × 4000 piksel.']);
        $this->post(route('catalog.photos.store', $item), [])->assertSessionHasErrors('photos');

        $this->assertSame(0, CatalogItemPhoto::count());
        $this->assertSame([], Storage::disk(CatalogItemPhoto::DISK)->allFiles());
    }

    public function test_rejects_upload_beyond_eight_photos_with_remaining_slots()
    {
        $item = $this->item();
        $this->upload($item, array_map(fn () => $this->jpg(300, 300), range(1, 6)))->assertSessionHasNoErrors();

        $this->upload($item, array_map(fn () => $this->jpg(300, 300), range(1, 3)))
            ->assertSessionHasErrors(['photos' => 'Maksimal 8 foto per item — sisa 2 slot.']);

        $this->assertSame(6, $item->photos()->count());
    }

    public function test_destroy_removes_row_and_files()
    {
        $item = $this->item();
        $this->upload($item, [$this->jpg(), $this->jpg(500, 500)]);
        [$gone, $kept] = $item->photos()->get()->all();

        $this->delete(route('catalog.photos.destroy', [$item, $gone]))->assertSessionHasNoErrors();

        $disk = Storage::disk(CatalogItemPhoto::DISK);
        $this->assertNull(CatalogItemPhoto::find($gone->id));
        $this->assertFalse($disk->exists($gone->path));
        $this->assertFalse($disk->exists($gone->thumb_path));
        $this->assertTrue($disk->exists($kept->path));
    }

    public function test_cover_moves_photo_to_front_keeping_others_order()
    {
        $item = $this->item();
        $this->upload($item, [$this->jpg(300, 300), $this->jpg(400, 400), $this->jpg(500, 500)]);
        [$a, $b, $c] = $item->photos()->pluck('id')->all();

        $this->patch(route('catalog.photos.cover', [$item, $c]))->assertSessionHasNoErrors();
        $this->assertSame([$c, $a, $b], $item->photos()->pluck('id')->all());

        // Sudah sampul → tidak ada yang berubah.
        $this->patch(route('catalog.photos.cover', [$item, $c]));
        $this->assertSame([$c, $a, $b], $item->photos()->pluck('id')->all());
    }

    public function test_photo_of_other_item_is_not_found()
    {
        $mine = $this->item();
        $other = $this->item('Cetak 4R');
        $this->upload($other, [$this->jpg(300, 300)]);
        $photo = $other->photos()->sole();

        $this->delete(route('catalog.photos.destroy', [$mine, $photo]))->assertNotFound();
        $this->patch(route('catalog.photos.cover', [$mine, $photo]))->assertNotFound();
        $this->assertNotNull(CatalogItemPhoto::find($photo->id));
    }

    public function test_guest_cannot_upload()
    {
        $item = $this->item();
        auth()->logout();

        $this->upload($item, [$this->jpg()])->assertRedirect(route('login'));
        $this->assertSame(0, CatalogItemPhoto::count());
    }
}
