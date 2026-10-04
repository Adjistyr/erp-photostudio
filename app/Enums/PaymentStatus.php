<?php

namespace App\Enums;

/** Diturunkan dari total pembayaran vs total order — tidak pernah disimpan. */
enum PaymentStatus: string
{
    case Unpaid = 'unpaid';
    case Partial = 'partial';
    case Paid = 'paid';
}
