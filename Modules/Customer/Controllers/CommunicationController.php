<?php

namespace Modules\Customer\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Customer\Mail\BlastMessage;
use Modules\Customer\Models\Customer;
use Modules\Customer\Models\MessageTemplate;
use Modules\Customer\Requests\SendEmailBlastRequest;
use Modules\Customer\Requests\UpdateMessageTemplateRequest;
use Modules\Finance\Services\CustomerSummary;
use Modules\Finance\Services\SalesReport;
use Modules\Shared\Enums\BusinessLine;

/**
 * Komunikasi (prompt 4.16–4.18) — template, blast email, blast WhatsApp.
 *
 * WhatsApp sengaja TIDAK dikirim dari server: blast otomatis butuh WhatsApp
 * Business API (verifikasi Meta, template disetujui, biaya per pesan) — tidak
 * sepadan untuk customer yang masih puluhan. Layar menyiapkan nomor & pesan,
 * owner yang mengirim. Email volumenya kecil, jadi dikirim langsung dari app.
 */
class CommunicationController extends Controller
{
    public function index(SalesReport $sales): Response
    {
        return Inertia::render('customer::communication', [
            'customers' => array_map(fn (CustomerSummary $c) => [
                'id' => $c->customer->id,
                'name' => $c->customer->name,
                'phone' => $c->customer->phone,
                'email' => $c->customer->email,
                'source' => $c->customer->source,
                'lines' => array_map(fn (BusinessLine $l) => $l->value, $c->lines),
                'last_transaction' => $c->lastTransaction?->toDateString(),
            ], $sales->customerSummaries()),
            'templates' => MessageTemplate::resolved(),
        ]);
    }

    public function updateTemplate(UpdateMessageTemplateRequest $request, string $key): RedirectResponse
    {
        abort_unless(array_key_exists($key, MessageTemplate::defaults()), 404);

        MessageTemplate::updateOrCreate(['key' => $key], ['body' => trim((string) $request->validated('body'))]);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Template "'.MessageTemplate::defaults()[$key]['title'].'" disimpan.']);

        return to_route('communication.index');
    }

    /**
     * Dikirim satu per satu (bukan BCC) supaya `{nama}` terisi per customer
     * dan alamat customer lain tidak terlihat.
     *
     * ponytail: kirim langsung di request, tanpa queue — puluhan email selesai
     * dalam hitungan detik. Pindah ke Mail::queue kalau penerima mulai ratusan.
     */
    public function sendEmail(SendEmailBlastRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $recipients = Customer::whereIn('id', $data['customer_ids'])->whereNotNull('email')->get();

        foreach ($recipients as $customer) {
            Mail::to((string) $customer->email)->send(new BlastMessage(
                $data['subject'],
                MessageTemplate::personalise($data['body'], $customer->name),
            ));
        }

        $skipped = count($data['customer_ids']) - $recipients->count();
        $message = "Email terkirim ke {$recipients->count()} customer".($skipped > 0 ? " ({$skipped} dilewati — belum ada email)." : '.');
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return to_route('communication.index');
    }
}
