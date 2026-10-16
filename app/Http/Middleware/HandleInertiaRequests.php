<?php

namespace App\Http\Middleware;

use App\Enums\Ability;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
                // Hak akses dari Gate (spek 5.1) — klien tidak menebak dari `role`.
                'can' => $this->abilities(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }

    /**
     * Semua Gate App\Enums\Ability sebagai `{view_finance: bool, ...}`.
     * Tamu: semuanya false.
     *
     * @return array<string, bool>
     */
    private function abilities(): array
    {
        $can = [];
        foreach (Ability::cases() as $ability) {
            $can[$ability->key()] = Gate::allows($ability);
        }

        return $can;
    }
}
