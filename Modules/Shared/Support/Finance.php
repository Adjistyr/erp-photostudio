<?php

namespace Modules\Shared\Support;

use App\Enums\Ability;
use Closure;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Gate;

/**
 * Props finansial untuk pengguna tanpa `view-finance` (admin, spek 5.1)
 * DIHAPUS di server, bukan diisi null — klien merender kolom dari ada-tidaknya
 * field, dan bisa membedakan "tidak boleh lihat" dari "nol".
 *
 *     'items' => $rows->map(fn ($r) => Finance::except([...], ['unit_cost']))
 *     ...Finance::only(fn () => ['revenue' => $pnl->revenue($month)])
 */
final class Finance
{
    public static function visible(): bool
    {
        return Gate::allows(Ability::ViewFinance);
    }

    /**
     * `$props` tanpa `$keys` (dot notation boleh, mis. `summary.book_value`)
     * bila pengguna tidak boleh melihat keuangan; utuh bila boleh.
     *
     * @param  array<string, mixed>  $props
     * @param  list<string>  $keys
     * @return array<string, mixed>
     */
    public static function except(array $props, array $keys): array
    {
        return self::visible() ? $props : Arr::except($props, $keys);
    }

    /**
     * Props yang SELURUHNYA finansial — disebar ke array props
     * (`...Finance::only(fn () => [...])`); kosong untuk admin, dan tidak
     * dihitung sama sekali.
     *
     * @param  Closure(): array<string, mixed>  $props
     * @return array<string, mixed>
     */
    public static function only(Closure $props): array
    {
        return self::visible() ? $props() : [];
    }
}
