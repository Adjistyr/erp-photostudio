<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Vite;
use Tests\TestCase;

/**
 * `app.blade.php` mem-preload file halaman lewat @vite. Test lain memakai
 * withoutVite(), jadi salah path di sini baru ketahuan sebagai 500 di
 * browser — test ini memakai manifest palsu supaya @vite benar-benar jalan.
 */
class InertiaPageAssetTest extends TestCase
{
    use RefreshDatabase;

    private string $dir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withVite();
        $this->dir = public_path('build-test');
        File::ensureDirectoryExists($this->dir);
        $entry = fn (string $src, string $file) => [$src => ['file' => $file, 'src' => $src, 'isEntry' => true]];
        File::put($this->dir.'/manifest.json', json_encode([
            ...$entry('resources/css/app.css', 'assets/app.css'),
            ...$entry('resources/js/app.tsx', 'assets/app.js'),
            ...$entry('resources/js/pages/dashboard.tsx', 'assets/dashboard.js'),
            ...$entry('resources/js/modules/catalog/pages/index.tsx', 'assets/catalog-index.js'),
        ]));
        Vite::useBuildDirectory('build-test');
        $this->actingAs(User::factory()->create());
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->dir);
        parent::tearDown();
    }

    public function test_module_page_is_preloaded_from_its_module_folder()
    {
        // "catalog::index" → resources/js/modules/catalog/pages/index.tsx
        $this->get(route('catalog.index'))->assertOk()->assertSee('build-test/assets/catalog-index.js');
    }

    public function test_app_page_is_preloaded_from_pages_folder()
    {
        $this->get(route('dashboard'))->assertOk()->assertSee('build-test/assets/dashboard.js');
    }
}
