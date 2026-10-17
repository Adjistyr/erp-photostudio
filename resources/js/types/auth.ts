/** Peran pengguna (spek 5.1) — `App\Enums\UserRole`. */
export type UserRole = 'owner' | 'admin';

export type User = {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

/**
 * Nama Gate `App\Enums\Ability` dalam snake_case. Tambah di sini bersamaan
 * dengan case enum baru.
 */
export type Ability =
    | 'view_finance'
    | 'manage_catalog'
    | 'delete_money'
    | 'close_period'
    | 'manage_users'
    | 'manage_assets'
    | 'manage_templates'
    | 'record_operating_expense';

/** Hasil Gate dari server (`auth.can`) — klien tidak menebak dari `role`. */
export type Can = Record<Ability, boolean>;

export type Auth = {
    user: User;
    can: Can;
};

export type Passkey = {
    id: number;
    name: string;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
