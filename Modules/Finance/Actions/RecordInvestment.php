<?php

namespace Modules\Finance\Actions;

use Modules\Finance\Enums\ContributionDestination;
use Modules\Finance\Enums\ContributionKind;
use Modules\Finance\Models\Investment;
use Modules\Finance\Models\Owner;
use Modules\Finance\Models\OwnerContribution;

/**
 * Investasi (+ setoran modal kalau dibayar owner). Satu-satunya tempat yang
 * mencatat keduanya — dipakai Catat Investasi dan Tambah Aset, supaya modal
 * owner di progres balik modal selalu tercatat dengan cara yang sama.
 *
 * Pemanggil membungkusnya dalam transaksi bersama data lain (mis. aset).
 */
class RecordInvestment
{
    public function execute(string $description, int $amount, string $date, ?Owner $paidBy): Investment
    {
        $contribution = $paidBy === null ? null : OwnerContribution::create([
            'owner_id' => $paidBy->id,
            'contributed_on' => $date,
            'amount' => $amount,
            // Dibayar owner = modal (bukan pinjaman): kembalinya lewat bagi
            // hasil, sama dengan modal awal alat di DemoSeeder.
            'kind' => ContributionKind::Equity,
            'destination' => ContributionDestination::Investment,
            'note' => $description,
        ]);

        return Investment::create([
            'invested_on' => $date,
            'description' => $description,
            'amount' => $amount,
            'owner_contribution_id' => $contribution?->id,
        ]);
    }
}
