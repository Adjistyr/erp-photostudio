<?php

namespace App\Enums;

enum MaintenanceType: string
{
    case Routine = 'routine';
    case Repair = 'repair';
}
