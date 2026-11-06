<?php

namespace App\Providers;

use App\Enums\Ability;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Inertia\ExceptionResponse;
use Inertia\Inertia;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureGates();
        $this->configureErrorPages();
    }

    /**
     * Halaman error berbahasa Indonesia (`resources/js/pages/error.tsx`)
     * menggantikan halaman Laravel bawaan berbahasa Inggris tanpa jalan
     * kembali. 403/404 di semua environment — tidak ada info debug yang
     * hilang. 500/503 hanya di luar local/testing supaya stack trace Laravel
     * tetap tampil saat pengembangan. Request JSON jatuh ke render bawaan
     * (null) supaya `shouldRenderJsonWhen` tetap berlaku.
     */
    private function configureErrorPages(): void
    {
        Inertia::handleExceptionsUsing(function (ExceptionResponse $response) {
            $status = $response->statusCode();
            $debugStatus = in_array($status, [500, 503], true) && ! app()->environment(['local', 'testing']);

            if ($response->request->expectsJson() || (! in_array($status, [403, 404], true) && ! $debugStatus)) {
                return null;
            }

            return $response->render('error', ['status' => $status])->withSharedData();
        });
    }

    /**
     * Hak akses peran (spek 5.1) — satu tempat. Bukan Policy: tidak ada
     * aturan per model, hanya "owner boleh, admin tidak". Daftar Gate di
     * App\Enums\Ability; route memakai `can:<nama>`, klien `auth.can`.
     */
    protected function configureGates(): void
    {
        foreach (Ability::cases() as $ability) {
            Gate::define($ability->value, fn (User $user): bool => $user->isOwner());
        }
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
