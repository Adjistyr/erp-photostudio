<?php

namespace Modules\Shared\Http;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * Pencarian + filter daftar dari query string (spek 3.1). Filter hidup di URL
 * supaya bisa dibagikan dan tombol kembali browser berfungsi.
 *
 * Nilai yang tidak dikenal DIBUANG, bukan error — URL sering diketik manual
 * (sama dengan Periods::orCurrent()).
 */
final readonly class ListQuery
{
    public const PER_PAGE = 25;

    /**
     * @param  array<string, string>  $filters  hanya kunci yang diizinkan & nilainya sah
     */
    public function __construct(
        public string $q,
        public array $filters,
    ) {}

    /**
     * @param  array<string, list<string>|'date'>  $allowed  kunci → daftar nilai sah, atau 'date' (Y-m-d)
     */
    public static function fromRequest(Request $request, array $allowed): self
    {
        $q = mb_substr(trim((string) $request->query('q', '')), 0, 100);

        $filters = [];
        foreach ($allowed as $key => $valid) {
            $value = $request->query($key);
            if (! is_string($value) || $value === '') {
                continue;
            }
            $ok = $valid === 'date'
                ? self::isDate($value)
                : in_array($value, $valid, true);
            if ($ok) {
                $filters[$key] = $value;
            }
        }

        return new self($q, $filters);
    }

    /**
     * Tanggal kalender sah — bukan canBeCreatedFromFormat(), yang menerima
     * "2026-02-30" (meluap jadi 2 Maret). Dibuat lalu diformat ulang harus
     * sama persis dengan input.
     */
    private static function isDate(string $value): bool
    {
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
            return false;
        }
        $date = Carbon::createFromFormat('Y-m-d', $value);

        return $date instanceof Carbon && $date->format('Y-m-d') === $value;
    }

    public function get(string $key): ?string
    {
        return $this->filters[$key] ?? null;
    }

    /**
     * Digit `q` bila `q` BERBENTUK nomor telepon — hanya digit dan tanda baca
     * telepon (`+ - ( ) spasi`), minimal 4 digit. Selain itu '' supaya
     * "ORD-0012" tidak ikut mencocokkan semua HP yang mengandung "0012".
     */
    public function phoneDigits(): string
    {
        if (preg_match('/^[\d\s+\-().]+$/', $this->q) !== 1) {
            return '';
        }
        $digits = preg_replace('/\D+/', '', $this->q) ?? '';

        return strlen($digits) >= 4 ? $digits : '';
    }

    /**
     * Prop `filters` untuk toolbar — nilai aktif setelah reload.
     *
     * @return array<string, string>
     */
    public function toArray(): array
    {
        return ['q' => $this->q, ...$this->filters];
    }

    /**
     * Bentuk paginasi yang dikirim ke halaman — hanya lima kunci yang dipakai
     * klien, bukan `links`/`path` bawaan Laravel.
     *
     * @template TItem
     *
     * @param  LengthAwarePaginator<int, TItem>  $paginator
     * @param  callable(TItem): array<string, mixed>  $map
     * @return array{data: list<array<string, mixed>>, current_page: int, last_page: int, total: int, per_page: int}
     */
    public static function paginated(LengthAwarePaginator $paginator, callable $map): array
    {
        return [
            'data' => array_values(array_map($map, $paginator->items())),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'total' => $paginator->total(),
            'per_page' => $paginator->perPage(),
        ];
    }
}
