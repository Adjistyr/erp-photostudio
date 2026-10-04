<?php

namespace Modules\Finance\Enums;

/** Pos dana (business-flow 8.2): disisihkan dari laba, saldo tidak boleh minus. */
enum Fund: string
{
    case Maintenance = 'maintenance';
    case Reserve = 'reserve';

    public function label(): string
    {
        return match ($this) {
            self::Maintenance => 'Dana maintenance',
            self::Reserve => 'Dana cadangan',
        };
    }

    public function contributionDestination(): ContributionDestination
    {
        return match ($this) {
            self::Maintenance => ContributionDestination::MaintenanceFund,
            self::Reserve => ContributionDestination::ReserveFund,
        };
    }
}
