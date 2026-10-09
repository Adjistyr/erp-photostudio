<?php

namespace Modules\Shared\Http;

use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Unduhan CSV streaming tanpa paket tambahan (spek 4.5). BOM UTF-8 di awal
 * supaya Excel Windows membaca "é"/"–" dengan benar; uang integer rupiah
 * tanpa pemisah ribuan supaya bisa langsung dijumlahkan di spreadsheet.
 *
 * `$rows` sebaiknya generator (`yield` dari `lazy()`) — baris tidak dimuat
 * semua ke memori.
 */
final class CsvResponse
{
    /**
     * @param  iterable<array<int, scalar|null>>  $rows
     * @param  list<string>  $header
     */
    public static function stream(string $filename, iterable $rows, array $header): StreamedResponse
    {
        return response()->streamDownload(function () use ($rows, $header): void {
            $out = fopen('php://output', 'w');
            if ($out === false) {
                return;
            }
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, $header, escape: '');
            foreach ($rows as $row) {
                fputcsv($out, $row, escape: '');
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
