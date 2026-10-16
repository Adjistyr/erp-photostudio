<?php

namespace App\Http\Controllers\Settings;

use App\Actions\Fortify\CreateNewUser;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\StoreUserRequest;
use App\Http\Requests\Settings\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Settings → Pengguna (spek 5.1), hanya owner (`can:manage-users`). Tidak
 * ada hapus/nonaktif: akun yang tidak dipakai diganti sandinya.
 * ponytail: kolom `disabled_at` kalau pergantian staf mulai sering.
 */
class UserController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('settings/users', [
            'users' => User::orderBy('name')->get()->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role->value,
                'created_at' => $u->created_at?->toDateString(),
            ])->values()->all(),
            'roles' => UserRole::options(),
        ]);
    }

    /**
     * Lewat CreateNewUser — aturan email unik & kebijakan sandi satu sumber
     * dengan `app:buat-pengguna`. Akun buatan owner langsung terverifikasi.
     */
    public function store(StoreUserRequest $request, CreateNewUser $creator): RedirectResponse
    {
        /** @var array<string, string> $input */
        $input = $request->only(['name', 'email', 'role', 'password', 'password_confirmation']);
        $user = $creator->create($input);
        $user->forceFill(['email_verified_at' => now()])->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$user->name} ditambahkan sebagai {$user->role->label()}."]);

        return to_route('users.index');
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $user->name = $request->string('name')->trim()->value();
        $user->role = $request->enum('role', UserRole::class) ?? $user->role;
        if ($request->filled('password')) {
            $user->password = $request->string('password')->value();
        }
        $user->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => "Data {$user->name} diperbarui."]);

        return to_route('users.index');
    }
}
