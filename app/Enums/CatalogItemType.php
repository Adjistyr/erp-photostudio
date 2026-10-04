<?php

namespace App\Enums;

/** Produk punya HPP bahan per unit; jasa tidak — biayanya dicatat per job. */
enum CatalogItemType: string
{
    case Product = 'product';
    case Service = 'service';
}
