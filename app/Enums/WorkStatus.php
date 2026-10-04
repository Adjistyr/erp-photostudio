<?php

namespace App\Enums;

/**
 * Status kerja — diinput manual (business-flow bagian 4). Status bayar TIDAK
 * ada di sini: ia selalu diturunkan dari pembayaran, lihat PaymentStatus.
 */
enum WorkStatus: string
{
    case Booking = 'booking';
    case Scheduled = 'scheduled';
    case InProgress = 'in_progress';
    case Done = 'done';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';
}
