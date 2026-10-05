<?php

namespace Modules\Customer\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * Email blast ke satu customer — teks biasa yang sudah dipersonalisasi.
 * Bukan Mail::raw: pesan raw tidak tercatat oleh Mail::fake(), jadi tidak
 * bisa diuji.
 */
class BlastMessage extends Mailable
{
    public function __construct(public string $subjectLine, public string $body) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectLine);
    }

    public function content(): Content
    {
        return new Content(htmlString: nl2br(e($this->body)));
    }
}
