<?php

namespace Modules\Order\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Storage;
use Modules\Order\Models\Payment;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Bukti transfer/QRIS (spek 6.7). Route ber-auth + `signed` — URL dari
 * Payment::proofUrl() berlaku 10 menit; invoice publik tidak pernah memuatnya.
 */
class PaymentProofController extends Controller
{
    public function show(Payment $payment): StreamedResponse
    {
        $disk = Storage::disk(Payment::PROOF_DISK);
        abort_unless($payment->proof_path !== null && $disk->exists($payment->proof_path), 404);

        return $disk->response($payment->proof_path, null, [
            'Cache-Control' => 'private, max-age=600',
        ]);
    }
}
