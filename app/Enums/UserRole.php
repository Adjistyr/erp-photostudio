<?php

namespace App\Enums;

/**
 * Peran pengguna (spek 5.1). Admin mencatat transaksi harian; owner melihat
 * uang dan mengelola data induk. Hak tiap peran: App\Enums\Ability.
 */
enum UserRole: string
{
    case Owner = 'owner';
    case Admin = 'admin';

    public function label(): string
    {
        return match ($this) {
            self::Owner => 'Owner',
            self::Admin => 'Admin',
        };
    }

    public function isOwner(): bool
    {
        return $this === self::Owner;
    }

    /** @return list<array{value: string, label: string}> */
    public static function options(): array
    {
        return array_map(fn (self $r) => ['value' => $r->value, 'label' => $r->label()], self::cases());
    }
}
