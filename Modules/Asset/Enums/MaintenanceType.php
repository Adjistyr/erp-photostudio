<?php

namespace Modules\Asset\Enums;

enum MaintenanceType: string
{
    case Routine = 'routine';
    case Repair = 'repair';
}
