<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Validator;

/**
 * Ubah pengguna (spek 5.1): nama, peran, sandi baru opsional. Email tidak
 * diubah di sini — pemilik akun mengubahnya sendiri di Profil (verifikasi).
 * Akun yang tidak dipakai lagi: owner mengganti sandinya (tidak ada hapus).
 */
class UpdateUserRequest extends FormRequest
{
    use ProfileValidationRules;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => $this->nameRules(),
            'role' => ['required', Rule::enum(UserRole::class)],
            'password' => ['nullable', 'string', Password::default(), 'confirmed'],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return ['role' => 'peran', 'password' => 'sandi baru'];
    }

    /**
     * Minimal satu owner harus tetap ada (aturan 5), dan owner tidak
     * mengubah perannya sendiri — supaya tidak terkunci dari halaman ini.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                /** @var User $target */
                $target = $this->route('user');
                if ($validator->errors()->has('role') || $this->enum('role', UserRole::class) === $target->role) {
                    return;
                }
                if ($target->isLastOwner()) {
                    $validator->errors()->add('role', 'Harus ada minimal satu owner.');
                } elseif ($target->is($this->user())) {
                    $validator->errors()->add('role', 'Peran akun sendiri tidak bisa diubah — minta owner lain.');
                }
            },
        ];
    }
}
