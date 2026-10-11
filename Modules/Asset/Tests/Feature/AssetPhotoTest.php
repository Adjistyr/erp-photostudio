<?php

namespace Modules\Asset\Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Asset\Models\Asset;
use Modules\Asset\Models\AssetPhoto;
use Tests\TestCase;

/** Foto alat & nota/garansi aset (spek 8.2) — privat. */
class AssetPhotoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        Storage::fake(AssetPhoto::DISK);
        $this->actingAs(User::factory()->create());
    }

    private function asset(string $name = 'Kamera mirrorless'): Asset
    {
        return Asset::where('name', $name)->sole();
    }

    /** @param  list<UploadedFile>  $files */
    private function upload(Asset $asset, string $kind, array $files)
    {
        return $this->post(route('assets.photos.store', $asset), ['kind' => $kind, 'photos' => $files]);
    }

    private function jpg(int $w = 2400, int $h = 1600): UploadedFile
    {
        return UploadedFile::fake()->image('alat.jpg', $w, $h);
    }

    private function pdf(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('nota-tokopedia.pdf', "%PDF-1.4\n%nota\n");
    }

    public function test_item_photo_is_reencoded_privately_with_thumbnail()
    {
        $asset = $this->asset();

        $this->upload($asset, 'item', [$this->jpg()])->assertSessionHasNoErrors();

        $photo = $asset->photos()->sole();
        $disk = Storage::disk(AssetPhoto::DISK);
        $large = getimagesizefromstring($disk->get($photo->path));
        $this->assertSame([1600, 1067, IMAGETYPE_WEBP], [$large[0], $large[1], $large[2]]);
        $this->assertTrue($disk->exists((string) $photo->thumb_path));
        $this->assertStringStartsWith("assets/{$asset->id}/", $photo->path);
        // Bukan disk publik.
        $this->assertFalse(Storage::disk('public')->exists($photo->path));
    }

    public function test_receipt_accepts_pdf_kept_as_is_but_item_rejects_pdf()
    {
        $asset = $this->asset();

        $this->upload($asset, 'receipt', [$this->pdf()])->assertSessionHasNoErrors();
        $nota = $asset->photos()->sole();
        $this->assertSame(['application/pdf', null, 'nota-tokopedia.pdf'], [$nota->mime, $nota->thumb_path, $nota->original_name]);
        $this->assertStringStartsWith('%PDF', Storage::disk(AssetPhoto::DISK)->get($nota->path));

        $this->upload($asset, 'item', [$this->pdf()])->assertSessionHasErrors(['photos.0' => 'Foto alat harus JPG, PNG, atau WebP.']);
        $this->upload($asset, 'lainnya', [$this->jpg()])->assertSessionHasErrors('kind');
    }

    public function test_limits_per_kind_with_remaining_slots()
    {
        $asset = $this->asset();
        $this->upload($asset, 'receipt', [$this->pdf(), $this->pdf(), $this->pdf()])->assertSessionHasNoErrors();

        $this->upload($asset, 'receipt', [$this->pdf(), $this->pdf()])
            ->assertSessionHasErrors(['photos' => 'Maksimal 4 nota & garansi per aset — sisa 1 slot.']);
        // Batas foto alat terpisah.
        $this->upload($asset, 'item', [$this->jpg(300, 300)])->assertSessionHasNoErrors();
        $this->assertSame(4, $asset->photos()->count());
    }

    public function test_show_serves_file_and_thumbnail_to_logged_in_user_only()
    {
        $asset = $this->asset();
        $this->upload($asset, 'item', [$this->jpg(800, 600)]);
        $this->upload($asset, 'receipt', [$this->pdf()]);
        [$foto, $nota] = [$asset->photos()->where('kind', 'item')->sole(), $asset->photos()->where('kind', 'receipt')->sole()];

        $this->get(route('assets.photos.show', [$asset, $foto]))->assertOk()->assertHeader('Content-Type', 'image/webp');
        $thumb = $this->get(route('assets.photos.show', [$asset, $foto, 'size' => 'thumb']))->assertOk();
        $this->assertSame(400, getimagesizefromstring((string) $thumb->streamedContent())[0]);
        $this->get(route('assets.photos.show', [$asset, $nota]))->assertOk()->assertHeader('Content-Type', 'application/pdf');

        auth()->logout();
        $this->get(route('assets.photos.show', [$asset, $foto]))->assertRedirect(route('login'));
    }

    public function test_cover_and_destroy()
    {
        $asset = $this->asset();
        $this->upload($asset, 'item', [$this->jpg(300, 300), $this->jpg(400, 400)]);
        $this->upload($asset, 'receipt', [$this->pdf()]);
        [$a, $b] = $asset->photos()->where('kind', 'item')->get()->all();
        $nota = $asset->photos()->where('kind', 'receipt')->sole();

        $this->patch(route('assets.photos.cover', [$asset, $b]))->assertSessionHasNoErrors();
        $this->assertSame([$b->id, $a->id], $asset->photos()->where('kind', 'item')->pluck('id')->all());
        // Nota tidak punya sampul.
        $this->patch(route('assets.photos.cover', [$asset, $nota]))->assertNotFound();

        $this->delete(route('assets.photos.destroy', [$asset, $nota]))->assertSessionHasNoErrors();
        $this->assertNull(AssetPhoto::find($nota->id));
        $this->assertFalse(Storage::disk(AssetPhoto::DISK)->exists($nota->path));
    }

    public function test_photo_of_other_asset_is_not_found()
    {
        $mine = $this->asset();
        $other = $this->asset('Printer foto');
        $this->upload($other, 'item', [$this->jpg(300, 300)]);
        $photo = $other->photos()->sole();

        $this->get(route('assets.photos.show', [$mine, $photo]))->assertNotFound();
        $this->delete(route('assets.photos.destroy', [$mine, $photo]))->assertNotFound();
        $this->assertNotNull(AssetPhoto::find($photo->id));
    }

    public function test_props_carry_cover_in_list_and_both_galleries_in_detail()
    {
        $asset = $this->asset();
        $this->upload($asset, 'item', [$this->jpg(300, 300)]);
        $this->upload($asset, 'receipt', [$this->pdf()]);
        $cover = $asset->photos()->where('kind', 'item')->sole();

        $this->get(route('assets.index'))->assertInertia(fn (Assert $page) => $page
            ->where('assets.0.photo_url', route('assets.photos.show', [$asset, $cover, 'size' => 'thumb']))
            ->where('assets.1.photo_url', null));
        $this->get(route('assets.show', $asset))->assertInertia(fn (Assert $page) => $page
            ->has('asset.photos', 2)
            ->where('asset.photos.1.is_pdf', true)
            ->where('asset.photos.1.thumb_url', null)
            ->where('asset.photos.1.name', 'nota-tokopedia.pdf'));
    }
}
