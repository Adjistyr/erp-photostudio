<?php

namespace Modules\Shared\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\View\FileViewFinder;

/**
 * Dasar provider modul ber-layar: memuat `Modules/<Modul>/Routes/web.php`
 * dan mendaftarkan halaman Inertia `<modul>::<halaman>` →
 * `resources/js/modules/<modul>/pages/<halaman>.tsx`.
 *
 * Dipusatkan di sini, bukan disalin per modul: tiga (dan terus bertambah)
 * provider dengan isi identik hanya beda nama gampang menyimpang satu sama
 * lain. Modul tanpa layar (Expense, Asset, Finance) belum butuh provider.
 */
abstract class ModuleServiceProvider extends ServiceProvider
{
    /** Nama folder di Modules/, mis. "Order". */
    protected string $module;

    public function register(): void
    {
        $pages = Str::lower($this->module);

        // `inertia.view-finder` di-bind (instance baru tiap resolve), jadi
        // namespace harus didaftarkan lewat extend — addNamespace pada satu
        // instance hilang di resolve berikutnya. Finder ini yang dipakai
        // assertInertia()->component() untuk memastikan file halaman ada.
        $this->app->extend('inertia.view-finder', function (FileViewFinder $finder) use ($pages) {
            $finder->addNamespace($pages, resource_path("js/modules/{$pages}/pages"));

            return $finder;
        });
    }

    public function boot(): void
    {
        $this->loadRoutesFrom(base_path("Modules/{$this->module}/Routes/web.php"));
    }
}
